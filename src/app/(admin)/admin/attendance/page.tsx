"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { appMeta } from "@/lib/seed-data";
import { formatDateTime } from "@/lib/format";
import { getAttendanceEventsState } from "@/lib/portal-state";

export default function AttendanceLogsPage() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "entry" | "exit">("all");
  const [events] = useState(getAttendanceEventsState);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      const matchesQuery =
        event.studentId.toLowerCase().includes(query.toLowerCase()) ||
        event.facility.toLowerCase().includes(query.toLowerCase()) ||
        event.verifiedBy.toLowerCase().includes(query.toLowerCase());

      const matchesType = typeFilter === "all" ? true : event.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [events, query, typeFilter]);

  return (
    <RoleShell title={appMeta.name} subtitle="Attendance Audit Logs" userName="Admin Officer">
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
