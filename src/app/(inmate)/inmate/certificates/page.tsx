"use client";

import Link from "next/link";
import { useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { useAppShell } from "@/lib/app-shell";
import { formatDateTime } from "@/lib/format";
import { getCertificatesForStudent, getCoursesState } from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";

export default function InmateCertificatesPage() {
  const { session } = useAppShell();
  const studentId = session?.studentId ?? "GP-10234";
  const userName = session?.displayName ?? studentId;

  const [certificates] = useState(() => getCertificatesForStudent(studentId));
  const [courses] = useState(getCoursesState);

  return (
    <RoleShell title={appMeta.name} subtitle="My Certificates" userName={userName}>
      <section className="panel inline-row">
        <div>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Earned Certificates
          </h2>
          <p className="quick-info" style={{ marginTop: 6 }}>
            Student ID: {studentId} | Certificates: {certificates.length}
          </p>
        </div>
        <Link href="/inmate/dashboard" className="button-soft">
          Back to Dashboard
        </Link>
      </section>

      <section className="panel">
        <DataTable
          rows={certificates}
          columns={[
            { key: "id", header: "Certificate ID", render: (row) => row.id },
            {
              key: "course",
              header: "Course",
              render: (row) => courses.find((item) => item.id === row.courseId)?.title ?? row.courseId,
            },
            { key: "issuedBy", header: "Issued By", render: (row) => row.issuedBy },
            { key: "issuedAt", header: "Issued At", render: (row) => formatDateTime(row.issuedAt) },
            { key: "note", header: "Note", render: (row) => row.note ?? "-" },
          ]}
          emptyLabel="No certificates have been issued yet."
        />
      </section>
    </RoleShell>
  );
}
