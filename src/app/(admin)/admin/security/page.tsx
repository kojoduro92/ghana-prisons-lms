"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { formatDateTime } from "@/lib/format";
import { getAttendanceEventsState, getAuditEventsState } from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";
import { STORAGE_KEYS, browserStorage } from "@/lib/storage";
import type { AuditAction, VerificationAttempt } from "@/types/domain";

const actionOptions: AuditAction[] = [
  "login-attempt",
  "login-success",
  "biometric-verification",
  "inmate-registered",
  "course-created",
  "course-enrolled",
  "certificate-issued",
  "report-generated",
  "report-exported",
];

export default function SecurityAuditPage() {
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<"all" | "success" | "failed">("all");
  const [actionFilter, setActionFilter] = useState<"all" | AuditAction>("all");

  const [auditEvents] = useState(getAuditEventsState);
  const [attendanceEvents] = useState(getAttendanceEventsState);
  const [verificationLogs] = useState(
    () => browserStorage.loadState<VerificationAttempt[]>(STORAGE_KEYS.verificationLogs) ?? [],
  );

  const filtered = useMemo(() => {
    return auditEvents.filter((event) => {
      const matchesQuery =
        event.actor.toLowerCase().includes(query.toLowerCase()) ||
        (event.target ?? "").toLowerCase().includes(query.toLowerCase()) ||
        (event.details ?? "").toLowerCase().includes(query.toLowerCase());

      const matchesResult = resultFilter === "all" ? true : event.result === resultFilter;
      const matchesAction = actionFilter === "all" ? true : event.action === actionFilter;
      return matchesQuery && matchesResult && matchesAction;
    });
  }, [auditEvents, actionFilter, query, resultFilter]);

  const failedVerifications = verificationLogs.filter((log) => log.result === "failed").length;

  return (
    <RoleShell title={appMeta.name} subtitle="Security & Audit Center" userName="Admin Officer">
      <section className="grid-3">
        <StatCard label="Audit Events" value={auditEvents.length} helper="Persisted security actions" />
        <StatCard label="Failed Biometric Attempts" value={failedVerifications} helper="From verification flow" />
        <StatCard label="Attendance Events" value={attendanceEvents.length} helper="Entry and exit records" />
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Security Event Log
          </h2>
          <div className="inline-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input"
              style={{ width: 240 }}
              placeholder="Search actor, target, details"
            />
            <select
              className="select"
              value={resultFilter}
              onChange={(event) => setResultFilter(event.target.value as "all" | "success" | "failed")}
            >
              <option value="all">All results</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <select
              className="select"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value as "all" | AuditAction)}
            >
              <option value="all">All actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          rows={filtered}
          columns={[
            { key: "id", header: "Event ID", render: (row) => row.id },
            { key: "action", header: "Action", render: (row) => row.action },
            { key: "actor", header: "Actor", render: (row) => row.actor },
            { key: "target", header: "Target", render: (row) => row.target ?? "-" },
            { key: "result", header: "Result", render: (row) => row.result },
            { key: "details", header: "Details", render: (row) => row.details ?? "-" },
            { key: "time", header: "Timestamp", render: (row) => formatDateTime(row.timestamp) },
          ]}
          emptyLabel="No security events for current filters."
        />
      </section>
    </RoleShell>
  );
}
