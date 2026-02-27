import { notFound } from "next/navigation";
import { ProgressBar } from "@/components/progress-bar";
import { RoleShell } from "@/components/role-shell";
import { appMeta, enrollments, inmates, reports, topRatedCourses } from "@/lib/seed-data";

type PageProps = {
  params: Promise<{ studentId: string }>;
};

export default async function InmateProfilePage({ params }: PageProps) {
  const { studentId } = await params;

  const inmate = inmates.find((entry) => entry.id === studentId);
  if (!inmate) notFound();

  const inmateEnrollments = enrollments.filter((entry) => entry.studentId === studentId);

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
          </div>
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <h3 style={{ marginBottom: 10 }}>Reports & Actions</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" className="button-primary">Generate Report</button>
            <button type="button" className="button-soft">Export Data</button>
            <button type="button" className="button-soft">Manage Records</button>
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
      </section>
    </RoleShell>
  );
}
