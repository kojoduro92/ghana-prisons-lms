"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CourseCard } from "@/components/course-card";
import { RoleShell } from "@/components/role-shell";
import { useAppShell } from "@/lib/app-shell";
import { formatDateTime } from "@/lib/format";
import {
  addAuditEvent,
  enrollStudentInCourse,
  getCoursesState,
  getEnrollmentsForStudent,
  updateEnrollmentProgress,
} from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";

export default function InmateCoursesPage() {
  const { session } = useAppShell();
  const studentId = session?.studentId ?? "GP-10234";
  const actor = session?.displayName ?? studentId;

  const [courses] = useState(getCoursesState);
  const [enrollments, setEnrollments] = useState(() => getEnrollmentsForStudent(studentId));
  const [notice, setNotice] = useState<string | null>(null);
  const activeCourses = useMemo(
    () => courses.filter((course) => (course.status ?? "active") === "active"),
    [courses],
  );

  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((item) => item.courseId)), [enrollments]);
  const enrollmentByCourse = useMemo(
    () => new Map(enrollments.map((item) => [item.courseId, item])),
    [enrollments],
  );
  const learningSummary = useMemo(() => {
    const totalMinutes = enrollments.reduce((sum, entry) => sum + (entry.timeSpentMinutes ?? 0), 0);
    const lessonsCompleted = enrollments.reduce((sum, entry) => sum + (entry.lessonsCompleted ?? 0), 0);
    const assessmentsTaken = enrollments.reduce((sum, entry) => sum + (entry.assessmentsTaken ?? 0), 0);
    const scored = enrollments
      .map((entry) => entry.latestAssessmentScore)
      .filter((value): value is number => typeof value === "number");
    const averageAssessmentScore =
      scored.length > 0 ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length) : null;

    return {
      activeCourses: enrollments.length,
      totalMinutes,
      lessonsCompleted,
      assessmentsTaken,
      averageAssessmentScore,
    };
  }, [enrollments]);
  const recentActivity = useMemo(() => {
    return [...enrollments]
      .filter((entry) => entry.lastActivityAt)
      .sort((left, right) => new Date(right.lastActivityAt ?? "").getTime() - new Date(left.lastActivityAt ?? "").getTime())
      .slice(0, 4);
  }, [enrollments]);
  const enrolledCourses = useMemo(
    () => activeCourses.filter((course) => enrolledCourseIds.has(course.id)),
    [activeCourses, enrolledCourseIds],
  );
  const availableToEnroll = useMemo(
    () => activeCourses.filter((course) => !enrolledCourseIds.has(course.id)),
    [activeCourses, enrolledCourseIds],
  );

  function refreshStudentEnrollments(next: ReturnType<typeof getEnrollmentsForStudent> | ReturnType<typeof enrollStudentInCourse>) {
    setEnrollments(next.filter((entry) => entry.studentId === studentId));
  }

  function handleEnroll(courseId: string): void {
    const next = enrollStudentInCourse(studentId, courseId);
    refreshStudentEnrollments(next);

    const selected = courses.find((item) => item.id === courseId);
    setNotice(`${selected?.title ?? courseId} enrolled successfully. Start your first lesson.`);

    addAuditEvent({
      action: "course-enrolled",
      actor,
      result: "success",
      target: courseId,
      details: `Student ${studentId}`,
    });
  }

  function handleStudy(courseId: string): void {
    const enrollment = enrollmentByCourse.get(courseId);
    if (!enrollment) return;

    const progressGain = enrollment.progressPercent >= 90 ? 2 : 8;
    const next = updateEnrollmentProgress({
      studentId,
      courseId,
      activityMinutes: 35,
      lessonsDelta: 1,
      progressDelta: progressGain,
    });
    refreshStudentEnrollments(next);
    const selected = courses.find((item) => item.id === courseId);
    setNotice(`${selected?.title ?? courseId}: lesson session recorded (+35 min, +${progressGain}% progress).`);

    addAuditEvent({
      action: "course-progress-updated",
      actor,
      result: "success",
      target: courseId,
      details: `Lesson completed (+${progressGain}% progress)`,
    });
  }

  function handleAssessment(courseId: string): void {
    const enrollment = enrollmentByCourse.get(courseId);
    if (!enrollment) return;

    const score = Math.min(100, Math.max(50, Math.round(58 + enrollment.progressPercent * 0.35 + Math.random() * 20)));
    const progressGain = score >= 75 ? 6 : 3;
    const next = updateEnrollmentProgress({
      studentId,
      courseId,
      activityMinutes: 20,
      progressDelta: progressGain,
      assessmentScore: score,
    });
    refreshStudentEnrollments(next);
    const selected = courses.find((item) => item.id === courseId);
    setNotice(`${selected?.title ?? courseId}: assessment scored ${score}% (+${progressGain}% progress).`);

    addAuditEvent({
      action: "course-progress-updated",
      actor,
      result: "success",
      target: courseId,
      details: `Assessment scored ${score}%`,
    });
  }

  function renderCourseCard(course: (typeof activeCourses)[number]) {
    const enrollment = enrollmentByCourse.get(course.id);
    const isEnrolled = enrolledCourseIds.has(course.id);
    const isCompleted = enrollment?.status === "Completed";

    return (
      <article key={course.id} className="panel" style={{ padding: 12 }}>
        <CourseCard
          title={course.title}
          subtitle={course.category}
          progress={enrollment?.progressPercent ?? 0}
          imageSrc={course.thumbnail}
        />
        <div className="course-meta-grid" style={{ marginTop: 10 }}>
          <span className="metric-pill">{`Lessons: ${enrollment?.lessonsCompleted ?? 0}`}</span>
          <span className="metric-pill">{`Time: ${enrollment?.timeSpentMinutes ?? 0} min`}</span>
          <span className="metric-pill">{`Assessments: ${enrollment?.assessmentsTaken ?? 0}`}</span>
          <span className="metric-pill">{`Latest Score: ${
            typeof enrollment?.latestAssessmentScore === "number" ? `${enrollment.latestAssessmentScore}%` : "-"
          }`}</span>
        </div>
        <div className="inline-row" style={{ marginTop: 10 }}>
          <span className="quick-info">{`${course.instructor} | ${course.level ?? "Beginner"} | ${
            course.durationHours ?? 0
          } hrs`}</span>
          <div className="course-actions">
            <Link
              href={`/inmate/courses/${course.id}`}
              className="button-soft"
              data-testid={`open-course-page-${course.id}`}
            >
              Open Course Page
            </Link>
            <button
              type="button"
              className={isEnrolled ? "button-soft" : "button-primary"}
              disabled={isEnrolled}
              onClick={() => handleEnroll(course.id)}
            >
              {isEnrolled ? "Enrolled" : "Enroll"}
            </button>
            <button
              type="button"
              className="button-soft"
              disabled={!isEnrolled || isCompleted}
              onClick={() => handleStudy(course.id)}
            >
              Continue Lesson
            </button>
            <button
              type="button"
              className="button-soft"
              disabled={!isEnrolled}
              onClick={() => handleAssessment(course.id)}
            >
              Take Assessment
            </button>
          </div>
        </div>
        {course.summary ? <p className="quick-info" style={{ marginTop: 8 }}>{course.summary}</p> : null}
      </article>
    );
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
        <div className="inline-row" style={{ marginBottom: 10 }}>
          <h3 style={{ margin: 0 }}>Learning Analytics</h3>
          <span className="quick-info">Live from study and assessment activity</span>
        </div>
        <div className="grid-4">
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Study Time</p>
            <h3>{Math.round(learningSummary.totalMinutes / 60)} hrs</h3>
          </article>
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Lessons Completed</p>
            <h3>{learningSummary.lessonsCompleted}</h3>
          </article>
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Assessments Taken</p>
            <h3>{learningSummary.assessmentsTaken}</h3>
          </article>
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Average Score</p>
            <h3>{learningSummary.averageAssessmentScore !== null ? `${learningSummary.averageAssessmentScore}%` : "-"}</h3>
          </article>
        </div>
        {recentActivity.length > 0 ? (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {recentActivity.map((entry) => {
              const course = courses.find((item) => item.id === entry.courseId);
              return (
                <div key={`${entry.courseId}-${entry.lastActivityAt}`} className="inline-row panel" style={{ padding: 10 }}>
                  <span>
                    {course?.title ?? entry.courseId} | Progress {entry.progressPercent}%
                  </span>
                  <span className="quick-info">{formatDateTime(entry.lastActivityAt ?? "")}</span>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h3 style={{ marginBottom: 0 }}>My Enrolled Courses</h3>
          <span className="quick-info">{enrolledCourses.length} enrolled</span>
        </div>
        <div className="grid-4">
          {enrolledCourses.map(renderCourseCard)}
          {enrolledCourses.length === 0 ? (
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info" style={{ margin: 0 }}>
                You are not enrolled in any course yet. Use the available catalog below to join one.
              </p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h3 style={{ marginBottom: 0 }}>Available to Enroll</h3>
          <span className="quick-info">{availableToEnroll.length} active course options</span>
        </div>
        <div className="grid-4">
          {availableToEnroll.map(renderCourseCard)}
          {availableToEnroll.length === 0 ? (
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info" style={{ margin: 0 }}>
                No additional active courses are currently published. Please contact the admin team.
              </p>
            </article>
          ) : null}
        </div>
      </section>
    </RoleShell>
  );
}
