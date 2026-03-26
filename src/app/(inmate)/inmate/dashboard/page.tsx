"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ProgressBar } from "@/components/progress-bar";
import { ProgressDonut } from "@/components/progress-donut";
import { RoleShell } from "@/components/role-shell";
import { ChartCard } from "@/components/chart-card";
import { useAppShell } from "@/lib/app-shell";
import { formatDateTime } from "@/lib/format";
import {
  addAttendanceEvent,
  createAttendanceEvent,
  createExitEvent,
  getAttendanceEventsForStudent,
  getCertificatesForStudent,
  getCoursesState,
  getEnrollmentsForStudent,
  getLatestOpenEntry,
  getSessionDurationMinutes,
  summarizeAttendance,
} from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";
import type { AttendanceEvent } from "@/types/domain";

const COURSE_IMAGE_FALLBACK_BY_CATEGORY: Record<string, string> = {
  "IT & Digital Skills": "/assets/education/course-computer.jpg",
  Languages: "/assets/education/course-english.jpg",
  Management: "/assets/education/course-management.jpg",
  "Technical & Vocational": "/assets/education/course-carpentry.jpg",
  "Sales & Marketing": "/assets/education/course-marketing.jpg",
};

const COURSE_IMAGE_FALLBACK_POOL = [
  "/assets/education/course-computer.jpg",
  "/assets/education/course-english.jpg",
  "/assets/education/course-entrepreneurship.jpg",
  "/assets/education/course-carpentry.jpg",
  "/assets/education/course-management.jpg",
  "/assets/education/course-marketing.jpg",
];

function resolveCourseImage(imageSrc: string | undefined, category: string | undefined, courseId: string): string {
  if (imageSrc && imageSrc.trim().length > 0) {
    return imageSrc;
  }

  if (category && COURSE_IMAGE_FALLBACK_BY_CATEGORY[category]) {
    return COURSE_IMAGE_FALLBACK_BY_CATEGORY[category];
  }

  const hash = Array.from(courseId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return COURSE_IMAGE_FALLBACK_POOL[hash % COURSE_IMAGE_FALLBACK_POOL.length];
}

function buildWeeklyActivity(events: AttendanceEvent[], days = 6): number[] {
  const points: number[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    const key = day.toISOString().slice(0, 10);
    const count = events.filter((event) => event.type === "entry" && event.timestamp.slice(0, 10) === key).length;
    points.push(count);
  }

  return points;
}

export default function InmateDashboardPage() {
  const { session } = useAppShell();
  const studentId = session?.studentId ?? "GP-10234";
  const userName = session?.displayName ?? "John Mensah";
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const [courses] = useState(getCoursesState);
  const [enrollments] = useState(() => getEnrollmentsForStudent(studentId));
  const [certificates] = useState(() => getCertificatesForStudent(studentId));
  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((entry) => entry.courseId)), [enrollments]);

  const activeCourses = enrollments.map((item) => {
    const course = courses.find((entry) => entry.id === item.courseId);
    const category = course?.category ?? "General";

    return {
      id: item.courseId,
      title: course?.title ?? item.courseId,
      subtitle: category,
      summary: course?.summary ?? "Continue your assigned module to maintain learning progress.",
      instructor: course?.instructor ?? "Assigned Lecturer",
      durationHours: course?.durationHours ?? 16,
      progress: item.progressPercent,
      imageSrc: resolveCourseImage(course?.thumbnail, category, item.courseId),
    };
  });

  const completionPercent =
    activeCourses.length > 0
      ? Math.round(activeCourses.reduce((sum, item) => sum + item.progress, 0) / activeCourses.length)
      : 0;
  const availableToEnroll = useMemo(
    () =>
      courses
        .filter((course) => (course.status ?? "active") === "active" && !enrolledCourseIds.has(course.id))
        .slice(0, 3)
        .map((course) => ({
          id: course.id,
          title: course.title,
          subtitle: course.category,
          summary: course.summary ?? "Structured learning pathway available offline.",
          instructor: course.instructor,
          durationHours: course.durationHours ?? 16,
          imageSrc: resolveCourseImage(course.thumbnail, course.category, course.id),
        })),
    [courses, enrolledCourseIds],
  );

  const [verifiedBy, setVerifiedBy] = useState<AttendanceEvent["verifiedBy"]>("fingerprint");
  const [events, setEvents] = useState(() => getAttendanceEventsForStudent(studentId));
  const [nowIso, setNowIso] = useState(() => new Date().toISOString());
  const [attendanceNotice, setAttendanceNotice] = useState<string | null>(null);
  const summary = summarizeAttendance(events);
  const openEntry = useMemo(() => getLatestOpenEntry(events), [events]);
  const activeSessionMinutes = openEntry ? getSessionDurationMinutes(openEntry.timestamp, nowIso) : 0;
  const totalStudyMinutes = useMemo(
    () => enrollments.reduce((sum, entry) => sum + (entry.timeSpentMinutes ?? 0), 0),
    [enrollments],
  );

  useEffect(() => {
    if (!openEntry) return;

    const timer = window.setInterval(() => {
      setNowIso(new Date().toISOString());
    }, 30_000);

    return () => {
      window.clearInterval(timer);
    };
  }, [openEntry]);

  const weeklyActivity = useMemo(() => {
    const generated = buildWeeklyActivity(events, 6);
    if (generated.some((value) => value > 0)) {
      return generated;
    }
    return [2, 4, 4, 6, 5, 7];
  }, [events]);

  const completedLessons = useMemo(() => {
    const trackedLessons = enrollments.reduce((sum, entry) => sum + (entry.lessonsCompleted ?? 0), 0);
    if (trackedLessons > 0) {
      return trackedLessons;
    }
    const progressTotal = enrollments.reduce((sum, entry) => sum + entry.progressPercent, 0);
    return Math.max(0, Math.round(progressTotal / 20));
  }, [enrollments]);

  const goals = useMemo(() => {
    const digitalCourse = activeCourses.find((course) => course.subtitle === "IT & Digital Skills");
    return [
      {
        label: "Complete IT & Digital Skills Course",
        current: digitalCourse?.progress ?? 0,
        total: 100,
      },
      {
        label: "Earn 3 Certificates",
        current: certificates.length,
        total: 3,
      },
      {
        label: "Attendance Completion",
        current: summary.completionRate,
        total: 100,
      },
    ];
  }, [activeCourses, certificates.length, summary.completionRate]);

  function refreshEvents(): void {
    setEvents(getAttendanceEventsForStudent(studentId));
  }

  function handleClockIn(): void {
    if (openEntry) {
      setAttendanceNotice("Entry already active. Use Clock Out when leaving the facility.");
      return;
    }

    const nextEvent = createAttendanceEvent(session, "entry", verifiedBy);
    addAttendanceEvent(nextEvent);
    setAttendanceNotice("Clock-in recorded.");
    refreshEvents();
  }

  function handleClockOut(): void {
    if (!openEntry) {
      setAttendanceNotice("No active facility entry found. Clock In first.");
      return;
    }

    const nextEvent = createExitEvent(session, verifiedBy);
    addAttendanceEvent(nextEvent);
    setAttendanceNotice("Clock-out recorded and session closed.");
    refreshEvents();
  }

  if (!isHydrated) {
    return (
      <RoleShell title={appMeta.name} subtitle="Inmate Dashboard" userName={userName}>
        <section className="panel">
          <h2 className="section-title" style={{ marginBottom: 8 }}>
            Loading Dashboard
          </h2>
          <p className="quick-info">Preparing your latest courses, attendance, and progress data...</p>
        </section>
      </RoleShell>
    );
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Inmate Dashboard" userName={userName}>
      <section className="panel grid-2" id="overview">
        <div>
          <h1 style={{ marginBottom: 6 }}>Welcome Back, {userName}</h1>
          <p className="quick-info">Student ID: {studentId}</p>
          <p className="quick-info" style={{ marginTop: 4 }}>
            Facility: {session?.facilityLocation ?? "Digital Learning Lab"} | Device: {session?.allocatedDeviceType ?? "Tablet"}
          </p>
          <div className="grid-4" style={{ marginTop: 14 }}>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Active Courses</p>
              <h3>{activeCourses.length}</h3>
            </article>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Lessons Completed</p>
              <h3>{completedLessons}</h3>
            </article>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Hours Studied</p>
              <h3>{Math.round(totalStudyMinutes / 60)}</h3>
            </article>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Certificates Earned</p>
              <h3>{certificates.length}</h3>
            </article>
          </div>
        </div>
        <div className="panel" style={{ padding: 12 }}>
          <h3 style={{ marginBottom: 10 }}>My Progress</h3>
          <ProgressDonut value={completionPercent} label="Course Completion" size={190} />
        </div>
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 10 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Quick Navigation
          </h2>
          <span className="quick-info">Jump directly to the part you need</span>
        </div>
        <div className="inmate-dashboard-nav-grid">
          <a href="#continue-learning" className="inmate-dashboard-nav-link">
            <strong>Continue Learning</strong>
            <span>{activeCourses.length} active course{activeCourses.length === 1 ? "" : "s"}</span>
          </a>
          <a href="#attendance-operations" className="inmate-dashboard-nav-link">
            <strong>Attendance Operations</strong>
            <span>{openEntry ? "Session active now" : "No active session"}</span>
          </a>
          <a href="#learning-insights" className="inmate-dashboard-nav-link">
            <strong>Learning Insights</strong>
            <span>{completedLessons} lessons completed</span>
          </a>
          <a href="#goals" className="inmate-dashboard-nav-link">
            <strong>Goals & Achievements</strong>
            <span>{certificates.length} certificates earned</span>
          </a>
        </div>
      </section>

      <section className="panel grid-2" id="attendance-operations">
        <div>
          <h2 className="section-title">Attendance Operations</h2>
          <p className="quick-info" style={{ marginBottom: 10 }}>
            Record supervised facility entry and exit events for audit logging.
          </p>
          {attendanceNotice ? <p className="status-ok">{attendanceNotice}</p> : null}
          <div className="panel" style={{ padding: 12, marginBottom: 12 }}>
            <div className="grid-3">
              <article>
                <p className="quick-info" style={{ margin: 0 }}>
                  Facility Status
                </p>
                <h3>{openEntry ? "In Session" : "No Active Session"}</h3>
              </article>
              <article>
                <p className="quick-info" style={{ margin: 0 }}>
                  Entry Started
                </p>
                <h3 style={{ fontSize: "1rem" }}>{openEntry ? formatDateTime(openEntry.timestamp) : "-"}</h3>
              </article>
              <article>
                <p className="quick-info" style={{ margin: 0 }}>
                  Current Duration
                </p>
                <h3>{openEntry ? `${activeSessionMinutes} min` : "0 min"}</h3>
              </article>
            </div>
          </div>
          <div className="inline-row" style={{ justifyContent: "flex-start" }}>
            <select
              className="select"
              style={{ width: 180 }}
              value={verifiedBy}
              onChange={(event) => setVerifiedBy(event.target.value as AttendanceEvent["verifiedBy"])}
            >
              <option value="fingerprint">Fingerprint</option>
              <option value="face">Facial Recognition</option>
            </select>
            <button type="button" className="button-primary" onClick={handleClockIn} disabled={Boolean(openEntry)}>
              Clock In
            </button>
            <button type="button" className="button-soft" onClick={handleClockOut} disabled={!openEntry}>
              Clock Out
            </button>
          </div>
          <div className="grid-3" style={{ marginTop: 14 }}>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Entries</p>
              <h3>{summary.entries}</h3>
            </article>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Exits</p>
              <h3>{summary.exits}</h3>
            </article>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Completion</p>
              <h3>{summary.completionRate}%</h3>
            </article>
          </div>
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <h3 style={{ marginBottom: 10 }}>Recent Attendance Events</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {events.slice(0, 6).map((event) => (
              <div key={`${event.studentId}-${event.timestamp}`} className="inline-row panel" style={{ padding: 10 }}>
                <span>
                  {event.type.toUpperCase()} via {event.verifiedBy}
                </span>
                <span className="quick-info">{formatDateTime(event.timestamp)}</span>
              </div>
            ))}
            {events.length === 0 ? <p className="quick-info">No attendance activity yet.</p> : null}
          </div>
        </div>
      </section>

      <section className="panel" id="continue-learning">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Continue Learning
          </h2>
          <div className="inline-row">
            <Link href="/inmate/courses" className="button-soft">
              My Courses
            </Link>
            <Link href="/inmate/assignments" className="button-soft">
              Assignments
            </Link>
            <Link href="/inmate/progress" className="button-soft">
              Progress
            </Link>
            <Link href="/inmate/certificates" className="button-soft">
              Certificates
            </Link>
          </div>
        </div>

        <div className="inmate-dashboard-course-grid">
          {activeCourses.map((course) => (
            <article key={course.id} className="inmate-dashboard-course-card">
              <div className="inmate-dashboard-course-image-wrap">
                <Image
                  src={course.imageSrc}
                  alt={course.title}
                  fill
                  sizes="(max-width: 1200px) 100vw, 33vw"
                  className="inmate-dashboard-course-image"
                />
                <div className="inmate-dashboard-course-badges">
                  <span>{course.subtitle}</span>
                  <strong>{course.progress}% complete</strong>
                </div>
              </div>

              <div className="inmate-dashboard-course-body">
                <h3>{course.title}</h3>
                <p>{course.summary}</p>
                <div className="inmate-dashboard-course-meta">
                  <span>{course.instructor}</span>
                  <span>{course.durationHours} hrs</span>
                </div>
                <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={course.progress}>
                  <span className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, course.progress))}%` }} />
                </div>
                <div className="inmate-dashboard-course-actions">
                  <Link href={`/inmate/courses/${course.id}`} className="button-primary">
                    Continue Course
                  </Link>
                  <Link href="/inmate/courses" className="button-soft">
                    Open Catalog
                  </Link>
                </div>
              </div>
            </article>
          ))}
          {activeCourses.length === 0 ? (
            <article className="panel inmate-dashboard-course-empty" style={{ padding: 12 }}>
              <p className="quick-info" style={{ margin: 0 }}>
                No courses enrolled yet. Open Browse Courses to start learning.
              </p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Available to Enroll
          </h2>
          <div className="inline-row">
            <span className="quick-info">New and other active courses you have not joined yet</span>
            <Link href="/inmate/courses" className="button-soft">
              View All Courses
            </Link>
          </div>
        </div>
        <div className="inmate-dashboard-course-grid">
          {availableToEnroll.map((course) => (
            <article key={course.id} className="inmate-dashboard-course-card">
              <div className="inmate-dashboard-course-image-wrap">
                <Image
                  src={course.imageSrc}
                  alt={course.title}
                  fill
                  sizes="(max-width: 1200px) 100vw, 33vw"
                  className="inmate-dashboard-course-image"
                />
                <div className="inmate-dashboard-course-badges">
                  <span>{course.subtitle}</span>
                  <strong>{course.durationHours} hrs</strong>
                </div>
              </div>
              <div className="inmate-dashboard-course-body">
                <h3>{course.title}</h3>
                <p>{course.summary}</p>
                <div className="inmate-dashboard-course-meta">
                  <span>{course.instructor}</span>
                  <span>Ready for enrollment</span>
                </div>
                <div className="inmate-dashboard-course-actions">
                  <Link href={`/inmate/courses/${course.id}`} className="button-primary">
                    View Course
                  </Link>
                  <Link href="/inmate/courses" className="button-soft">
                    Open Catalog
                  </Link>
                </div>
              </div>
            </article>
          ))}
          {availableToEnroll.length === 0 ? (
            <article className="panel inmate-dashboard-course-empty" style={{ padding: 12 }}>
              <p className="quick-info" style={{ margin: 0 }}>
                You are already enrolled in all active courses currently available.
              </p>
            </article>
          ) : null}
        </div>
      </section>

      <section className="grid-2" id="learning-insights">
        <ChartCard title="Weekly Learning Activity">
          <div className="mini-bars" style={{ minHeight: 130 }}>
            {weeklyActivity.map((point, idx) => (
              <span key={idx} style={{ height: `${point * 16}px` }} />
            ))}
          </div>
          <div className="legend">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>
        </ChartCard>

        <ChartCard title="Goals & Achievements">
          <div id="goals" />
          {goals.map((goal) => (
            <ProgressBar key={goal.label} label={goal.label} current={goal.current} total={goal.total} />
          ))}
        </ChartCard>
      </section>
    </RoleShell>
  );
}
