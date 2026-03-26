"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { listPrototypeAssignments } from "@/lib/browser-prototype-store";
import { useAppShell } from "@/lib/app-shell";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";
import type { Enrollment } from "@/types/domain";

interface AssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  dueAt?: string;
  gradingMode?: "manual" | "auto";
  attachmentFileName?: string;
  attachmentMimeType?: string;
  attachmentSizeBytes?: number;
  attachmentPath?: string;
  attachmentDataUrl?: string;
  createdAt: string;
}

interface SubmissionRecord {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
}

export default function InmateAssignmentsPage() {
  const { session } = useAppShell();
  const studentId = session?.studentId ?? "GP-10234";
  const displayName = session?.displayName ?? "Inmate";

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRecord[]>([]);
  const [assignmentId, setAssignmentId] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [enrollmentData, assignmentData, submissionData] = await Promise.allSettled([
      fetchApi<{ enrollments: Enrollment[] }>(`/api/v1/enrollments?studentId=${encodeURIComponent(studentId)}`),
      fetchApi<{ assignments: AssignmentRecord[] }>("/api/v1/assignments"),
      fetchApi<{ submissions: SubmissionRecord[] }>("/api/v1/submissions"),
    ]);
    setEnrollments(enrollmentData.status === "fulfilled" ? enrollmentData.value.enrollments : []);
    const apiAssignments = assignmentData.status === "fulfilled" ? assignmentData.value.assignments : [];
    const localAssignments = listPrototypeAssignments();
    const seen = new Set<string>();
    setAssignments(
      [...apiAssignments, ...localAssignments].filter((entry) => {
        if (seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      }),
    );
    setSubmissions(
      submissionData.status === "fulfilled" ? submissionData.value.submissions.filter((entry) => entry.studentId === studentId) : [],
    );
  }, [studentId]);

  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const enrolledCourseIds = useMemo(() => new Set(enrollments.map((entry) => entry.courseId)), [enrollments]);
  const myAssignments = useMemo(
    () => assignments.filter((entry) => enrolledCourseIds.has(entry.courseId)),
    [assignments, enrolledCourseIds],
  );

  useEffect(() => {
    setAssignmentId((current) => current || myAssignments[0]?.id || "");
  }, [myAssignments]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
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
          feedback: answer || undefined,
        }),
      });
      await load();
      setAnswer("");
      setNotice("Assignment submitted successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit assignment.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Inmate - Assignments" userName={displayName}>
      <section className="grid-2">
        <article className="panel">
          <h2 className="section-title">Submit Assignment</h2>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            <label>
              Assignment
              <select className="select" value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)} required>
                {myAssignments.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Answer / Notes
              <textarea
                className="textarea"
                rows={4}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Write your response summary"
              />
            </label>
            <button className="button-primary" type="submit" disabled={busy || !assignmentId}>
              {busy ? "Submitting..." : "Submit"}
            </button>
          </form>
          {notice ? <p className="status-ok">{notice}</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}
        </article>

        <article className="panel">
          <h2 className="section-title">My Assignment Queue</h2>
          <DataTable
            rows={myAssignments}
            columns={[
              { key: "title", header: "Title", render: (row) => row.title },
              { key: "course", header: "Course ID", render: (row) => row.courseId },
              { key: "due", header: "Due", render: (row) => (row.dueAt ? formatDateTime(row.dueAt) : "-") },
              { key: "mode", header: "Mode", render: (row) => row.gradingMode ?? "manual" },
              {
                key: "document",
                header: "Document",
                render: (row) =>
                  row.attachmentPath || row.attachmentDataUrl ? (
                    <a className="button-soft" href={row.attachmentDataUrl ?? `/api/v1/assignments/${row.id}/download`} download={row.attachmentFileName ?? undefined}>
                      Download
                    </a>
                  ) : (
                    "None"
                  ),
              },
            ]}
            emptyLabel="No assignments in your enrolled courses."
          />
        </article>
      </section>

      <section className="panel">
        <h2 className="section-title">My Submission History</h2>
        <DataTable
          rows={submissions}
          columns={[
            {
              key: "assignment",
              header: "Assignment",
              render: (row) => myAssignments.find((entry) => entry.id === row.assignmentId)?.title ?? row.assignmentId,
            },
            { key: "submittedAt", header: "Submitted At", render: (row) => formatDateTime(row.submittedAt) },
            { key: "score", header: "Score", render: (row) => (typeof row.score === "number" ? `${row.score}%` : "Pending") },
            { key: "feedback", header: "Feedback", render: (row) => row.feedback ?? "-" },
          ]}
          emptyLabel="No submissions recorded yet."
        />
      </section>
    </RoleShell>
  );
}
