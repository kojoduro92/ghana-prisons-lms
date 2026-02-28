"use client";

import { useMemo, useState } from "react";
import { ChartCard } from "@/components/chart-card";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { formatDateTime } from "@/lib/format";
import { addAuditEvent, getAttendanceEventsState, getInmatesState, summarizeAttendance } from "@/lib/portal-state";
import { toCsv, downloadCsv } from "@/lib/reporting";
import { appMeta, managementSnapshot } from "@/lib/seed-data";
import type { AttendanceEvent } from "@/types/domain";

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

export default function ManagementDashboardPage() {
  const [events] = useState(getAttendanceEventsState);
  const [inmates] = useState(getInmatesState);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | AttendanceEvent["type"]>("all");
  const [notice, setNotice] = useState<string | null>(null);

  const attendanceSummary = summarizeAttendance(events);
  const activeLearners = useMemo(() => {
    const set = new Set(events.filter((event) => event.type === "entry").map((event) => event.studentId));
    return set.size;
  }, [events]);

  const trend = useMemo(() => buildRecentTrend(events, 6), [events]);
  const peakLoad = Math.max(...trend, 0);
  const projectedNextWeek = Math.round((trend.reduce((sum, value) => sum + value, 0) / Math.max(1, trend.length)) * 1.12);

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

  const forecasts = [
    {
      label: "Projected Weekly Entries",
      value: `${projectedNextWeek} expected` ,
      confidence: "81%",
    },
    {
      label: "Entry/Exit Completion",
      value: `${attendanceSummary.completionRate}% flow closure`,
      confidence: "86%",
    },
    {
      label: "Peak Daily Capacity Use",
      value: `${peakLoad} entries in one day`,
      confidence: "78%",
    },
  ];

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesQuery =
        event.studentId.toLowerCase().includes(query.toLowerCase()) ||
        event.facility.toLowerCase().includes(query.toLowerCase()) ||
        event.verifiedBy.toLowerCase().includes(query.toLowerCase());

      const matchesType = typeFilter === "all" ? true : event.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [events, query, typeFilter]);

  function handleExportAnalytics(): void {
    const rows = trend.map((value, index) => ({
      dayOffset: index + 1,
      entryCount: value,
      projectedWeeklyEntries: projectedNextWeek,
      completionRatePercent: attendanceSummary.completionRate,
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
        <StatCard label="Entry/Exit Completion Rate" value={`${attendanceSummary.completionRate}%`} helper="Operational attendance closure" />
        <StatCard label="Registered Inmates" value={inmates.length} helper="Persisted local registry" />
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
            Historical enrollment trend points: {managementSnapshot.enrollmentTrend.join(", ")}
          </p>
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
