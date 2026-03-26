"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";
import type { AttendanceEvent } from "@/types/domain";

export default function LecturerAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceEvent[]>([]);
  const [query, setQuery] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("all");

  useEffect(() => {
    void (async () => {
      const data = await fetchApi<{ attendance: AttendanceEvent[] }>("/api/v1/attendance");
      setAttendance(data.attendance);
    })().catch(() => undefined);
  }, []);

  const facilities = useMemo(() => {
    return Array.from(new Set(attendance.map((entry) => entry.facility))).sort();
  }, [attendance]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return attendance.filter((entry) => {
      const matchesQuery =
        !q ||
        entry.studentId.toLowerCase().includes(q) ||
        entry.facility.toLowerCase().includes(q) ||
        entry.verifiedBy.toLowerCase().includes(q);
      const matchesFacility = facilityFilter === "all" ? true : entry.facility === facilityFilter;
      return matchesQuery && matchesFacility;
    });
  }, [attendance, facilityFilter, query]);

  return (
    <RoleShell title={appMeta.name} subtitle="Lecturer - Attendance View" userName="Samuel Appiah">
      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Attendance and Lab Logs
          </h2>
          <div className="inline-row">
            <input
              className="input"
              style={{ width: 220 }}
              placeholder="Search logs..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select className="select" value={facilityFilter} onChange={(event) => setFacilityFilter(event.target.value)}>
              <option value="all">All facilities</option>
              {facilities.map((facility) => (
                <option key={facility} value={facility}>
                  {facility}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DataTable
          rows={filtered}
          columns={[
            { key: "student", header: "Inmate ID", render: (row) => row.studentId },
            { key: "type", header: "Type", render: (row) => row.type.toUpperCase() },
            { key: "facility", header: "Facility", render: (row) => row.facility },
            { key: "method", header: "Method", render: (row) => row.verifiedBy },
            { key: "time", header: "Time", render: (row) => formatDateTime(row.timestamp) },
          ]}
          emptyLabel="No attendance records found."
        />
      </section>
    </RoleShell>
  );
}
