"use client";

import { useMemo, useState } from "react";
import { CourseCard } from "@/components/course-card";
import { ProgressBar } from "@/components/progress-bar";
import { ProgressDonut } from "@/components/progress-donut";
import { RoleShell } from "@/components/role-shell";
import { ChartCard } from "@/components/chart-card";
import { getSessionFromBrowser } from "@/lib/auth-client";
import { formatDateTime } from "@/lib/format";
import {
  addAttendanceEvent,
  createAttendanceEvent,
  createExitEvent,
  getAttendanceEventsForStudent,
  summarizeAttendance,
} from "@/lib/portal-state";
import {
  appMeta,
  enrollments,
  inmateGoals,
  progressSnapshots,
  topRatedCourses,
} from "@/lib/seed-data";
import type { AttendanceEvent } from "@/types/domain";

export default function InmateDashboardPage() {
  const session = useMemo(() => getSessionFromBrowser(), []);
  const snapshot = progressSnapshots[0];
  const studentId = session?.studentId ?? snapshot.studentId;
  const userName = session?.displayName ?? "John Mensah";

  const activeCourses = enrollments
    .filter((item) => item.studentId === snapshot.studentId)
    .map((item) => {
      const course = topRatedCourses.find((entry) => entry.id === item.courseId);
      return {
        id: item.courseId,
        title: course?.title ?? item.courseId,
        subtitle: course?.category ?? "General",
        progress: item.progressPercent,
      };
    });

  const [verifiedBy, setVerifiedBy] = useState<AttendanceEvent["verifiedBy"]>("fingerprint");
  const [events, setEvents] = useState(() => getAttendanceEventsForStudent(studentId));
  const summary = summarizeAttendance(events);

  function refreshEvents(): void {
    setEvents(getAttendanceEventsForStudent(studentId));
  }

  function handleClockIn(): void {
    const nextEvent = createAttendanceEvent(session, "entry", verifiedBy);
    addAttendanceEvent(nextEvent);
    refreshEvents();
  }

  function handleClockOut(): void {
    const nextEvent = createExitEvent(session, verifiedBy);
    addAttendanceEvent(nextEvent);
    refreshEvents();
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Inmate Dashboard" userName={userName}>
      <section className="panel grid-2">
        <div>
          <h1 style={{ marginBottom: 6 }}>Welcome Back, {userName}</h1>
          <p className="quick-info">Student ID: {studentId}</p>
          <div className="grid-3" style={{ marginTop: 14 }}>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Active Courses</p>
              <h3>{snapshot.activeCourses}</h3>
            </article>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Lessons Completed</p>
              <h3>{snapshot.completedLessons}</h3>
            </article>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Certificates Earned</p>
              <h3>{snapshot.certificatesEarned}</h3>
            </article>
          </div>
        </div>
        <div className="panel" style={{ padding: 12 }}>
          <h3 style={{ marginBottom: 10 }}>My Progress</h3>
          <ProgressDonut value={snapshot.completionPercent} label="Course Completion" size={190} />
        </div>
      </section>

      <section className="panel grid-2">
        <div>
          <h2 className="section-title">Attendance Operations</h2>
          <p className="quick-info" style={{ marginBottom: 10 }}>
            Record supervised facility entry and exit events for audit logging.
          </p>
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
            <button type="button" className="button-primary" onClick={handleClockIn}>
              Clock In
            </button>
            <button type="button" className="button-soft" onClick={handleClockOut}>
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

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Continue Learning
          </h2>
        </div>
        <div className="grid-4">
          {activeCourses.map((course) => (
            <CourseCard key={course.id} title={course.title} subtitle={course.subtitle} progress={course.progress} />
          ))}
        </div>
      </section>

      <section className="grid-2">
        <ChartCard title="Weekly Learning Activity">
          <div className="mini-bars" style={{ minHeight: 130 }}>
            {snapshot.weeklyActivity.map((point, idx) => (
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
          {inmateGoals.map((goal) => (
            <ProgressBar key={goal.label} label={goal.label} current={goal.current} total={goal.total} />
          ))}
        </ChartCard>
      </section>
    </RoleShell>
  );
}
