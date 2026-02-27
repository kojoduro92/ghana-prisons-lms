"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { RoleShell } from "@/components/role-shell";
import { getInmatesState } from "@/lib/portal-state";
import { appMeta, enrollments, reports, topRatedCourses } from "@/lib/seed-data";

export default function InmateProfilePage() {
  const params = useParams<{ studentId: string }>();
  const studentId = decodeURIComponent(params.studentId);
  const inmates = useMemo(() => getInmatesState(), []);

  const inmate = inmates.find((entry) => entry.id === studentId);
  const inmateEnrollments = enrollments.filter((entry) => entry.studentId === studentId);

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
            <button type="button" className="button-primary">
              Generate Report
            </button>
            <button type="button" className="button-soft">
              Export Data
            </button>
            <button type="button" className="button-soft">
              Manage Records
            </button>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {reports.map((record) => (
              <p key={record.id} className="quick-info" style={{ margin: 0 }}>
                {record.id} - {record.type} ({new Date(record.generatedAt).toLocaleDateString("en-US")})
              </p>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Enrolled Courses & Progress</h2>
        {inmateEnrollments.map((enrollment) => {
          const course = topRatedCourses.find((entry) => entry.id === enrollment.courseId);
          return (
            <ProgressBar
              key={enrollment.courseId}
              label={course?.title ?? enrollment.courseId}
              current={enrollment.progressPercent}
              total={100}
            />
          );
        })}
        {inmateEnrollments.length === 0 ? (
          <p className="quick-info">No enrollments recorded yet for this inmate profile.</p>
        ) : null}
      </section>
    </RoleShell>
  );
}
