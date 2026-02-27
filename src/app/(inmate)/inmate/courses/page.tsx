"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CourseCard } from "@/components/course-card";
import { RoleShell } from "@/components/role-shell";
import { useAppShell } from "@/lib/app-shell";
import {
  addAuditEvent,
  enrollStudentInCourse,
  getCoursesState,
  getEnrollmentsForStudent,
} from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";

export default function InmateCoursesPage() {
  const { session } = useAppShell();
  const studentId = session?.studentId ?? "GP-10234";
  const actor = session?.displayName ?? studentId;

  const [courses] = useState(getCoursesState);
  const [enrollments, setEnrollments] = useState(() => getEnrollmentsForStudent(studentId));
  const [notice, setNotice] = useState<string | null>(null);

  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((item) => item.courseId)), [enrollments]);

  function handleEnroll(courseId: string): void {
    const next = enrollStudentInCourse(studentId, courseId);
    const nextForStudent = next.filter((entry) => entry.studentId === studentId);
    setEnrollments(nextForStudent);

    const selected = courses.find((item) => item.id === courseId);
    setNotice(`${selected?.title ?? courseId} enrolled successfully.`);

    addAuditEvent({
      action: "course-enrolled",
      actor,
      result: "success",
      target: courseId,
      details: `Student ${studentId}`,
    });
  }

  return (
    <RoleShell title={appMeta.name} subtitle="My Courses" userName={actor}>
      <section className="panel inline-row">
        <div>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Browse and Enroll in Courses
          </h2>
          <p className="quick-info" style={{ marginTop: 6 }}>
            Student ID: {studentId} | Active Enrollments: {enrollments.length}
          </p>
        </div>
        <Link href="/inmate/dashboard" className="button-soft">
          Back to Dashboard
        </Link>
      </section>

      {notice ? <p className="status-ok">{notice}</p> : null}

      <section className="panel">
        <h3 style={{ marginBottom: 12 }}>Available Courses</h3>
        <div className="grid-4">
          {courses.map((course) => {
            const isEnrolled = enrolledCourseIds.has(course.id);
            return (
              <article key={course.id} className="panel" style={{ padding: 12 }}>
                <CourseCard title={course.title} subtitle={course.category} progress={isEnrolled ? 20 : 0} />
                <div className="inline-row" style={{ marginTop: 10 }}>
                  <span className="quick-info">{course.instructor}</span>
                  <button
                    type="button"
                    className={isEnrolled ? "button-soft" : "button-primary"}
                    disabled={isEnrolled}
                    onClick={() => handleEnroll(course.id)}
                  >
                    {isEnrolled ? "Enrolled" : "Enroll"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </RoleShell>
  );
}
