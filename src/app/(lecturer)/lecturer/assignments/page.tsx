"use client";

import { FormEvent, useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { listPrototypeAssignments, readFileAsDataUrl, savePrototypeAssignment } from "@/lib/browser-prototype-store";
import { RoleShell } from "@/components/role-shell";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";

interface CourseRecord {
  id: string;
  title: string;
}

interface AssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  dueAt?: string;
  gradingMode?: "manual" | "auto";
  answerKey?: string;
  createdBy?: string;
  attachmentFileName?: string;
  attachmentMimeType?: string;
  attachmentSizeBytes?: number;
  attachmentPath?: string;
  attachmentDataUrl?: string;
  createdAt: string;
}

function mergeAssignments(primary: AssignmentRecord[], fallback: AssignmentRecord[]) {
  const seen = new Set<string>();
  const next: AssignmentRecord[] = [];
  for (const item of [...primary, ...fallback]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

export default function LecturerAssignmentsPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [gradingMode, setGradingMode] = useState<"manual" | "auto">("manual");
  const [answerKey, setAnswerKey] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [courseData, assignmentData] = await Promise.allSettled([
      fetchApi<{ courses: CourseRecord[] }>("/api/v1/courses"),
      fetchApi<{ assignments: AssignmentRecord[] }>("/api/v1/assignments"),
    ]);
    const resolvedCourses = courseData.status === "fulfilled" ? courseData.value.courses : [];
    const resolvedAssignments = assignmentData.status === "fulfilled" ? assignmentData.value.assignments : [];
    setCourses(resolvedCourses);
    setAssignments(mergeAssignments(resolvedAssignments, listPrototypeAssignments()));
    setCourseId((current) => current || resolvedCourses[0]?.id || "");
  }

  useEffect(() => {
    void load().catch(() => undefined);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("courseId", courseId);
      formData.set("title", title);
      if (dueAt) {
        formData.set("dueAt", dueAt);
      }
      formData.set("gradingMode", gradingMode);
      if (gradingMode === "auto" && answerKey) {
        formData.set("answerKey", answerKey);
      }
      if (attachmentFile) {
        formData.set("attachment", attachmentFile);
      }

      await fetchApi<{ assignment: AssignmentRecord }>("/api/v1/assignments", {
        method: "POST",
        body: formData,
      });
      await load();
      setTitle("");
      setDueAt("");
      setAnswerKey("");
      setAttachmentFile(null);
      setNotice("Assignment created.");
    } catch (err) {
      try {
        const localAttachment = attachmentFile ? await readFileAsDataUrl(attachmentFile) : undefined;
        savePrototypeAssignment({
          id: `local-assignment-${Date.now()}`,
          courseId,
          title,
          dueAt: dueAt || undefined,
          gradingMode,
          answerKey: gradingMode === "auto" ? answerKey : undefined,
          createdBy: "Samuel Appiah",
          attachmentFileName: attachmentFile?.name,
          attachmentMimeType: attachmentFile?.type || undefined,
          attachmentSizeBytes: attachmentFile?.size,
          attachmentPath: attachmentFile ? "" : undefined,
          attachmentDataUrl: localAttachment,
          createdAt: new Date().toISOString(),
        });
        await load();
        setTitle("");
        setDueAt("");
        setAnswerKey("");
        setAttachmentFile(null);
        setNotice("Assignment created locally for this browser session.");
        setError(null);
      } catch {
        setError(err instanceof Error ? err.message : "Unable to create assignment.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Lecturer - Assignment Builder" userName="Samuel Appiah">
      <section className="grid-2">
        <article className="panel">
          <h2 className="section-title">Create Assignment</h2>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            <label>
              Course
              <select className="select" value={courseId} onChange={(event) => setCourseId(event.target.value)} required>
                {courses.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Title
              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>
            <label>
              Due Date
              <input className="input" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
            </label>
            <label>
              Grading Mode
              <select className="select" value={gradingMode} onChange={(event) => setGradingMode(event.target.value as "manual" | "auto")}>
                <option value="manual">Manual</option>
                <option value="auto">Auto key</option>
              </select>
            </label>
            {gradingMode === "auto" ? (
              <label>
                Answer Key
                <textarea
                  className="textarea"
                  rows={3}
                  value={answerKey}
                  onChange={(event) => setAnswerKey(event.target.value)}
                  placeholder="Comma-separated or rubric format"
                />
              </label>
            ) : null}
            <label>
              Assignment Document
              <input
                className="input"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
              />
            </label>
            <button className="button-primary" type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Assignment"}
            </button>
          </form>
          {notice ? <p className="status-ok">{notice}</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}
        </article>

        <article className="panel">
          <h2 className="section-title">Instruction</h2>
          <p className="quick-info">
            Use manual mode for essay/practical tasks. Use auto-key for objective assessments where scoring can be
            pre-defined.
          </p>
        </article>
      </section>

      <section className="panel">
        <h2 className="section-title">Assignment Queue</h2>
        <DataTable
          rows={assignments}
          columns={[
            { key: "title", header: "Title", render: (row) => row.title },
            { key: "course", header: "Course ID", render: (row) => row.courseId },
            { key: "mode", header: "Grading", render: (row) => row.gradingMode ?? "manual" },
            {
              key: "attachment",
              header: "Attachment",
              render: (row) =>
                row.attachmentPath || row.attachmentDataUrl ? (
                  <a className="button-soft" href={row.attachmentDataUrl ?? `/api/v1/assignments/${row.id}/download`} download={row.attachmentFileName ?? undefined}>
                    Download
                  </a>
                ) : (
                  "None"
                ),
            },
            { key: "due", header: "Due", render: (row) => (row.dueAt ? formatDateTime(row.dueAt) : "-") },
            { key: "created", header: "Created", render: (row) => formatDateTime(row.createdAt) },
          ]}
          emptyLabel="No assignments created."
        />
      </section>
    </RoleShell>
  );
}
