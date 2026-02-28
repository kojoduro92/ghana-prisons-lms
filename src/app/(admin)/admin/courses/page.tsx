"use client";

import { FormEvent, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { formatDateTime } from "@/lib/format";
import { addAuditEvent, addOrUpdateCourse, getCoursesState, getEnrollmentsState } from "@/lib/portal-state";
import { appMeta, courseCategories } from "@/lib/seed-data";
import type { Course } from "@/types/domain";

type CourseLevel = NonNullable<Course["level"]>;
type CourseStatus = NonNullable<Course["status"]>;

interface CourseFormState {
  title: string;
  category: string;
  instructor: string;
  rating: string;
  level: CourseLevel;
  durationHours: string;
  thumbnail: string;
  summary: string;
  status: CourseStatus;
}

const defaultCourseForm: CourseFormState = {
  title: "",
  category: courseCategories[0],
  instructor: "Mr. Johnson",
  rating: "4.5",
  level: "Beginner",
  durationHours: "20",
  thumbnail: "/assets/education/course-computer.jpg",
  summary: "",
  status: "active",
};

function buildCourseId(existing: Course[]): string {
  const maxId = existing.reduce((max, item) => {
    const value = Number(item.id.replace("C-", ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `C-${String(maxId + 1).padStart(3, "0")}`;
}

function courseStatusClass(status: CourseStatus): string {
  if (status === "active") return "status-ok";
  if (status === "archived") return "status-bad";
  return "status-neutral";
}

function formFromCourse(course: Course): CourseFormState {
  return {
    title: course.title,
    category: course.category,
    instructor: course.instructor,
    rating: String(course.rating),
    level: course.level ?? "Beginner",
    durationHours: String(course.durationHours ?? 20),
    thumbnail: course.thumbnail,
    summary: course.summary ?? "",
    status: course.status ?? "active",
  };
}

export default function CourseManagementPage() {
  const [courses, setCourses] = useState(getCoursesState);
  const [enrollments] = useState(getEnrollmentsState);
  const [form, setForm] = useState<CourseFormState>(defaultCourseForm);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | CourseStatus>("all");
  const [notice, setNotice] = useState<string | null>(null);

  const enrolledByCourse = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const enrollment of enrollments) {
      grouped.set(enrollment.courseId, (grouped.get(enrollment.courseId) ?? 0) + 1);
    }

    return grouped;
  }, [enrollments]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      const status = course.status ?? "active";
      const matchesQuery =
        course.id.toLowerCase().includes(query.toLowerCase()) ||
        course.title.toLowerCase().includes(query.toLowerCase()) ||
        course.instructor.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = categoryFilter === "all" ? true : course.category === categoryFilter;
      const matchesStatus = statusFilter === "all" ? true : status === statusFilter;
      return matchesQuery && matchesCategory && matchesStatus;
    });
  }, [categoryFilter, courses, query, statusFilter]);

  const activeCount = courses.filter((course) => (course.status ?? "active") === "active").length;
  const draftCount = courses.filter((course) => (course.status ?? "active") === "draft").length;
  const archivedCount = courses.filter((course) => (course.status ?? "active") === "archived").length;
  const avgDuration = Math.round(
    courses.reduce((sum, course) => sum + (course.durationHours ?? 0), 0) / Math.max(1, courses.length),
  );
  const mostEnrolled = useMemo(() => {
    const sorted = [...courses]
      .sort((left, right) => (enrolledByCourse.get(right.id) ?? 0) - (enrolledByCourse.get(left.id) ?? 0))
      .slice(0, 1);
    return sorted[0];
  }, [courses, enrolledByCourse]);

  function resetForm(): void {
    setForm(defaultCourseForm);
    setEditingCourseId(null);
  }

  function updateForm<K extends keyof CourseFormState>(key: K, value: CourseFormState[K]): void {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function handleCreateOrUpdateCourse(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const title = form.title.trim();
    const instructor = form.instructor.trim();
    const summary = form.summary.trim();

    if (!title || !instructor) {
      setNotice("Course title and instructor are required.");
      return;
    }

    const nextCourse: Course = {
      id: editingCourseId ?? buildCourseId(courses),
      title,
      category: form.category,
      instructor,
      rating: Number(form.rating) || 0,
      thumbnail: form.thumbnail.trim() || "/assets/education/course-computer.jpg",
      summary,
      level: form.level,
      durationHours: Number(form.durationHours) || 1,
      status: form.status,
    };

    const next = addOrUpdateCourse(nextCourse);
    setCourses(next);
    setNotice(
      editingCourseId
        ? `Course ${nextCourse.id} updated successfully.`
        : `Course ${nextCourse.title} created as ${nextCourse.id}.`,
    );
    addAuditEvent({
      action: "course-created",
      actor: "Admin Officer",
      result: "success",
      target: nextCourse.id,
      details: editingCourseId ? "Course metadata updated" : "New course created",
    });
    resetForm();
  }

  function handleEdit(course: Course): void {
    setEditingCourseId(course.id);
    setForm(formFromCourse(course));
    setNotice(`Editing ${course.id}.`);
  }

  function handleSetStatus(course: Course, nextStatus: CourseStatus): void {
    const next = addOrUpdateCourse({
      ...course,
      status: nextStatus,
    });
    setCourses(next);
    setNotice(`${course.id} moved to ${nextStatus}.`);
    addAuditEvent({
      action: "course-created",
      actor: "Admin Officer",
      result: "success",
      target: course.id,
      details: `Course status changed to ${nextStatus}`,
    });

    if (editingCourseId === course.id) {
      setForm((previous) => ({
        ...previous,
        status: nextStatus,
      }));
    }
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Course Management" userName="Admin Officer">
      <section className="grid-4">
        <StatCard label="Active Courses" value={activeCount} helper="Visible to inmate learning portal" />
        <StatCard label="Draft Courses" value={draftCount} helper="Pending publish or revision" />
        <StatCard label="Archived Courses" value={archivedCount} helper="Retained for reporting history" />
        <StatCard label="Average Course Length" value={`${avgDuration} hrs`} helper="Across current catalog" />
      </section>

      <section className="grid-3">
        <StatCard
          label="Total Enrollments"
          value={enrollments.length}
          helper={mostEnrolled ? `Highest demand: ${mostEnrolled.title}` : "No enrollment data"}
        />
        <StatCard
          label="Average Rating"
          value={(courses.reduce((sum, item) => sum + item.rating, 0) / Math.max(1, courses.length)).toFixed(1)}
          helper="Instructor and learner feedback"
        />
        <StatCard label="Catalog Size" value={courses.length} helper="Local secure course registry" />
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            {editingCourseId ? `Edit Course (${editingCourseId})` : "Create Course"}
          </h2>
          {editingCourseId ? (
            <button type="button" className="button-soft" onClick={resetForm}>
              Cancel Edit
            </button>
          ) : null}
        </div>

        <form className="grid-3" onSubmit={handleCreateOrUpdateCourse}>
          <label>
            Course Title
            <input className="input" value={form.title} onChange={(event) => updateForm("title", event.target.value)} required />
          </label>

          <label>
            Category
            <select className="select" value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
              {courseCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Instructor
            <input
              className="input"
              value={form.instructor}
              onChange={(event) => updateForm("instructor", event.target.value)}
              required
            />
          </label>

          <label>
            Rating
            <input
              className="input"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={form.rating}
              onChange={(event) => updateForm("rating", event.target.value)}
              required
            />
          </label>

          <label>
            Level
            <select
              className="select"
              value={form.level}
              onChange={(event) => updateForm("level", event.target.value as CourseLevel)}
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
              min="1"
              value={form.durationHours}
              onChange={(event) => updateForm("durationHours", event.target.value)}
              required
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Thumbnail Path
            <input
              className="input"
              value={form.thumbnail}
              onChange={(event) => updateForm("thumbnail", event.target.value)}
              placeholder="/assets/education/course-computer.jpg"
            />
          </label>

          <label style={{ gridColumn: "1 / -1" }}>
            Course Summary
            <textarea
              className="textarea"
              rows={3}
              value={form.summary}
              onChange={(event) => updateForm("summary", event.target.value)}
              placeholder="Briefly describe course outcomes and target learner profile."
            />
          </label>

          <label>
            Course Status
            <select
              className="select"
              value={form.status}
              onChange={(event) => updateForm("status", event.target.value as CourseStatus)}
            >
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="button-primary" type="submit">
              {editingCourseId ? "Save Changes" : "Create Course"}
            </button>
          </div>
        </form>

        {notice ? <p className="status-ok" style={{ marginTop: 12 }}>{notice}</p> : null}
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Course Catalog Operations
          </h2>
          <div className="inline-row">
            <input
              className="input"
              style={{ width: 220 }}
              placeholder="Search by ID, title, instructor"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <select className="select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {courseCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="select"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "all" | CourseStatus)}
            >
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <DataTable
          rows={filteredCourses}
          columns={[
            { key: "id", header: "Course ID", render: (row) => row.id },
            { key: "title", header: "Title", render: (row) => row.title },
            { key: "category", header: "Category", render: (row) => row.category },
            { key: "instructor", header: "Instructor", render: (row) => row.instructor },
            { key: "level", header: "Level", render: (row) => row.level ?? "Beginner" },
            { key: "duration", header: "Duration", render: (row) => `${row.durationHours ?? 0} hrs` },
            { key: "rating", header: "Rating", render: (row) => row.rating.toFixed(1) },
            {
              key: "status",
              header: "Status",
              render: (row) => <span className={courseStatusClass(row.status ?? "active")}>{row.status ?? "active"}</span>,
            },
            {
              key: "enrolled",
              header: "Enrolled",
              render: (row) => enrolledByCourse.get(row.id) ?? 0,
            },
            {
              key: "updated",
              header: "Updated",
              render: (row) => formatDateTime(row.updatedAt ?? ""),
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <div className="course-actions">
                  <button type="button" className="button-soft" onClick={() => handleEdit(row)}>
                    Edit
                  </button>
                  {(row.status ?? "active") === "draft" ? (
                    <button type="button" className="button-soft" onClick={() => handleSetStatus(row, "active")}>
                      Publish
                    </button>
                  ) : null}
                  {(row.status ?? "active") === "archived" ? (
                    <button type="button" className="button-soft" onClick={() => handleSetStatus(row, "active")}>
                      Restore
                    </button>
                  ) : (
                    <button type="button" className="button-soft" onClick={() => handleSetStatus(row, "archived")}>
                      Archive
                    </button>
                  )}
                </div>
              ),
            },
          ]}
          emptyLabel="No courses found for current filters."
        />
      </section>
    </RoleShell>
  );
}
