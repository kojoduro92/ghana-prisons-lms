"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartCard } from "@/components/chart-card";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";
import type { AttendanceEvent, Enrollment, InmateProfile } from "@/types/domain";

interface CourseRecord {
  id: string;
  title: string;
  category: string;
}

export default function ManagementAnalyticsPage() {
  const [inmates, setInmates] = useState<InmateProfile[]>([]);
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        const [inmatesData, coursesData, enrollmentData, attendanceData] = await Promise.all([
          fetchApi<{ inmates: InmateProfile[] }>("/api/v1/inmates"),
          fetchApi<{ courses: CourseRecord[] }>("/api/v1/courses"),
          fetchApi<{ enrollments: Enrollment[] }>("/api/v1/enrollments"),
          fetchApi<{ attendance: AttendanceEvent[] }>("/api/v1/attendance"),
        ]);

        if (!mounted) return;
        setInmates(inmatesData.inmates);
        setCourses(coursesData.courses);
        setEnrollments(enrollmentData.enrollments);
        setAttendance(attendanceData.attendance);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load analytics.");
      }
    }
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const completionRate = enrollments.length
    ? Math.round((enrollments.filter((entry) => entry.progressPercent >= 80).length / enrollments.length) * 100)
    : 0;

  const activeLearners = useMemo(() => new Set(attendance.filter((entry) => entry.type === "entry").map((entry) => entry.studentId)).size, [attendance]);

  const categoryStats = useMemo(() => {
    const grouped = new Map<string, { count: number; progress: number }>();
    for (const enrollment of enrollments) {
      const course = courses.find((entry) => entry.id === enrollment.courseId);
      const category = course?.category ?? "Uncategorized";
      const current = grouped.get(category) ?? { count: 0, progress: 0 };
      current.count += 1;
      current.progress += enrollment.progressPercent;
      grouped.set(category, current);
    }
    return Array.from(grouped.entries())
      .map(([category, stat]) => ({
        category,
        enrollments: stat.count,
        avgProgress: Math.round(stat.progress / Math.max(1, stat.count)),
      }))
      .sort((left, right) => right.enrollments - left.enrollments);
  }, [courses, enrollments]);

  const recentEntries = useMemo(() => {
    return attendance
      .filter((entry) => entry.type === "entry")
      .sort((left, right) => (left.timestamp < right.timestamp ? 1 : -1))
      .slice(0, 6);
  }, [attendance]);

  return (
    <RoleShell title={appMeta.name} subtitle="Management - Analytics Board" userName="Command Staff">
      <section className="grid-4">
        <StatCard label="Registered Inmates" value={inmates.length} helper="Operational learner base" />
        <StatCard label="Active Learners" value={activeLearners} helper="Observed through attendance entries" />
        <StatCard label="Total Enrollments" value={enrollments.length} helper="Cross-course participation" />
        <StatCard label="Completion Rate" value={`${completionRate}%`} helper="Enrollments at 80% or above" />
      </section>

      <section className="grid-2">
        <ChartCard title="Category Enrollment Distribution">
          <div className="mini-bars">
            {categoryStats.map((entry) => (
              <span key={entry.category} style={{ height: `${Math.max(12, entry.enrollments * 16)}px` }} />
            ))}
          </div>
          <div className="legend">
            {categoryStats.map((entry) => (
              <span key={entry.category}>{entry.category}</span>
            ))}
          </div>
        </ChartCard>
        <ChartCard title="Recent Facility Entries">
          <div style={{ display: "grid", gap: 8 }}>
            {recentEntries.map((entry) => (
              <div key={`${entry.studentId}-${entry.timestamp}`} className="inline-row panel" style={{ padding: 10 }}>
                <span>
                  {entry.studentId} • {entry.facility}
                </span>
                <span className="quick-info">{formatDateTime(entry.timestamp)}</span>
              </div>
            ))}
            {recentEntries.length === 0 ? <p className="quick-info">No attendance logs available yet.</p> : null}
          </div>
        </ChartCard>
      </section>

      <section className="panel">
        <h2 className="section-title">Program Performance by Category</h2>
        {error ? <p className="status-bad">{error}</p> : null}
        <DataTable
          rows={categoryStats}
          columns={[
            { key: "category", header: "Category", render: (row) => row.category },
            { key: "enrollments", header: "Enrollments", render: (row) => row.enrollments },
            {
              key: "progress",
              header: "Average Progress",
              render: (row) => (
                <div style={{ minWidth: 180 }}>
                  <div className="progress-row-head">
                    <span>{row.avgProgress}%</span>
                  </div>
                  <div className="progress-track">
                    <span className="progress-fill" style={{ width: `${row.avgProgress}%` }} />
                  </div>
                </div>
              ),
            },
          ]}
          emptyLabel="No analytics data available."
        />
      </section>
    </RoleShell>
  );
}
