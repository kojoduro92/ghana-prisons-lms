"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartCard } from "@/components/chart-card";
import { DataTable } from "@/components/data-table";
import { ProgressDonut } from "@/components/progress-donut";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { useAppShell } from "@/lib/app-shell";
import { fetchApi } from "@/lib/client-api";
import { appMeta } from "@/lib/seed-data";
import type { AttendanceEvent, Enrollment } from "@/types/domain";

interface CourseRecord {
  id: string;
  title: string;
}

export default function InmateProgressPage() {
  const { session } = useAppShell();
  const studentId = session?.studentId ?? "GP-10234";
  const displayName = session?.displayName ?? "Inmate";

  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEvent[]>([]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [courseData, enrollmentData, attendanceData] = await Promise.all([
        fetchApi<{ courses: CourseRecord[] }>("/api/v1/courses"),
        fetchApi<{ enrollments: Enrollment[] }>(`/api/v1/enrollments?studentId=${encodeURIComponent(studentId)}`),
        fetchApi<{ attendance: AttendanceEvent[] }>(`/api/v1/attendance?studentId=${encodeURIComponent(studentId)}`),
      ]);
      if (!mounted) return;
      setCourses(courseData.courses);
      setEnrollments(enrollmentData.enrollments);
      setAttendance(attendanceData.attendance);
    })().catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, [studentId]);

  const avgProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, entry) => sum + entry.progressPercent, 0) / enrollments.length)
    : 0;

  const entries = attendance.filter((entry) => entry.type === "entry").length;
  const exits = attendance.filter((entry) => entry.type === "exit").length;
  const attendanceCompletion = entries ? Math.round((Math.min(entries, exits) / entries) * 100) : 0;

  const weeklyActivity = useMemo(() => {
    const now = new Date();
    const values: number[] = [];
    for (let i = 6; i >= 0; i -= 1) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      values.push(attendance.filter((entry) => entry.type === "entry" && entry.timestamp.slice(0, 10) === key).length);
    }
    return values;
  }, [attendance]);

  return (
    <RoleShell title={appMeta.name} subtitle="Inmate - Progress Tracking" userName={displayName}>
      <section className="grid-4">
        <StatCard label="Enrolled Courses" value={enrollments.length} helper="Active learning tracks" />
        <StatCard label="Average Progress" value={`${avgProgress}%`} helper="Across enrolled courses" />
        <StatCard label="Entry Logs" value={entries} helper="Facility check-in records" />
        <StatCard label="Attendance Completion" value={`${attendanceCompletion}%`} helper="Entry/exit closure rate" />
      </section>

      <section className="grid-2">
        <ChartCard title="Overall Progress">
          <div style={{ display: "grid", placeItems: "center", minHeight: 220 }}>
            <ProgressDonut value={avgProgress} label="Average Course Progress" size={210} />
          </div>
        </ChartCard>
        <ChartCard title="Weekly Attendance Activity">
          <div className="mini-bars" style={{ minHeight: 130 }}>
            {weeklyActivity.map((value, index) => (
              <span key={index} style={{ height: `${Math.max(8, value * 22)}px` }} />
            ))}
          </div>
          <div className="legend">
            <span>7-day view</span>
          </div>
        </ChartCard>
      </section>

      <section className="panel">
        <h2 className="section-title">Course Progress Breakdown</h2>
        <DataTable
          rows={enrollments}
          columns={[
            {
              key: "course",
              header: "Course",
              render: (row) => courses.find((entry) => entry.id === row.courseId)?.title ?? row.courseId,
            },
            { key: "status", header: "Status", render: (row) => row.status },
            {
              key: "progress",
              header: "Progress",
              render: (row) => (
                <div style={{ minWidth: 180 }}>
                  <div className="progress-row-head">
                    <span>{row.progressPercent}%</span>
                  </div>
                  <div className="progress-track">
                    <span className="progress-fill" style={{ width: `${row.progressPercent}%` }} />
                  </div>
                </div>
              ),
            },
            { key: "lessons", header: "Lessons", render: (row) => row.lessonsCompleted ?? "-" },
            { key: "time", header: "Minutes", render: (row) => row.timeSpentMinutes ?? "-" },
          ]}
          emptyLabel="No enrollment progress available."
        />
      </section>
    </RoleShell>
  );
}
