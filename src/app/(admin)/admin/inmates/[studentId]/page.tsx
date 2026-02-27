"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { RoleShell } from "@/components/role-shell";
import {
  addAuditEvent,
  getCertificatesForStudent,
  getCoursesState,
  getEnrollmentsForStudent,
  getInmatesState,
  getReportsState,
  issueCertificate,
} from "@/lib/portal-state";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";

export default function InmateProfilePage() {
  const params = useParams<{ studentId: string }>();
  const studentId = decodeURIComponent(params.studentId);

  const inmates = useMemo(() => getInmatesState(), []);
  const [reportHistory] = useState(getReportsState);
  const [courses] = useState(getCoursesState);
  const [enrollments] = useState(() => getEnrollmentsForStudent(studentId));
  const [certificates, setCertificates] = useState(() => getCertificatesForStudent(studentId));
  const [notice, setNotice] = useState<string | null>(null);

  const inmate = inmates.find((entry) => entry.id === studentId);
  const visibleReports = reportHistory.filter(
    (record) => !record.scopeStudentId || record.scopeStudentId === studentId,
  );

  function handleIssueCertificate(courseId: string): void {
    if (!inmate) return;

    const next = issueCertificate({
      studentId,
      courseId,
      issuedBy: "Admin Officer",
      note: `Issued from inmate profile ${inmate.fullName}`,
    });

    const updated = next.filter((item) => item.studentId === studentId);
    setCertificates(updated);

    const courseTitle = courses.find((item) => item.id === courseId)?.title ?? courseId;
    setNotice(`Certificate issued for ${courseTitle}.`);

    addAuditEvent({
      action: "certificate-issued",
      actor: "Admin Officer",
      result: "success",
      target: `${studentId}:${courseId}`,
      details: courseTitle,
    });
  }

  if (!inmate) {
    return (
      <RoleShell title={appMeta.name} subtitle="Individual Inmate Profile" userName="Admin Officer">
        <section className="panel">
          <h1>Inmate not found</h1>
          <p className="quick-info">No stored inmate record matched ID: {studentId}</p>
        </section>
      </RoleShell>
    );
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Individual Inmate Profile" userName="Admin Officer">
      <section className="panel grid-2">
        <div>
          <h1 style={{ marginBottom: 6 }}>{inmate.fullName}</h1>
          <p className="quick-info" style={{ marginBottom: 12 }}>
            Student ID: {inmate.id} | Prison Number: {inmate.prisonNumber}
          </p>

          <div className="panel" style={{ padding: 12 }}>
            <p style={{ margin: 0 }}>
              <strong>Assigned Prison:</strong> {inmate.assignedPrison}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Block:</strong> {inmate.blockAssignment}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Biometric Status:</strong> {inmate.biometricStatus}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Education:</strong> {inmate.educationBackground}
            </p>
          </div>
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <h3 style={{ marginBottom: 10 }}>Reports & Actions</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link href={`/admin/reports?type=performance&studentId=${inmate.id}`} className="button-primary">
              Generate Report
            </Link>
            <Link href={`/admin/reports?type=attendance&studentId=${inmate.id}`} className="button-soft">
              Export Data
            </Link>
            <Link href="/admin/reports?type=operational-summary" className="button-soft">
              Manage Records
            </Link>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {visibleReports.map((record) => (
              <p key={record.id} className="quick-info" style={{ margin: 0 }}>
                {record.id} - {record.type} ({new Date(record.generatedAt).toLocaleDateString("en-US")})
              </p>
            ))}
            {visibleReports.length === 0 ? (
              <p className="quick-info" style={{ margin: 0 }}>
                No generated reports yet for this inmate scope.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 8 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Enrolled Courses & Progress
          </h2>
          <span className="quick-info">Certificates issued: {certificates.length}</span>
        </div>

        {notice ? <p className="status-ok">{notice}</p> : null}

        {enrollments.map((enrollment) => {
          const course = courses.find((entry) => entry.id === enrollment.courseId);
          const isCertified = certificates.some((item) => item.courseId === enrollment.courseId);
          const canIssue = enrollment.progressPercent >= 80 && !isCertified;

          return (
            <article key={enrollment.courseId} className="panel" style={{ padding: 12, marginBottom: 10 }}>
              <ProgressBar
                label={course?.title ?? enrollment.courseId}
                current={enrollment.progressPercent}
                total={100}
              />
              <div className="inline-row" style={{ marginTop: 8 }}>
                <span className="quick-info">
                  Status: {enrollment.status} | Progress: {enrollment.progressPercent}%
                </span>
                {isCertified ? (
                  <span className="status-ok">Certificate Issued</span>
                ) : (
                  <button
                    type="button"
                    className={canIssue ? "button-primary" : "button-soft"}
                    disabled={!canIssue}
                    onClick={() => handleIssueCertificate(enrollment.courseId)}
                  >
                    Issue Certificate
                  </button>
                )}
              </div>
            </article>
          );
        })}

        {enrollments.length === 0 ? (
          <p className="quick-info">No enrollments recorded yet for this inmate profile.</p>
        ) : null}
      </section>

      <section className="panel">
        <h2 className="section-title">Certificate History</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {certificates.map((certificate) => {
            const courseTitle = courses.find((item) => item.id === certificate.courseId)?.title ?? certificate.courseId;
            return (
              <div key={certificate.id} className="inline-row panel" style={{ padding: 10 }}>
                <span>
                  {certificate.id} - {courseTitle}
                </span>
                <span className="quick-info">{formatDateTime(certificate.issuedAt)}</span>
              </div>
            );
          })}
          {certificates.length === 0 ? <p className="quick-info">No certificates issued yet.</p> : null}
        </div>
      </section>
    </RoleShell>
  );
}
