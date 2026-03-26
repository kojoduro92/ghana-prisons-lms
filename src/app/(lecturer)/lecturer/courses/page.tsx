"use client";

import { FormEvent, useEffect, useState } from "react";
import type { CourseMaterialRecord } from "@/types/domain";
import { DataTable } from "@/components/data-table";
import { listPrototypeCourseMaterials, readFileAsDataUrl, savePrototypeCourseMaterial } from "@/lib/browser-prototype-store";
import { RoleShell } from "@/components/role-shell";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";

interface CourseRecord {
  id: string;
  title: string;
  category: string;
  instructor: string;
  rating: number;
  thumbnail: string;
  summary?: string;
  level?: "Beginner" | "Intermediate" | "Advanced";
  durationHours?: number;
  status?: "active" | "draft" | "archived";
  updatedAt?: string;
}

function inferMaterialKind(fileName: string): CourseMaterialRecord["kind"] {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".mp4")) return "video";
  if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) return "spreadsheet";
  if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) return "presentation";
  return "document";
}

function mergeMaterials(primary: CourseMaterialRecord[], fallback: CourseMaterialRecord[]) {
  const seen = new Set<string>();
  const next: CourseMaterialRecord[] = [];
  for (const item of [...primary, ...fallback]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

export default function LecturerCoursesPage() {
  const [courses, setCourses] = useState<CourseRecord[]>([]);
  const [materials, setMaterials] = useState<CourseMaterialRecord[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("IT & Digital Skills");
  const [summary, setSummary] = useState("");
  const [level, setLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");
  const [durationHours, setDurationHours] = useState("20");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialFile, setMaterialFile] = useState<File | null>(null);

  async function loadCourses() {
    const data = await fetchApi<{ courses: CourseRecord[] }>("/api/v1/courses");
    setCourses(data.courses);
    setSelectedCourseId((current) => current || data.courses[0]?.id || "");
  }

  async function loadMaterials(courseId: string) {
    if (!courseId) {
      setMaterials([]);
      return;
    }
    try {
      const data = await fetchApi<{ materials: CourseMaterialRecord[] }>(`/api/v1/course-materials?courseId=${encodeURIComponent(courseId)}`);
      setMaterials(mergeMaterials(data.materials, listPrototypeCourseMaterials(courseId)));
    } catch {
      setMaterials(listPrototypeCourseMaterials(courseId));
    }
  }

  useEffect(() => {
    void loadCourses().catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadMaterials(selectedCourseId).catch(() => undefined);
  }, [selectedCourseId]);

  async function handleCreateCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const id = `C-${String(Date.now()).slice(-6)}`;
      await fetchApi<{ course: CourseRecord }>("/api/v1/courses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          title,
          category,
          instructor: "Samuel Appiah",
          rating: 4.5,
          thumbnail: "/assets/education/course-computer.jpg",
          summary,
          level,
          durationHours: Number(durationHours),
          status: "active",
        }),
      });
      await loadCourses();
      setNotice("Course created successfully.");
      setTitle("");
      setSummary("");
      setDurationHours("20");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create course.");
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadMaterial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCourseId || !materialFile) {
      setError("Select a course and file before uploading.");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const formData = new FormData();
      formData.set("courseId", selectedCourseId);
      formData.set("title", materialTitle.trim() || materialFile.name);
      formData.set("file", materialFile);

      await fetchApi<{ material: CourseMaterialRecord }>("/api/v1/course-materials", {
        method: "POST",
        body: formData,
      });
      await loadMaterials(selectedCourseId);
      setMaterialTitle("");
      setMaterialFile(null);
      setNotice("Course material uploaded successfully.");
    } catch (err) {
      try {
        const localFile = materialFile;
        const downloadUrl = await readFileAsDataUrl(localFile);
        savePrototypeCourseMaterial({
          id: `local-material-${Date.now()}`,
          courseId: selectedCourseId,
          title: materialTitle.trim() || localFile.name,
          kind: inferMaterialKind(localFile.name),
          mimeType: localFile.type || "application/octet-stream",
          fileName: localFile.name,
          fileSizeBytes: localFile.size,
          storagePath: "",
          downloadUrl,
          uploadedBy: "Samuel Appiah",
          createdAt: new Date().toISOString(),
        });
        await loadMaterials(selectedCourseId);
        setMaterialTitle("");
        setMaterialFile(null);
        setNotice("Course material uploaded locally for this browser session.");
        setError(null);
      } catch {
        setError(err instanceof Error ? err.message : "Unable to upload course material.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Lecturer - Course Management" userName="Samuel Appiah">
      <section className="grid-2">
        <article className="panel">
          <h2 className="section-title">Create New Course</h2>
          <form onSubmit={handleCreateCourse} style={{ display: "grid", gap: 10 }}>
            <label>
              Course Title
              <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
            </label>
            <label>
              Category
              <input className="input" value={category} onChange={(event) => setCategory(event.target.value)} required />
            </label>
            <label>
              Summary
              <textarea className="textarea" rows={3} value={summary} onChange={(event) => setSummary(event.target.value)} />
            </label>
            <div className="grid-2">
              <label>
                Level
                <select
                  className="select"
                  value={level}
                  onChange={(event) => setLevel(event.target.value as "Beginner" | "Intermediate" | "Advanced")}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </label>
              <label>
                Duration (hours)
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={durationHours}
                  onChange={(event) => setDurationHours(event.target.value)}
                />
              </label>
            </div>
            <button className="button-primary" type="submit" disabled={busy}>
              {busy ? "Saving..." : "Create Course"}
            </button>
          </form>
          {notice ? <p className="status-ok">{notice}</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}
        </article>

        <article className="panel">
          <h2 className="section-title">Upload Course Material</h2>
          <form onSubmit={handleUploadMaterial} style={{ display: "grid", gap: 10 }}>
            <label>
              Course
              <select className="select" value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)} required>
                {courses.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Material Title
              <input
                className="input"
                value={materialTitle}
                onChange={(event) => setMaterialTitle(event.target.value)}
                placeholder="Defaults to uploaded file name"
              />
            </label>
            <label>
              Upload File
              <input
                className="input"
                type="file"
                accept=".mp4,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                onChange={(event) => setMaterialFile(event.target.files?.[0] ?? null)}
                required
              />
            </label>
            <button className="button-primary" type="submit" disabled={busy || !selectedCourseId || !materialFile}>
              {busy ? "Uploading..." : "Upload Material"}
            </button>
          </form>
          <p className="quick-info" style={{ marginTop: 12 }}>
            Upload videos, Word files, PDFs, Excel sheets, or PowerPoint course content for inmate access.
          </p>
        </article>
      </section>

      <section className="panel">
        <h2 className="section-title">Course Catalog</h2>
        <DataTable
          rows={courses}
          columns={[
            { key: "id", header: "Course ID", render: (row) => row.id },
            { key: "title", header: "Title", render: (row) => row.title },
            { key: "category", header: "Category", render: (row) => row.category },
            { key: "level", header: "Level", render: (row) => row.level ?? "-" },
            { key: "duration", header: "Hours", render: (row) => row.durationHours ?? "-" },
            { key: "updated", header: "Updated", render: (row) => (row.updatedAt ? formatDateTime(row.updatedAt) : "-") },
          ]}
          emptyLabel="No courses available."
        />
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Uploaded Course Materials
          </h2>
          <span className="quick-info">
            {selectedCourseId ? `Active course: ${selectedCourseId}` : "Select a course to review uploads"}
          </span>
        </div>
        <DataTable
          rows={materials}
          columns={[
            { key: "title", header: "Title", render: (row) => row.title },
            { key: "kind", header: "Type", render: (row) => row.kind },
            { key: "file", header: "File", render: (row) => row.fileName },
            { key: "size", header: "Size", render: (row) => `${Math.max(1, Math.round(row.fileSizeBytes / 1024))} KB` },
            { key: "uploaded", header: "Uploaded", render: (row) => formatDateTime(row.createdAt) },
            {
              key: "download",
              header: "Download",
              render: (row) => (
                <a className="button-soft" href={row.downloadUrl ?? `/api/v1/course-materials/${row.id}/download`} download={row.fileName}>
                  Download
                </a>
              ),
            },
          ]}
          emptyLabel="No materials uploaded for this course yet."
        />
      </section>
    </RoleShell>
  );
}
