"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { formatDateTime } from "@/lib/format";
import { getCertificatesState, getCoursesState, getInmatesState } from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";

export default function AdminCertificatesPage() {
  const [query, setQuery] = useState("");
  const [certificates] = useState(getCertificatesState);
  const [courses] = useState(getCoursesState);
  const [inmates] = useState(getInmatesState);

  const filtered = useMemo(() => {
    return certificates.filter((certificate) => {
      const course = courses.find((item) => item.id === certificate.courseId);
      const inmate = inmates.find((item) => item.id === certificate.studentId);
      const text = `${certificate.id} ${certificate.studentId} ${course?.title ?? ""} ${inmate?.fullName ?? ""}`;
      return text.toLowerCase().includes(query.toLowerCase());
    });
  }, [certificates, courses, inmates, query]);

  const uniqueStudents = new Set(certificates.map((item) => item.studentId)).size;

  return (
    <RoleShell title={appMeta.name} subtitle="Certificate Management" userName="Admin Officer">
      <section className="grid-3">
        <StatCard label="Certificates Issued" value={certificates.length} helper="Persisted award records" />
        <StatCard label="Students Certified" value={uniqueStudents} helper="Unique inmate profiles" />
        <StatCard label="Course Catalog" value={courses.length} helper="Available issuance targets" />
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Issued Certificates
          </h2>
          <input
            className="input"
            style={{ width: 260 }}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by cert, student, course"
          />
        </div>

        <DataTable
          rows={filtered}
          columns={[
            { key: "id", header: "Certificate ID", render: (row) => row.id },
            {
              key: "student",
              header: "Student",
              render: (row) => {
                const inmate = inmates.find((item) => item.id === row.studentId);
                return `${row.studentId} ${inmate ? `(${inmate.fullName})` : ""}`;
              },
            },
            {
              key: "course",
              header: "Course",
              render: (row) => courses.find((item) => item.id === row.courseId)?.title ?? row.courseId,
            },
            { key: "issuedBy", header: "Issued By", render: (row) => row.issuedBy },
            { key: "issuedAt", header: "Issued At", render: (row) => formatDateTime(row.issuedAt) },
            { key: "note", header: "Note", render: (row) => row.note ?? "-" },
          ]}
          emptyLabel="No certificates found for current filter."
        />
      </section>
    </RoleShell>
  );
}
