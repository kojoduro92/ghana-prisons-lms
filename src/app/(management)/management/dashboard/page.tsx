"use client";

import { useMemo, useState } from "react";
import { ChartCard } from "@/components/chart-card";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { formatDateTime } from "@/lib/format";
import {
  addAuditEvent,
  getAttendanceEventsState,
  getCertificatesState,
  getCoursesState,
  getEnrollmentsState,
  getInmatesState,
  summarizeAttendance,
} from "@/lib/portal-state";
import { toCsv, downloadCsv } from "@/lib/reporting";
import { appMeta } from "@/lib/seed-data";
import type { AttendanceEvent } from "@/types/domain";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function buildRecentTrend(events: Array<{ timestamp: string; type: "entry" | "exit" }>, days = 6): number[] {
  const points: number[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);

    const key = day.toISOString().slice(0, 10);
    const count = events.filter(
      (event) => event.type === "entry" && event.timestamp.slice(0, 10) === key,
    ).length;
    points.push(count);
  }

  return points;
}

function buildParticipationTrend(
  enrollments: Array<{ lastActivityAt?: string }>,
  days = 6,
): number[] {
  const points: number[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    const count = enrollments.filter((entry) => (entry.lastActivityAt ?? "").slice(0, 10) === key).length;
    points.push(count);
  }

  return points;
}

export default function ManagementDashboardPage() {
  const [events] = useState(getAttendanceEventsState);
  const [inmates] = useState(getInmatesState);
  const [courses] = useState(getCoursesState);
  const [enrollments] = useState(getEnrollmentsState);
  const [certificates] = useState(getCertificatesState);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AttendanceEvent["type"]>("all");
  const [methodFilter, setMethodFilter] = useState<"all" | AttendanceEvent["verifiedBy"]>("all");
  const [mentorBoost, setMentorBoost] = useState(2);
  const [deviceBoost, setDeviceBoost] = useState(4);
  const [notice, setNotice] = useState<string | null>(null);

  const attendanceSummary = summarizeAttendance(events);
  const activeLearners = useMemo(() => {
    const set = new Set(events.filter((event) => event.type === "entry").map((event) => event.studentId));
    return set.size;
  }, [events]);

  const trend = useMemo(() => buildRecentTrend(events, 6), [events]);
  const participationTrend = useMemo(() => buildParticipationTrend(enrollments, 6), [enrollments]);
  const peakLoad = Math.max(...trend, 0);
  const projectedNextWeek = Math.round((trend.reduce((sum, value) => sum + value, 0) / Math.max(1, trend.length)) * 1.12);
  const highProgressCount = enrollments.filter((entry) => entry.progressPercent >= 80).length;
  const completionShare = enrollments.length > 0 ? Math.round((highProgressCount / enrollments.length) * 100) : 0;
  const engagedLearners = useMemo(() => {
    const set = new Set(
      enrollments
        .filter((entry) => Boolean(entry.lastActivityAt) || entry.progressPercent > 0)
        .map((entry) => entry.studentId),
    );
    return set.size;
  }, [enrollments]);
  const participationRate = activeLearners > 0 ? Math.round((engagedLearners / activeLearners) * 100) : 0;
  const avgAssessmentScore = useMemo(() => {
    const scores = enrollments
      .map((entry) => entry.latestAssessmentScore)
      .filter((value): value is number => typeof value === "number");
    if (scores.length === 0) return 0;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [enrollments]);

  const prisonDistribution = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const inmate of inmates) {
      grouped.set(inmate.assignedPrison, (grouped.get(inmate.assignedPrison) ?? 0) + 1);
    }

    const total = inmates.length || 1;
    return Array.from(grouped.entries()).map(([label, count]) => ({
      label,
      value: Math.round((count / total) * 100),
    }));
  }, [inmates]);

  const skillDemand = useMemo(() => {
    const grouped = new Map<string, { count: number; totalProgress: number; completionCount: number }>();

    for (const enrollment of enrollments) {
      const course = courses.find((item) => item.id === enrollment.courseId);
      const category = course?.category ?? "Other";
      const next = grouped.get(category) ?? { count: 0, totalProgress: 0, completionCount: 0 };
      next.count += 1;
      next.totalProgress += enrollment.progressPercent;
      if (enrollment.progressPercent >= 80) {
        next.completionCount += 1;
      }
      grouped.set(category, next);
    }

    return Array.from(grouped.entries())
      .map(([category, value]) => ({
        category,
        count: value.count,
        avgProgress: Math.round(value.totalProgress / Math.max(1, value.count)),
        completionRate: Math.round((value.completionCount / Math.max(1, value.count)) * 100),
      }))
      .sort((left, right) => right.count - left.count);
  }, [courses, enrollments]);

  const facilityUsage = useMemo(() => {
    const grouped = new Map<string, { count: number; learners: Set<string> }>();

    for (const event of events) {
      const entry = grouped.get(event.facility) ?? { count: 0, learners: new Set<string>() };
      entry.count += 1;
      entry.learners.add(event.studentId);
      grouped.set(event.facility, entry);
    }

    return Array.from(grouped.entries())
      .map(([facility, value]) => ({
        facility,
        events: value.count,
        activeLearners: value.learners.size,
      }))
      .sort((left, right) => right.events - left.events);
  }, [events]);

  const baseDailyLoad = Math.round(trend.reduce((sum, value) => sum + value, 0) / Math.max(1, trend.length));
  const baselineCapacitySeats = 40;
  const adjustedCapacitySeats = baselineCapacitySeats + deviceBoost;
  const projectedDailyNeed = Math.max(0, Math.round(baseDailyLoad * 1.15));
  const capacityGap = Math.max(0, projectedDailyNeed - adjustedCapacitySeats);
  const projectedCompletionLikelihood = clamp(
    Math.round(52 + completionShare * 0.28 + mentorBoost * 4 + deviceBoost * 1.3),
    50,
    97,
  );
  const projectedEngagement = clamp(
    Math.round(participationRate + mentorBoost * 2 + deviceBoost),
    45,
    98,
  );
  const projectedEnrollmentGrowth = clamp(
    Math.round(6 + mentorBoost * 1.8 + deviceBoost * 0.9 + completionShare * 0.08),
    5,
    32,
  );
  const recommendedActions = [
    capacityGap > 0
      ? `Add ${capacityGap} additional device seats to close projected capacity gap.`
      : "Current projected capacity is sufficient for expected daily load.",
    mentorBoost < 3
      ? "Increase mentor coverage by at least 1 shift for literacy and digital tracks."
      : "Mentor capacity is adequate; prioritize targeted coaching for low-progress learners.",
    skillDemand[0]
      ? `Prioritize ${skillDemand[0].category} programs due to highest demand (${skillDemand[0].count} active enrollments).`
      : "Collect more category activity before issuing skill-priority guidance.",
  ];

  const forecasts = [
    {
      label: "Projected Weekly Entries",
      value: `${projectedNextWeek} expected`,
      confidence: "81%",
    },
    {
      label: "Entry/Exit Completion",
      value: `${attendanceSummary.completionRate}% flow closure`,
      confidence: "86%",
    },
    {
      label: "Attendance vs Participation",
      value: `${participationRate}% engagement alignment`,
      confidence: "76%",
    },
    {
      label: "Peak Daily Capacity Use",
      value: `${peakLoad} entries in one day`,
      confidence: "78%",
    },
    {
      label: "High Progress Enrollments",
      value: `${highProgressCount} learners >= 80%`,
      confidence: "83%",
    },
    {
      label: "Likely Completion Uplift",
      value: `${projectedCompletionLikelihood}% projected completion probability`,
      confidence: "79%",
    },
  ];

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesQuery =
        event.studentId.toLowerCase().includes(query.toLowerCase()) ||
        event.facility.toLowerCase().includes(query.toLowerCase()) ||
        event.verifiedBy.toLowerCase().includes(query.toLowerCase());

      const matchesType = typeFilter === "all" ? true : event.type === typeFilter;
      const matchesMethod = methodFilter === "all" ? true : event.verifiedBy === methodFilter;
      return matchesQuery && matchesType && matchesMethod;
    });
  }, [events, methodFilter, query, typeFilter]);

  function handleExportAnalytics(): void {
    const rows = trend.map((value, index) => ({
      dayOffset: index + 1,
      entryCount: value,
      participationCount: participationTrend[index] ?? 0,
      projectedWeeklyEntries: projectedNextWeek,
      completionRatePercent: attendanceSummary.completionRate,
      projectedCompletionLikelihoodPercent: projectedCompletionLikelihood,
      projectedEngagementPercent: projectedEngagement,
    }));
    const csv = toCsv(rows);
    downloadCsv("management-analytics.csv", csv);
    setNotice("Management analytics CSV exported.");
    addAuditEvent({
      action: "report-exported",
      actor: "Command Staff",
      result: "success",
      target: "management-analytics",
      details: `Rows: ${rows.length}`,
    });
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Management Analytics Portal" userName="Command Staff">
      <section className="grid-3">
        <StatCard label="Active Learners (Observed)" value={activeLearners} helper="Based on verified entries" />
        <StatCard label="Participation Alignment" value={`${participationRate}%`} helper="Attendance vs learning activity" />
        <StatCard label="Completion Share" value={`${completionShare}%`} helper="Enrollments at 80% or more" />
      </section>

      <section className="grid-3">
        <StatCard label="Certificates Issued" value={certificates.length} helper={`Across ${courses.length} active courses`} />
        <StatCard label="Avg Assessment Score" value={`${avgAssessmentScore}%`} helper="Latest scored attempts" />
        <StatCard label="Projected Enrollment Growth" value={`${projectedEnrollmentGrowth}%`} helper="Next operational cycle" />
      </section>

      <section className="grid-2">
        <ChartCard title="Recent Entry Trend (6 Days)">
          <div className="mini-bars">
            {trend.map((point, idx) => (
              <span key={idx} style={{ height: `${Math.max(12, point * 26)}px` }} />
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Facility Distribution">
          <div style={{ display: "grid", gap: 10 }}>
            {prisonDistribution.map((item) => (
              <div key={item.label}>
                <div className="progress-row-head">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="progress-track">
                  <span className="progress-fill" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
            {prisonDistribution.length === 0 ? (
              <p className="quick-info">No inmate distribution data available.</p>
            ) : null}
          </div>
        </ChartCard>
      </section>

      <section className="grid-2">
        <ChartCard title="Attendance vs Participation (6 Days)">
          <div style={{ display: "grid", gap: 8 }}>
            {trend.map((entries, index) => {
              const participation = participationTrend[index] ?? 0;
              const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][index] ?? `D${index + 1}`;
              const maxValue = Math.max(entries, participation, 1);
              return (
                <div key={day} style={{ display: "grid", gap: 4 }}>
                  <div className="progress-row-head">
                    <span>{day}</span>
                    <span>{`E:${entries} | P:${participation}`}</span>
                  </div>
                  <div className="progress-track">
                    <span className="progress-fill" style={{ width: `${Math.round((entries / maxValue) * 100)}%` }} />
                  </div>
                  <div className="progress-track">
                    <span
                      className="progress-fill"
                      style={{
                        width: `${Math.round((participation / maxValue) * 100)}%`,
                        background: "linear-gradient(90deg, #3a6fa4, #6ba8da)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="quick-info" style={{ marginTop: 8 }}>
            First bar: attendance entries. Second bar: enrolled learners with recorded learning activity.
          </p>
        </ChartCard>

        <ChartCard title="Skill Demand & Completion Trends">
          <div style={{ display: "grid", gap: 10 }}>
            {skillDemand.slice(0, 6).map((item) => (
              <div key={item.category} style={{ display: "grid", gap: 4 }}>
                <div className="progress-row-head">
                  <span>{item.category}</span>
                  <span>{`${item.count} enrollments | ${item.completionRate}% completion`}</span>
                </div>
                <div className="progress-track">
                  <span className="progress-fill" style={{ width: `${item.avgProgress}%` }} />
                </div>
              </div>
            ))}
            {skillDemand.length === 0 ? <p className="quick-info">No skill trend data available yet.</p> : null}
          </div>
        </ChartCard>
      </section>

      <section className="panel">
        <h2 className="section-title">Predictive AI Insights</h2>
        <div className="grid-3">
          {forecasts.map((forecast) => (
            <article key={forecast.label} className="panel" style={{ padding: 12 }}>
              <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>{forecast.label}</h3>
              <p style={{ margin: "0 0 6px" }}>{forecast.value}</p>
              <p className="quick-info" style={{ margin: 0 }}>
                Confidence: {forecast.confidence}
              </p>
            </article>
          ))}
        </div>

        <div className="panel" style={{ marginTop: 12 }}>
          <h3 style={{ marginBottom: 8 }}>Reference Baseline</h3>
          <p className="quick-info" style={{ margin: 0 }}>
            Recent trend points: {trend.join(", ")} | Entry/Exit closure: {attendanceSummary.completionRate}%
          </p>
          <p className="quick-info" style={{ margin: "4px 0 0" }}>
            Registered inmates: {inmates.length} | Total enrollments: {enrollments.length}
          </p>
          <p className="quick-info" style={{ margin: "4px 0 0" }}>
            Forecast model inputs: mentor boost {mentorBoost}, device boost {deviceBoost}, avg daily load {baseDailyLoad}.
          </p>
        </div>
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Resource Planning Simulator
          </h2>
          <span className="quick-info">Adjust staffing and device capacity to evaluate projected outcomes</span>
        </div>
        <div className="grid-2">
          <div className="panel" style={{ padding: 12 }}>
            <label htmlFor="mentor-boost" style={{ display: "grid", gap: 6 }}>
              <span>Additional Mentor Shifts ({mentorBoost})</span>
              <input
                id="mentor-boost"
                type="range"
                min={0}
                max={6}
                value={mentorBoost}
                onChange={(event) => setMentorBoost(Number(event.target.value))}
              />
            </label>
            <label htmlFor="device-boost" style={{ display: "grid", gap: 6, marginTop: 12 }}>
              <span>Additional Device Seats ({deviceBoost})</span>
              <input
                id="device-boost"
                type="range"
                min={0}
                max={20}
                value={deviceBoost}
                onChange={(event) => setDeviceBoost(Number(event.target.value))}
              />
            </label>
            <p className="quick-info" style={{ margin: "10px 0 0" }}>
              Baseline seats: {baselineCapacitySeats} | Adjusted seats: {adjustedCapacitySeats}
            </p>
          </div>
          <div className="panel" style={{ padding: 12 }}>
            <div className="grid-3">
              <article>
                <p className="quick-info" style={{ margin: 0 }}>
                  Projected Daily Need
                </p>
                <h3>{projectedDailyNeed}</h3>
              </article>
              <article>
                <p className="quick-info" style={{ margin: 0 }}>
                  Capacity Gap
                </p>
                <h3>{capacityGap}</h3>
              </article>
              <article>
                <p className="quick-info" style={{ margin: 0 }}>
                  Projected Engagement
                </p>
                <h3>{projectedEngagement}%</h3>
              </article>
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {recommendedActions.map((action) => (
                <p key={action} className="quick-info" style={{ margin: 0 }}>
                  {action}
                </p>
              ))}
            </div>
            {facilityUsage.length > 0 ? (
              <p className="quick-info" style={{ marginTop: 10 }}>
                Highest activity facility: {facilityUsage[0].facility} ({facilityUsage[0].events} events,{" "}
                {facilityUsage[0].activeLearners} learners)
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Operations Drill-down
          </h2>
          <div className="inline-row">
            <input
              className="input"
              style={{ width: 220 }}
              placeholder="Search student, facility, method"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select
              className="select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as "all" | AttendanceEvent["type"])}
            >
              <option value="all">All event types</option>
              <option value="entry">Entry only</option>
              <option value="exit">Exit only</option>
            </select>
            <select
              className="select"
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value as "all" | AttendanceEvent["verifiedBy"])}
            >
              <option value="all">All methods</option>
              <option value="fingerprint">Fingerprint</option>
              <option value="face">Face</option>
            </select>
            <button type="button" className="button-primary" onClick={handleExportAnalytics} data-testid="management-export-csv">
              Export Analytics CSV
            </button>
          </div>
        </div>
        {notice ? <p className="status-ok">{notice}</p> : null}

        <DataTable
          rows={filteredEvents.slice(0, 30)}
          columns={[
            { key: "studentId", header: "Student ID", render: (row) => row.studentId },
            { key: "type", header: "Type", render: (row) => row.type.toUpperCase() },
            { key: "facility", header: "Facility", render: (row) => row.facility },
            { key: "verifiedBy", header: "Method", render: (row) => row.verifiedBy },
            { key: "timestamp", header: "Timestamp", render: (row) => formatDateTime(row.timestamp) },
          ]}
          emptyLabel="No attendance events found for current filters."
        />
      </section>
    </RoleShell>
  );
}
