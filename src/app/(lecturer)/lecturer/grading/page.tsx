"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";

interface AssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  dueAt?: string;
}

interface SubmissionRecord {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
  gradedBy?: string;
}

interface InmateRecord {
  id: string;
  fullName: string;
}

export default function LecturerGradingPage() {
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [inmates, setInmates] = useState<InmateRecord[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [score, setScore] = useState("70");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [assignmentData, submissionData, inmateData] = await Promise.all([
      fetchApi<{ assignments: AssignmentRecord[] }>("/api/v1/assignments"),
      fetchApi<{ submissions: SubmissionRecord[] }>("/api/v1/submissions"),
      fetchApi<{ inmates: InmateRecord[] }>("/api/v1/inmates"),
    ]);
    setAssignments(assignmentData.assignments);
    setSubmissions(submissionData.submissions);
    setInmates(inmateData.inmates);
    setAssignmentId((current) => current || assignmentData.assignments[0]?.id || "");
    setStudentId((current) => current || inmateData.inmates[0]?.id || "");
  }

  useEffect(() => {
    void load().catch(() => undefined);
  }, []);

  const scoreSummary = useMemo(() => {
    const graded = submissions.filter((entry) => typeof entry.score === "number");
    const avg = graded.length ? Math.round(graded.reduce((sum, entry) => sum + (entry.score ?? 0), 0) / graded.length) : 0;
    return { gradedCount: graded.length, avg };
  }, [submissions]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await fetchApi<{ submission: SubmissionRecord }>("/api/v1/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          studentId,
          submittedAt: new Date().toISOString(),
          score: Number(score),
          feedback: feedback || undefined,
          gradedBy: "Samuel Appiah",
        }),
      });
      await load();
      setFeedback("");
      setNotice("Grade submitted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit grade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Lecturer - Grading Queue" userName="Samuel Appiah">
      <section className="grid-3">
        <article className="panel">
          <h3 style={{ marginBottom: 6 }}>Submissions</h3>
          <p className="quick-info">{submissions.length} total records</p>
        </article>
        <article className="panel">
          <h3 style={{ marginBottom: 6 }}>Graded</h3>
          <p className="quick-info">{scoreSummary.gradedCount} graded entries</p>
        </article>
        <article className="panel">
          <h3 style={{ marginBottom: 6 }}>Average Score</h3>
          <p className="quick-info">{scoreSummary.avg}%</p>
        </article>
      </section>

      <section className="grid-2">
        <article className="panel">
          <h2 className="section-title">Record Grade</h2>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            <label>
              Assignment
              <select className="select" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} required>
                {assignments.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Inmate
              <select className="select" value={studentId} onChange={(event) => setStudentId(event.target.value)} required>
                {inmates.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.id} - {entry.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Score
              <input className="input" type="number" min={0} max={100} value={score} onChange={(event) => setScore(event.target.value)} />
            </label>
            <label>
              Feedback
              <textarea className="textarea" rows={3} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
            </label>
            <button className="button-primary" type="submit" disabled={saving}>
              {saving ? "Submitting..." : "Submit Grade"}
            </button>
          </form>
          {notice ? <p className="status-ok">{notice}</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}
        </article>

        <article className="panel">
          <h2 className="section-title">Grading Guidance</h2>
          <p className="quick-info">
            Capture actionable feedback and consistent numeric scores for each submission. Management analytics and
            inmate progress views update from this queue.
          </p>
        </article>
      </section>

      <section className="panel">
        <h2 className="section-title">Submission Ledger</h2>
        <DataTable
          rows={submissions}
          columns={[
            {
              key: "assignment",
              header: "Assignment",
              render: (row) => assignments.find((entry) => entry.id === row.assignmentId)?.title ?? row.assignmentId,
            },
            {
              key: "student",
              header: "Inmate",
              render: (row) => inmates.find((entry) => entry.id === row.studentId)?.fullName ?? row.studentId,
            },
            { key: "score", header: "Score", render: (row) => (typeof row.score === "number" ? `${row.score}%` : "Pending") },
            { key: "feedback", header: "Feedback", render: (row) => row.feedback ?? "-" },
            { key: "submitted", header: "Timestamp", render: (row) => formatDateTime(row.submittedAt) },
          ]}
          emptyLabel="No submissions available."
        />
      </section>
    </RoleShell>
  );
}
