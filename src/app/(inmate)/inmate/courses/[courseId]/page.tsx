"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { RoleShell } from "@/components/role-shell";
import { useAppShell } from "@/lib/app-shell";
import {
  addAuditEvent,
  enrollStudentInCourse,
  getCourseBlueprint,
  getCoursesState,
  getEnrollmentsForStudent,
  updateEnrollmentProgress,
} from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";

export default function InmateCourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = decodeURIComponent(params.courseId);
  const { session } = useAppShell();
  const studentId = session?.studentId ?? "GP-10234";
  const actor = session?.displayName ?? studentId;

  const [courses] = useState(getCoursesState);
  const [enrollments, setEnrollments] = useState(() => getEnrollmentsForStudent(studentId));
  const [notice, setNotice] = useState<string | null>(null);

  const course = useMemo(() => courses.find((item) => item.id === courseId), [courseId, courses]);
  const curriculum = useMemo(() => (course ? getCourseBlueprint(course.id) : null), [course]);
  const enrollment = useMemo(
    () => enrollments.find((entry) => entry.courseId === courseId),
    [courseId, enrollments],
  );
  const isEnrolled = Boolean(enrollment);
  const isCompleted = enrollment?.status === "Completed";

  function refreshEnrollments(
    next: ReturnType<typeof getEnrollmentsForStudent> | ReturnType<typeof enrollStudentInCourse>,
  ): void {
    setEnrollments(next.filter((entry) => entry.studentId === studentId));
  }

  function handleEnroll(): void {
    if (!course) return;
    const next = enrollStudentInCourse(studentId, course.id);
    refreshEnrollments(next);
    setNotice(`${course.title} enrolled successfully.`);
    addAuditEvent({
      action: "course-enrolled",
      actor,
      result: "success",
      target: course.id,
      details: `Student ${studentId}`,
    });
  }

  function handleStudy(): void {
    if (!course || !enrollment) return;
    const progressGain = enrollment.progressPercent >= 90 ? 2 : 8;
    const next = updateEnrollmentProgress({
      studentId,
      courseId: course.id,
      activityMinutes: 35,
      lessonsDelta: 1,
      progressDelta: progressGain,
    });
    refreshEnrollments(next);
    setNotice(`Lesson completed (+35 min, +${progressGain}% progress).`);
    addAuditEvent({
      action: "course-progress-updated",
      actor,
      result: "success",
      target: course.id,
      details: `Lesson completed (+${progressGain}% progress)`,
    });
  }

  function handleAssessment(): void {
    if (!course || !enrollment) return;
    const score = Math.min(100, Math.max(50, Math.round(58 + enrollment.progressPercent * 0.35 + Math.random() * 20)));
    const progressGain = score >= 75 ? 6 : 3;
    const next = updateEnrollmentProgress({
      studentId,
      courseId: course.id,
      activityMinutes: 20,
      progressDelta: progressGain,
      assessmentScore: score,
    });
    refreshEnrollments(next);
    setNotice(`Assessment scored ${score}% (+${progressGain}% progress).`);
    addAuditEvent({
      action: "course-progress-updated",
      actor,
      result: "success",
      target: course.id,
      details: `Assessment scored ${score}%`,
    });
  }

  if (!course) {
    return (
      <RoleShell title={appMeta.name} subtitle="Course Details" userName={actor}>
        <section className="panel">
          <h2 className="section-title">Course Not Found</h2>
          <p className="quick-info">The requested course does not exist in the current catalog.</p>
          <Link href="/inmate/courses" className="button-soft">
            Back to Courses
          </Link>
        </section>
      </RoleShell>
    );
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Course Learning Workspace" userName={actor}>
      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 10 }}>
          <h1 style={{ marginBottom: 0 }}>{course.title}</h1>
          <Link href="/inmate/courses" className="button-soft">
            Back to Courses
          </Link>
        </div>
        <div className="grid-2">
          <div>
            <p className="quick-info" style={{ marginTop: 0 }}>
              {course.category} | {course.level ?? "Beginner"} | {course.durationHours ?? 0} hours
            </p>
            <p className="quick-info">{course.summary ?? "Structured learning pathway available offline."}</p>
            <div className="inline-row" style={{ justifyContent: "flex-start" }}>
              <span className="metric-pill">{`Instructor: ${course.instructor}`}</span>
              <span className="metric-pill">{`Rating: ${course.rating.toFixed(1)}`}</span>
              <span className="metric-pill">{`Status: ${enrollment?.status ?? "Not Enrolled"}`}</span>
            </div>
            <div className="inline-row" style={{ marginTop: 12, justifyContent: "flex-start" }}>
              <button type="button" className={isEnrolled ? "button-soft" : "button-primary"} disabled={isEnrolled} onClick={handleEnroll}>
                {isEnrolled ? "Enrolled" : "Enroll"}
              </button>
              <button type="button" className="button-soft" disabled={!isEnrolled || isCompleted} onClick={handleStudy}>
                Continue Lesson
              </button>
              <button type="button" className="button-soft" disabled={!isEnrolled} onClick={handleAssessment}>
                Take Assessment
              </button>
            </div>
            {notice ? <p className="status-ok" style={{ marginTop: 12 }}>{notice}</p> : null}
          </div>
          <div className="panel" style={{ padding: 0, overflow: "hidden", minHeight: 240 }}>
            <div style={{ position: "relative", minHeight: 240 }}>
              <Image
                src={course.thumbnail}
                alt={course.title}
                fill
                sizes="(max-width: 760px) 100vw, 45vw"
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Progress Summary</h2>
        <div className="grid-4">
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Progress</p>
            <h3>{enrollment?.progressPercent ?? 0}%</h3>
          </article>
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Lessons Completed</p>
            <h3>{enrollment?.lessonsCompleted ?? 0}</h3>
          </article>
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Time Spent</p>
            <h3>{enrollment?.timeSpentMinutes ?? 0} min</h3>
          </article>
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Latest Score</p>
            <h3>{typeof enrollment?.latestAssessmentScore === "number" ? `${enrollment.latestAssessmentScore}%` : "-"}</h3>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Course Curriculum</h2>
        {curriculum?.modules.length ? (
          <div className="builder-list">
            {curriculum.modules.map((module) => (
              <article key={module.id} className="builder-module">
                <h3 style={{ marginBottom: 6 }}>{`${module.id} - ${module.title}`}</h3>
                <p className="quick-info" style={{ marginTop: 0 }}>
                  {module.objective ?? "No module objective provided."}
                </p>
                {module.lessons.length ? (
                  <ul className="builder-lesson-list">
                    {module.lessons.map((lesson) => (
                      <li key={lesson.id} className="builder-lesson">
                        <div>
                          <strong>{`${lesson.id} - ${lesson.title}`}</strong>
                          <p className="quick-info" style={{ margin: "4px 0 0" }}>
                            {`${lesson.type} | ${lesson.durationMinutes} min`}
                          </p>
                          {lesson.notes ? (
                            <p className="quick-info" style={{ margin: "4px 0 0" }}>
                              {lesson.notes}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="quick-info">This module currently has no lessons.</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="quick-info">Curriculum setup is in progress for this course.</p>
        )}
      </section>
    </RoleShell>
  );
}
