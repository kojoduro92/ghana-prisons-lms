"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { RoleShell } from "@/components/role-shell";
import {
  getCertificatesForStudent,
  getCoursesState,
  getEnrollmentsForStudent,
  getInmatesState,
  getReportsState,
} from "@/lib/portal-state";
import { formatDate, formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";

export default function ManagementInmateProfilePage() {
  const params = useParams<{ studentId: string }>();
  const studentId = decodeURIComponent(params.studentId);

  const inmates = useMemo(() => getInmatesState(), []);
  const [reportHistory] = useState(getReportsState);
  const [courses] = useState(getCoursesState);
  const [enrollments] = useState(() => getEnrollmentsForStudent(studentId));
  const [certificates] = useState(() => getCertificatesForStudent(studentId));

  const inmate = inmates.find((entry) => entry.id === studentId);
  const visibleReports = reportHistory.filter(
    (record) => !record.scopeStudentId || record.scopeStudentId === studentId,
  );
  const completedCourses = enrollments.filter((entry) => entry.progressPercent >= 100).length;
  const averageProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, entry) => sum + entry.progressPercent, 0) / enrollments.length)
    : 0;

  if (!inmate) {
    return (
      <RoleShell title={appMeta.name} subtitle="Management - Inmate Profile" userName="Command Staff">
        <section className="panel">
          <h1>Inmate not found</h1>
          <p className="quick-info">No stored inmate record matched ID: {studentId}</p>
        </section>
      </RoleShell>
    );
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Management - Inmate Profile" userName="Command Staff">
      <section className="panel grid-2">
        <div>
          <h1 style={{ marginBottom: 6 }}>{inmate.fullName}</h1>
          <p className="quick-info" style={{ marginBottom: 12 }}>
            Inmate ID: {inmate.id} | Warrant Serial Number: {inmate.warrantSerialNumber}
          </p>

          <div className="panel" style={{ padding: 12 }}>
            <p style={{ margin: 0 }}>
              <strong>Warrant Name:</strong> {inmate.warrantName}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Station:</strong> {inmate.station}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Block Name:</strong> {inmate.blockName}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Cell Number:</strong> {inmate.cellNumber}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Offense:</strong> {inmate.offense}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Sentence:</strong> {inmate.sentence}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Date of Birth:</strong> {formatDate(inmate.dateOfBirth)}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Gender:</strong> {inmate.gender}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Education:</strong> {inmate.educationBackground}
            </p>
            <p style={{ margin: "8px 0 0" }}>
              <strong>Skill Interests:</strong> {inmate.skillInterests.join(", ") || "Not specified"}
            </p>
          </div>
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <h3 style={{ marginBottom: 10 }}>Academic Performance & Reports</h3>
          <div className="grid-3" style={{ marginBottom: 12 }}>
            <div className="panel" style={{ padding: 10 }}>
              <strong>{enrollments.length}</strong>
              <p className="quick-info" style={{ margin: "4px 0 0" }}>
                Active Courses
              </p>
            </div>
            <div className="panel" style={{ padding: 10 }}>
              <strong>{averageProgress}%</strong>
              <p className="quick-info" style={{ margin: "4px 0 0" }}>
                Average Progress
              </p>
            </div>
            <div className="panel" style={{ padding: 10 }}>
              <strong>{completedCourses}</strong>
              <p className="quick-info" style={{ margin: "4px 0 0" }}>
                Completed Courses
              </p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link href={`/management/reports?type=performance&studentId=${inmate.id}`} className="button-primary">
              Progress Report
            </Link>
            <Link href={`/management/reports?type=attendance&studentId=${inmate.id}`} className="button-soft">
              Attendance Export
            </Link>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {visibleReports.map((record) => (
              <p key={record.id} className="quick-info" style={{ margin: 0 }}>
                {record.id} - {record.type} ({formatDate(record.generatedAt)})
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

        {enrollments.map((enrollment) => {
          const course = courses.find((entry) => entry.id === enrollment.courseId);
          const isCertified = certificates.some((item) => item.courseId === enrollment.courseId);

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
                <span className={isCertified ? "status-ok" : "status-neutral"}>
                  {isCertified ? "Certificate Issued" : "In Progress"}
                </span>
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
