"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { appMeta } from "@/lib/seed-data";
import { formatDateTime } from "@/lib/format";
import { getAttendanceEventsState } from "@/lib/portal-state";

export default function AttendanceLogsPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "entry" | "exit">("all");
  const [methodFilter, setMethodFilter] = useState<"all" | "fingerprint" | "face">("all");
  const [events] = useState(getAttendanceEventsState);

  const filtered = useMemo(() => {
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

  const summary = useMemo(() => {
    const entries = events.filter((event) => event.type === "entry").length;
    const exits = events.filter((event) => event.type === "exit").length;
    const closureRate = entries > 0 ? Math.round((Math.min(entries, exits) / entries) * 100) : 0;
    const faceEvents = events.filter((event) => event.verifiedBy === "face").length;
    const fingerprintEvents = events.filter((event) => event.verifiedBy === "fingerprint").length;

    return {
      entries,
      exits,
      closureRate,
      faceEvents,
      fingerprintEvents,
      openSessions: Math.max(0, entries - exits),
    };
  }, [events]);

  return (
    <RoleShell title={appMeta.name} subtitle="Attendance Audit Logs" userName="Admin Officer">
      <section className="grid-3">
        <StatCard label="Total Entries" value={summary.entries} helper="Facility clock-ins" />
        <StatCard label="Total Exits" value={summary.exits} helper="Facility clock-outs" />
        <StatCard label="Closure Rate" value={`${summary.closureRate}%`} helper={`${summary.openSessions} open sessions`} />
      </section>

      <section className="grid-2">
        <StatCard label="Fingerprint Events" value={summary.fingerprintEvents} helper="Sensor verifications" />
        <StatCard label="Face Events" value={summary.faceEvents} helper="Camera verifications" />
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Facility Entry / Exit Events
          </h2>
          <div className="inline-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input"
              style={{ width: 240 }}
              placeholder="Search student, facility, method"
            />
            <select
              className="select"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as "all" | "entry" | "exit")}
            >
              <option value="all">All types</option>
              <option value="entry">Entry</option>
              <option value="exit">Exit</option>
            </select>
            <select
              className="select"
              value={methodFilter}
              onChange={(event) => setMethodFilter(event.target.value as "all" | "fingerprint" | "face")}
            >
              <option value="all">All methods</option>
              <option value="fingerprint">Fingerprint</option>
              <option value="face">Face</option>
            </select>
          </div>
        </div>

        <DataTable
          rows={filtered}
          columns={[
            { key: "student", header: "Student ID", render: (row) => row.studentId },
            { key: "type", header: "Type", render: (row) => row.type.toUpperCase() },
            { key: "facility", header: "Facility", render: (row) => row.facility },
            { key: "method", header: "Verified By", render: (row) => row.verifiedBy },
            { key: "time", header: "Timestamp", render: (row) => formatDateTime(row.timestamp) },
          ]}
          emptyLabel="No attendance logs for current filter."
        />
      </section>
    </RoleShell>
  );
}
