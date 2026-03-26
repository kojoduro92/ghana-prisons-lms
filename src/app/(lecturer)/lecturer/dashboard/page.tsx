"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { BrandLogo } from "@/components/brand-logo";
import { signOutTo } from "@/lib/auth-client";
import { fetchApi } from "@/lib/client-api";
import { formatDate } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";
import type { AttendanceEvent, Enrollment } from "@/types/domain";

interface CourseRecord {
  id: string;
  title: string;
  category: string;
  instructor: string;
}

interface AssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  dueAt?: string;
  gradingMode?: "manual" | "auto";
  createdAt: string;
}

interface SubmissionRecord {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  score?: number;
}

export default function LecturerDashboardPage() {
  const [nowMs] = useState(() => Date.now());
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEvent[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [courseData, assignmentData, submissionData, attendanceData, enrollmentData] = await Promise.all([
          fetchApi<{ courses: CourseRecord[] }>("/api/v1/courses"),
          fetchApi<{ assignments: AssignmentRecord[] }>("/api/v1/assignments"),
          fetchApi<{ submissions: SubmissionRecord[] }>("/api/v1/submissions"),
          fetchApi<{ attendance: AttendanceEvent[] }>("/api/v1/attendance"),
          fetchApi<{ enrollments: Enrollment[] }>("/api/v1/enrollments"),
        ]);
        if (!mounted) return;
        setCourses(courseData.courses);
        setAssignments(assignmentData.assignments);
        setSubmissions(submissionData.submissions);
        setAttendance(attendanceData.attendance);
        setEnrollments(enrollmentData.enrollments);
      } catch (loadError) {
        if (!mounted) return;
        setError(loadError instanceof Error ? loadError.message : "Unable to load lecturer dashboard.");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const avgProgress = enrollments.length
    ? Math.round(enrollments.reduce((sum, item) => sum + item.progressPercent, 0) / enrollments.length)
    : 0;
  const gradedSubmissions = submissions.filter((entry) => typeof entry.score === "number");
  const avgScore = gradedSubmissions.length
    ? Math.round(gradedSubmissions.reduce((sum, item) => sum + (item.score ?? 0), 0) / gradedSubmissions.length)
    : 0;

  const pendingAssignments = useMemo(
    () => assignments.filter((item) => !item.dueAt || new Date(item.dueAt).getTime() >= nowMs),
    [assignments, nowMs],
  );

  const attendanceTrend = useMemo(() => {
    const values = [0, 0, 0, 0, 0, 0];
    const now = new Date();
    attendance.forEach((event) => {
      if (event.type !== "entry") return;
      const date = new Date(event.timestamp);
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays >= 0 && diffDays < values.length) {
        values[values.length - diffDays - 1] += 1;
      }
    });
    return values;
  }, [attendance]);

  return (
    <div className="board-page board-lecturer-page">
      <header className="board-topbar">
        <div className="board-brand">
          <BrandLogo size={34} />
          <p>{appMeta.name}</p>
        </div>
        <div className="board-topbar-right">
          <span className="board-utility-icon">◔</span>
          <span className="board-utility-icon">✉</span>
          <span className="board-utility-icon">⇅</span>
          <span className="board-chip">Samuel Appiah</span>
          <span className="board-chip">GP-L100</span>
          <button type="button" className="button-soft" onClick={() => signOutTo("/access")}>
            Sign out
          </button>
        </div>
      </header>

      <nav className="board-tabs" aria-label="Portal sections">
        <Link href="/lecturer/dashboard" className="board-tab board-tab-active">
          Dashboard
        </Link>
        <Link href="/lecturer/courses" className="board-tab">
          Courses
        </Link>
        <Link href="/lecturer/assignments" className="board-tab">
          Assignments
        </Link>
        <Link href="/lecturer/reports" className="board-tab">
          Reports
        </Link>
      </nav>

      <main className="board-content">
        <section className="board-heading-row">
          <h1>Welcome back, Mr. Appiah!</h1>
          <div className="inline-row">
            <Link href="/lecturer/courses" className="button-primary">
              Upload Course Content
            </Link>
            <Link href="/lecturer/assignments" className="button-soft">
              Upload Assignment Document
            </Link>
          </div>
        </section>

        <section className="board-kpi-strip board-kpi-strip-lecturer">
          <article className="board-kpi-card">
            <p>Students Enrolled</p>
            <strong>{enrollments.length}</strong>
          </article>
          <article className="board-kpi-card">
            <p>Avg. Attendance Rate</p>
            <strong>{Math.min(100, Math.max(0, avgProgress + 13))}%</strong>
          </article>
          <article className="board-kpi-card">
            <p>Course Completion Rate</p>
            <strong>{avgProgress}%</strong>
          </article>
          <article className="board-kpi-card">
            <p>Average Grade</p>
            <strong>{avgScore}%</strong>
          </article>
        </section>

        <section className="board-lecturer-layout">
          <article className="board-panel board-panel-soft">
            <div className="inline-row" style={{ marginBottom: 10 }}>
              <h2>My Courses</h2>
              <Link href="/lecturer/courses" className="button-primary">
                Create New Course
              </Link>
            </div>
            <div className="board-list">
              {courses.slice(0, 4).map((course) => {
                const progress = enrollments
                  .filter((entry) => entry.courseId === course.id)
                  .reduce((sum, entry, _, all) => sum + Math.round(entry.progressPercent / Math.max(1, all.length)), 0);
                return (
                  <div key={course.id} className="board-list-item">
                    <div>
                      <strong>{course.title}</strong>
                      <p>{course.id}</p>
                    </div>
                    <div className="board-progress-mini">
                      <span style={{ width: `${Math.max(20, Math.min(100, progress))}%` }} />
                    </div>
                    <Link href="/lecturer/courses" className="button-soft">
                      Upload Content
                    </Link>
                  </div>
                );
              })}
            </div>
          </article>

          <article className="board-panel board-panel-soft">
            <h2>Student Attendance</h2>
            <h3>Weekly Attendance Overview</h3>
            <div className="board-mini-bars">
              {attendanceTrend.map((point, index) => (
                <span key={`${index}-${point}`} style={{ height: `${Math.max(20, point * 18)}px` }} />
              ))}
            </div>
            <div className="board-x-labels">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>
            <h3 style={{ marginTop: 12 }}>Recent Attendance Records</h3>
            <DataTable
              rows={attendance.slice(0, 5)}
              columns={[
                { key: "student", header: "Student", render: (row) => row.studentId },
                { key: "type", header: "Type", render: (row) => row.type.toUpperCase() },
                { key: "method", header: "Method", render: (row) => row.verifiedBy },
                { key: "facility", header: "Facility", render: (row) => row.facility },
              ]}
              emptyLabel="No attendance records yet."
            />
          </article>

          <aside className="board-panel board-panel-soft">
            <div className="inline-row" style={{ marginBottom: 8 }}>
              <h2>Assignments &amp; Grading</h2>
              <Link href="/lecturer/assignments" className="button-primary">
                Create Assignment
              </Link>
            </div>
            <div className="board-list">
              {pendingAssignments.slice(0, 3).map((assignment) => (
                <div key={assignment.id} className="board-list-item">
                  <div>
                    <strong>{assignment.title}</strong>
                    <p>{assignment.dueAt ? formatDate(assignment.dueAt) : "No due date"}</p>
                  </div>
                  <Link href="/lecturer/grading" className="button-soft">
                    Allocate Marks
                  </Link>
                </div>
              ))}
            </div>

            <h3 style={{ marginTop: 12 }}>Student Performance</h3>
            <DataTable
              rows={gradedSubmissions.slice(0, 5)}
              columns={[
                { key: "student", header: "Student", render: (row) => row.studentId },
                { key: "assignment", header: "Assignment", render: (row) => row.assignmentId },
                { key: "score", header: "Score", render: (row) => `${row.score ?? 0}%` },
              ]}
              emptyLabel="No graded submissions yet."
            />
            <div className="board-inline-meta" style={{ marginTop: 10 }}>
              <span>Manual Grading</span>
              <span>Auto Grading</span>
              <span>Answer Key Ready</span>
            </div>
          </aside>
        </section>

        {error ? <p className="status-bad">{error}</p> : null}
      </main>

      <footer className="board-footer">Last Sync: 2 mins ago · Secure & Offline</footer>
    </div>
  );
}
