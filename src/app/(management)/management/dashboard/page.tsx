"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { BrandLogo } from "@/components/brand-logo";
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
import { downloadCsv, toCsv } from "@/lib/reporting";
import { appMeta } from "@/lib/seed-data";
import type { AttendanceEvent } from "@/types/domain";

const MANAGEMENT_DONUT_COLORS = ["#6f8fb2", "#ba8b57", "#7f5536", "#9bc0d8"];

function buildRecentTrend(events: Array<{ timestamp: string; type: "entry" | "exit" }>, days = 6): number[] {
  const points: number[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    const count = events.filter((event) => event.type === "entry" && event.timestamp.slice(0, 10) === key).length;
    points.push(count);
  }
  return points;
}

function buildCourseDistribution(
  enrollments: Array<{ courseId: string }>,
  courses: Array<{ id: string; title: string }>,
): Array<{ label: string; value: number }> {
  const bucket = new Map<string, number>();
  for (const enrollment of enrollments) {
    const label = courses.find((course) => course.id === enrollment.courseId)?.title ?? enrollment.courseId;
    bucket.set(label, (bucket.get(label) ?? 0) + 1);
  }
  return Array.from(bucket.entries())
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 4);
}

function buildSparklinePoints(values: number[], width: number, height: number, padding: number): string {
  const max = Math.max(...values, 1);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  return values
    .map((value, index) => {
      const x = padding + (usableWidth * index) / Math.max(values.length - 1, 1);
      const y = height - padding - (value / max) * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");
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
  const [notice, setNotice] = useState<string | null>(null);

  const attendanceSummary = summarizeAttendance(events);
  const trend = useMemo(() => buildRecentTrend(events, 6), [events]);
  const courseDistribution = useMemo(() => buildCourseDistribution(enrollments, courses), [courses, enrollments]);
  const totalDistribution = courseDistribution.reduce((sum, item) => sum + item.value, 0);

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

  const lecturerRows = useMemo(() => {
    const seen = new Set<string>();
    const rows: Array<{ id: string; name: string; course: string }> = [];
    for (const course of courses) {
      if (seen.has(course.instructor)) continue;
      seen.add(course.instructor);
      rows.push({
        id: `GP-L${100 + rows.length}`,
        name: course.instructor,
        course: course.title,
      });
    }
    return rows.slice(0, 5);
  }, [courses]);

  const forecastGrowth = Math.max(
    5,
    Math.round((attendanceSummary.completionRate * 0.08) + (certificates.length * 0.5) + 8),
  );

  function handleExportAnalytics(): void {
    const rows = filteredEvents.map((event) => ({
      studentId: event.studentId,
      type: event.type,
      facility: event.facility,
      method: event.verifiedBy,
      timestamp: event.timestamp,
      projectedGrowthPercent: forecastGrowth,
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

  const donutGradient = useMemo(() => {
    if (!courseDistribution.length || totalDistribution === 0) {
      return "conic-gradient(#d8d2cc 0deg 360deg)";
    }
    let cursor = 0;
    const parts: string[] = [];
    for (let index = 0; index < courseDistribution.length; index += 1) {
      const item = courseDistribution[index];
      const slice = (item.value / totalDistribution) * 360;
      const start = cursor;
      const end = cursor + slice;
      parts.push(`${MANAGEMENT_DONUT_COLORS[index % MANAGEMENT_DONUT_COLORS.length]} ${start}deg ${end}deg`);
      cursor = end;
    }
    return `conic-gradient(${parts.join(", ")})`;
  }, [courseDistribution, totalDistribution]);
  const sparklinePoints = useMemo(() => buildSparklinePoints(trend, 420, 84, 10), [trend]);

  return (
    <div className="board-page board-management-page">
      <header className="board-topbar">
        <div className="board-brand">
          <BrandLogo size={34} />
          <p>{appMeta.name}</p>
        </div>
        <div className="board-topbar-right">
          <span className="board-utility-icon">◔</span>
          <span className="board-utility-icon">↻</span>
          <span className="board-utility-icon">⚙</span>
          <span className="board-chip">Management</span>
          <span className="board-chip">Cifaa</span>
        </div>
      </header>

      <nav className="board-tabs" aria-label="Portal sections">
        <Link href="/management/dashboard" className="board-tab board-tab-active">
          Dashboard
        </Link>
        <Link href="/management/inmates" className="board-tab">
          Inmates
        </Link>
        <Link href="/management/analytics" className="board-tab">
          Analytics
        </Link>
        <Link href="/management/reports" className="board-tab">
          Reports
        </Link>
      </nav>

      <main className="board-content">
        <section className="board-heading-row">
          <h1>Management Board</h1>
        </section>

        <section className="board-management-top">
          <article className="board-panel board-panel-soft">
            <h2>Inmate Progress &amp; Performance</h2>
            <div className="board-mini-bars">
              {trend.map((point, index) => (
                <span key={`${point}-${index}`} style={{ height: `${Math.max(26, point * 18)}px` }} />
              ))}
            </div>
            <div className="board-x-labels">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
            <div className="board-line-chart">
              <svg viewBox="0 0 420 84" className="board-sparkline" aria-hidden="true">
                <polyline points={sparklinePoints} />
                {sparklinePoints.split(" ").map((point) => {
                  const [cx, cy] = point.split(",");
                  return <circle key={point} cx={cx} cy={cy} r="3.5" />;
                })}
              </svg>
            </div>
            <div className="board-inline-meta">
              <span>Overall completion: {attendanceSummary.completionRate}%</span>
              <span>Active entries: {attendanceSummary.entries}</span>
            </div>
          </article>

          <article className="board-panel board-panel-soft">
            <h2>Course Statistics</h2>
            <div className="board-donut-row">
              <div className="board-donut" style={{ background: donutGradient }}>
                <div className="board-donut-hole">{totalDistribution}</div>
              </div>
              <ul className="board-legend-list">
                {courseDistribution.map((item, index) => (
                  <li key={item.label}>
                    <span
                      style={{
                        background: MANAGEMENT_DONUT_COLORS[index % MANAGEMENT_DONUT_COLORS.length],
                      }}
                    />
                    {item.label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="board-inline-meta">
              <span>Total Courses: {courses.length}</span>
              <span>Current Enrollment: {enrollments.length}</span>
              <span>Certificates Issued: {certificates.length}</span>
            </div>
          </article>

          <article className="board-panel board-panel-soft">
            <h2>Registration &amp; Attendance</h2>
            <div className="board-inline-meta board-inline-meta-stack">
              <span>Total Registered Inmates: {inmates.length.toLocaleString()}</span>
              <span>New Registrations: {Math.max(0, inmates.length - attendanceSummary.entries)}</span>
              <span>Avg. Attendance Rate: {attendanceSummary.completionRate}%</span>
            </div>
            <div className="board-mini-bars">
              {trend.map((point, index) => (
                <span key={`${index}-${point}`} style={{ height: `${Math.max(24, point * 16)}px` }} />
              ))}
            </div>
            <div className="board-line-chart" style={{ marginTop: 8 }}>
              <svg viewBox="0 0 420 84" className="board-sparkline" aria-hidden="true">
                <polyline points={sparklinePoints} />
                {sparklinePoints.split(" ").map((point) => {
                  const [cx, cy] = point.split(",");
                  return <circle key={`reg-${point}`} cx={cx} cy={cy} r="3.5" />;
                })}
              </svg>
            </div>
            <button type="button" className="button-primary" onClick={handleExportAnalytics}>
              Generate Report
            </button>
            <Link href="/management/inmates" className="button-soft">
              View Inmate Records
            </Link>
          </article>
        </section>

        <section className="board-management-bottom">
          <article className="board-panel board-panel-soft">
            <h2>All Courses</h2>
            <DataTable
              rows={courses.slice(0, 6)}
              columns={[
                { key: "id", header: "Course ID", render: (row) => row.id },
                { key: "title", header: "Course Name", render: (row) => row.title },
                {
                  key: "lessons",
                  header: "Lessons",
                  render: (row) => Math.max(12, Math.round((row.durationHours ?? 12) / 0.75)),
                },
                {
                  key: "enrolled",
                  header: "Enrolled",
                  render: (row) => enrollments.filter((entry) => entry.courseId === row.id).length,
                },
                {
                  key: "actions",
                  header: "Actions",
                  render: () => <button className="button-soft">View</button>,
                },
              ]}
            />
          </article>

          <article className="board-panel board-panel-soft">
            <h2>Lecturers</h2>
            <DataTable
              rows={lecturerRows}
              columns={[
                { key: "id", header: "ID", render: (row) => row.id },
                { key: "name", header: "Lecturer Name", render: (row) => row.name },
                { key: "course", header: "Course Teaching", render: (row) => row.course },
                {
                  key: "actions",
                  header: "Actions",
                  render: () => <button className="button-soft">View</button>,
                },
              ]}
            />
          </article>

          <aside className="board-panel board-panel-soft">
            <h2>Predictive AI Insights</h2>
            <p className="quick-info" style={{ marginTop: 0 }}>
              Forecasted inmate registration growth: {forecastGrowth}% over next cycle.
            </p>
            <div className="board-inline-meta board-inline-meta-stack">
              <span>Predictive confidence: 79%</span>
              <span>Projected weekly entries: {trend.reduce((sum, point) => sum + point, 0)}</span>
              <span>Projected completion uplift: {attendanceSummary.completionRate + 8}%</span>
            </div>

            <div style={{ marginTop: 10 }} className="inline-row">
              <input
                className="input"
                style={{ width: "100%" }}
                placeholder="Search student, facility, method"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="inline-row" style={{ marginTop: 8, justifyContent: "flex-start" }}>
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
              <button
                type="button"
                className="button-primary"
                onClick={handleExportAnalytics}
                data-testid="management-export-csv"
              >
                Export Analytics CSV
              </button>
            </div>
            {notice ? <p className="status-ok">{notice}</p> : null}

            <div style={{ marginTop: 10 }}>
              <DataTable
                rows={filteredEvents.slice(0, 8)}
                columns={[
                  { key: "studentId", header: "Student ID", render: (row) => row.studentId },
                  { key: "type", header: "Type", render: (row) => row.type.toUpperCase() },
                  { key: "facility", header: "Facility", render: (row) => row.facility },
                  { key: "method", header: "Method", render: (row) => row.verifiedBy },
                  { key: "timestamp", header: "Timestamp", render: (row) => formatDateTime(row.timestamp) },
                ]}
                emptyLabel="No events found."
              />
            </div>
          </aside>
        </section>
      </main>

      <footer className="board-footer">Last Sync: 2 mins ago · Secure Offline Environment</footer>
    </div>
  );
}
