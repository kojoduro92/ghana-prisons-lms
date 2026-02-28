"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { useAppShell } from "@/lib/app-shell";
import { ChartCard } from "@/components/chart-card";
import { appMeta, courseCategories } from "@/lib/seed-data";
import { formatDateTime } from "@/lib/format";
import {
  getAttendanceEventsState,
  getCertificatesState,
  getCoursesState,
  getEnrollmentsState,
  getInmatesState,
} from "@/lib/portal-state";
import { STORAGE_KEYS, browserStorage } from "@/lib/storage";
import type { VerificationAttempt } from "@/types/domain";

export default function AdminDashboardPage() {
  const { setSelectedInmateId } = useAppShell();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Enrolled" | "Pending">("all");
  const [inmateRows] = useState(getInmatesState);
  const [courses] = useState(getCoursesState);
  const [enrollments] = useState(getEnrollmentsState);
  const [certificates] = useState(getCertificatesState);
  const [attendanceEvents] = useState(getAttendanceEventsState);
  const [verificationLogs] = useState(
    () => browserStorage.loadState<VerificationAttempt[]>(STORAGE_KEYS.verificationLogs) ?? [],
  );

  const liveStats = useMemo(() => {
    const activeLearners = inmateRows.filter((item) => item.biometricStatus === "Enrolled").length;
    const completionRate =
      enrollments.length > 0
        ? Math.round((enrollments.filter((item) => item.progressPercent >= 80).length / enrollments.length) * 100)
        : 0;
    const entries = attendanceEvents.filter((event) => event.type === "entry").length;
    const exits = attendanceEvents.filter((event) => event.type === "exit").length;
    const attendanceRate = entries > 0 ? Math.round((Math.min(entries, exits) / entries) * 100) : 0;
    const openSessions = Math.max(0, entries - exits);

    return {
      totalInmatesRegistered: inmateRows.length,
      activeLearners,
      coursesEnrolled: enrollments.length,
      certificatesIssued: certificates.length,
      completionRate,
      attendanceRate,
      openSessions,
    };
  }, [attendanceEvents, certificates.length, enrollments, inmateRows]);

  const enrollmentByCategory = useMemo(() => {
    const bucket = new Map<string, number>();

    for (const category of courseCategories) {
      bucket.set(category, 0);
    }

    for (const enrollment of enrollments) {
      const course = courses.find((item) => item.id === enrollment.courseId);
      const category = course?.category ?? "Other";
      bucket.set(category, (bucket.get(category) ?? 0) + 1);
    }

    return Array.from(bucket.entries()).map(([label, value]) => ({ label, value }));
  }, [courses, enrollments]);

  const filteredRows = useMemo(() => {
    return inmateRows.filter((inmate) => {
      const matchesSearch =
        inmate.fullName.toLowerCase().includes(search.toLowerCase()) ||
        inmate.id.toLowerCase().includes(search.toLowerCase()) ||
        inmate.prisonNumber.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" ? true : inmate.biometricStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [inmateRows, search, statusFilter]);

  const verificationMethodDistribution = useMemo(() => {
    const bucket = new Map<"fingerprint" | "face", number>([
      ["fingerprint", 0],
      ["face", 0],
    ]);

    for (const event of attendanceEvents) {
      bucket.set(event.verifiedBy, (bucket.get(event.verifiedBy) ?? 0) + 1);
    }

    return [
      { label: "Fingerprint", value: bucket.get("fingerprint") ?? 0 },
      { label: "Face", value: bucket.get("face") ?? 0 },
    ];
  }, [attendanceEvents]);

  const facilityUsage = useMemo(() => {
    const bucket = new Map<string, number>();

    for (const event of attendanceEvents) {
      bucket.set(event.facility, (bucket.get(event.facility) ?? 0) + 1);
    }

    return Array.from(bucket.entries())
      .map(([facility, count]) => ({ facility, count }))
      .sort((left, right) => right.count - left.count);
  }, [attendanceEvents]);

  const deviceUsage = useMemo(() => {
    const bucket = new Map<string, number>();
    for (const log of verificationLogs) {
      bucket.set(log.deviceId, (bucket.get(log.deviceId) ?? 0) + 1);
    }

    return Array.from(bucket.entries())
      .map(([deviceId, count]) => ({ deviceId, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }, [verificationLogs]);

  return (
    <RoleShell title={appMeta.name} subtitle="Administrator Dashboard" userName="Admin Officer">
      <section className="panel dashboard-intro">
        <div>
          <h1>Admin Command Center</h1>
          <p className="quick-info" style={{ margin: "6px 0 0" }}>
            Monitor registration, attendance, learning outcomes, and security events from one workspace.
          </p>
        </div>
        <div className="inline-row" style={{ justifyContent: "flex-start" }}>
          <Link href="/admin/register-inmate" className="button-primary">
            New Registration
          </Link>
          <Link href="/admin/reports" className="button-soft">
            Reports Workspace
          </Link>
        </div>
      </section>

      <section className="grid-4">
        <StatCard label="Total Inmates Registered" value={liveStats.totalInmatesRegistered.toLocaleString()} />
        <StatCard label="Active Learners" value={liveStats.activeLearners.toLocaleString()} />
        <StatCard label="Courses Enrolled" value={liveStats.coursesEnrolled.toLocaleString()} />
        <StatCard label="Certificates Issued" value={liveStats.certificatesIssued.toLocaleString()} />
      </section>

      <section className="grid-3">
        <StatCard label="Attendance Closure Rate" value={`${liveStats.attendanceRate}%`} helper="Entry/exit completion" />
        <StatCard label="Learning Completion Rate" value={`${liveStats.completionRate}%`} helper="Enrollments >= 80%" />
        <StatCard label="Open Facility Sessions" value={liveStats.openSessions} helper="Entries pending exit" />
      </section>

      <section className="grid-2">
        <ChartCard title="Course Enrollment Stats">
          <div className="mini-bars">
            {enrollmentByCategory.map((item) => (
              <span key={item.label} style={{ height: `${Math.max(14, item.value * 24)}px` }} />
            ))}
          </div>
          <div className="legend">
            {enrollmentByCategory.map((item) => (
              <span key={item.label}>{item.label}</span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Recently Added Students">
          <div style={{ display: "grid", gap: 8 }}>
            {inmateRows.slice(0, 4).map((inmate) => (
              <div key={inmate.id} className="inline-row panel" style={{ padding: 10 }}>
                <div>
                  <strong>{inmate.fullName}</strong>
                  <p className="quick-info" style={{ margin: 0 }}>
                    {inmate.prisonNumber}
                  </p>
                </div>
                <span className={inmate.biometricStatus === "Enrolled" ? "status-ok" : "status-bad"}>
                  {inmate.biometricStatus}
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </section>

      <section className="grid-2">
        <ChartCard title="Biometric Verification Mix">
          <div style={{ display: "grid", gap: 10 }}>
            {verificationMethodDistribution.map((item) => (
              <div key={item.label}>
                <div className="progress-row-head">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <div className="progress-track">
                  <span
                    className="progress-fill"
                    style={{
                      width: `${Math.min(100, item.value * 10)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Facility / Device Usage">
          <div style={{ display: "grid", gap: 8 }}>
            {facilityUsage.slice(0, 3).map((item) => (
              <div key={item.facility} className="inline-row panel" style={{ padding: 10 }}>
                <span>{item.facility}</span>
                <strong>{item.count} events</strong>
              </div>
            ))}
            {deviceUsage.map((item) => (
              <div key={item.deviceId} className="inline-row panel" style={{ padding: 10 }}>
                <span>{item.deviceId}</span>
                <span className="quick-info">{item.count} biometric attempts</span>
              </div>
            ))}
            {facilityUsage.length === 0 && deviceUsage.length === 0 ? (
              <p className="quick-info">No usage telemetry captured yet.</p>
            ) : null}
          </div>
        </ChartCard>
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Student Management
          </h2>
          <div className="inline-row">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input"
              style={{ width: 220 }}
              placeholder="Search name or ID"
              data-testid="admin-search"
            />
            <select
              className="select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | "Enrolled" | "Pending")}
            >
              <option value="all">All status</option>
              <option value="Enrolled">Enrolled</option>
              <option value="Pending">Pending</option>
            </select>
            <Link href="/admin/attendance" className="button-soft">
              Attendance Logs
            </Link>
            <Link href="/admin/courses" className="button-soft">
              Courses
            </Link>
            <Link href="/admin/certificates" className="button-soft">
              Certificates
            </Link>
            <Link href="/admin/security" className="button-soft">
              Security
            </Link>
            <Link href="/admin/reports" className="button-soft">
              Reports
            </Link>
            <Link href="/admin/register-inmate" className="button-primary" data-testid="open-register-page">
              Register Inmate
            </Link>
          </div>
        </div>

        <DataTable
          rows={filteredRows}
          columns={[
            { key: "name", header: "Name", render: (row) => row.fullName },
            { key: "id", header: "Student ID", render: (row) => row.id },
            { key: "status", header: "Status", render: (row) => row.biometricStatus },
            {
              key: "courses",
              header: "Skill Interests",
              render: (row) => row.skillInterests.slice(0, 2).join(", "),
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <Link
                  href={`/admin/inmates/${row.id}`}
                  className="button-soft"
                  onClick={() => setSelectedInmateId(row.id)}
                >
                  View Profile
                </Link>
              ),
            },
          ]}
        />
      </section>

      <section className="panel">
        <h2 className="section-title">Recent Entry Logs</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {attendanceEvents.slice(0, 8).map((event) => (
            <div key={`${event.studentId}-${event.timestamp}`} className="inline-row panel" style={{ padding: 10 }}>
              <span>
                {event.studentId} - {event.type.toUpperCase()} via {event.verifiedBy}
              </span>
              <span className="quick-info">{formatDateTime(event.timestamp)}</span>
            </div>
          ))}
          {attendanceEvents.length === 0 ? <p className="quick-info">No entry/exit activity logged yet.</p> : null}
        </div>
      </section>
    </RoleShell>
  );
}
