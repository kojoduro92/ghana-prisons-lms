"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { ChartCard } from "@/components/chart-card";
import { appMeta, adminStats, enrollmentDistribution } from "@/lib/seed-data";
import { formatDateTime } from "@/lib/format";
import { getAttendanceEventsState, getInmatesState } from "@/lib/portal-state";
import { STORAGE_KEYS, browserStorage } from "@/lib/storage";

export default function AdminDashboardPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "Enrolled" | "Pending">("all");
  const [inmateRows] = useState(getInmatesState);
  const [attendanceEvents] = useState(getAttendanceEventsState);

  const liveStats = useMemo(() => {
    const activeLearners = inmateRows.filter((item) => item.biometricStatus === "Enrolled").length;

    return {
      ...adminStats,
      totalInmatesRegistered: inmateRows.length,
      activeLearners,
    };
  }, [inmateRows]);

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

  return (
    <RoleShell title={appMeta.name} subtitle="Administrator Dashboard" userName="Admin Officer">
      <section className="grid-4">
        <StatCard label="Total Inmates Registered" value={liveStats.totalInmatesRegistered.toLocaleString()} />
        <StatCard label="Active Learners" value={liveStats.activeLearners.toLocaleString()} />
        <StatCard label="Courses Enrolled" value={liveStats.coursesEnrolled.toLocaleString()} />
        <StatCard label="Certificates Issued" value={liveStats.certificatesIssued.toLocaleString()} />
      </section>

      <section className="grid-2">
        <ChartCard title="Course Enrollment Stats">
          <div className="mini-bars">
            {enrollmentDistribution.map((item) => (
              <span key={item.label} style={{ height: `${Math.round(item.value / 4)}px` }} />
            ))}
          </div>
          <div className="legend">
            {enrollmentDistribution.map((item) => (
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
                  onClick={() => browserStorage.saveState(STORAGE_KEYS.selectedInmate, row.id)}
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
