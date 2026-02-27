"use client";

import { FormEvent, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import {
  addAuditEvent,
  addOrUpdateCourse,
  getCoursesState,
  getEnrollmentsState,
} from "@/lib/portal-state";
import { appMeta, courseCategories } from "@/lib/seed-data";
import type { Course } from "@/types/domain";

function buildCourseId(existing: Course[]): string {
  const maxId = existing.reduce((max, item) => {
    const value = Number(item.id.replace("C-", ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  return `C-${String(maxId + 1).padStart(3, "0")}`;
}

export default function CourseManagementPage() {
  const [courses, setCourses] = useState(getCoursesState);
  const [enrollments] = useState(getEnrollmentsState);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(courseCategories[0]);
  const [instructor, setInstructor] = useState("Mr. Johnson");
  const [rating, setRating] = useState("4.5");
  const [notice, setNotice] = useState<string | null>(null);

  const enrolledByCourse = useMemo(() => {
    const grouped = new Map<string, number>();

    for (const enrollment of enrollments) {
      grouped.set(enrollment.courseId, (grouped.get(enrollment.courseId) ?? 0) + 1);
    }

    return grouped;
  }, [enrollments]);

  function handleCreateCourse(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    const nextCourse: Course = {
      id: buildCourseId(courses),
      title: title.trim(),
      category,
      instructor: instructor.trim(),
      rating: Number(rating) || 0,
      thumbnail: "Local course asset",
    };

    const next = addOrUpdateCourse(nextCourse);
    setCourses(next);
    setTitle("");
    setInstructor("Mr. Johnson");
    setRating("4.5");
    setNotice(`Course ${nextCourse.title} created as ${nextCourse.id}.`);

    addAuditEvent({
      action: "course-created",
      actor: "Admin Officer",
      result: "success",
      target: nextCourse.id,
      details: nextCourse.title,
    });
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Course Management" userName="Admin Officer">
      <section className="grid-3">
        <StatCard label="Total Courses" value={courses.length} helper="Locally managed catalog" />
        <StatCard label="Total Enrollments" value={enrollments.length} helper="Across inmate profiles" />
        <StatCard
          label="Avg Course Rating"
          value={(courses.reduce((sum, item) => sum + item.rating, 0) / Math.max(1, courses.length)).toFixed(1)}
          helper="Instructor scored"
        />
      </section>

      <section className="panel">
        <h2 className="section-title">Create Course</h2>
        <form className="grid-2" onSubmit={handleCreateCourse}>
          <label>
            Course Title
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>

          <label>
            Category
            <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
              {courseCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label>
            Instructor
            <input className="input" value={instructor} onChange={(event) => setInstructor(event.target.value)} required />
          </label>

          <label>
            Rating
            <input
              className="input"
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
              required
            />
          </label>

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button className="button-primary" type="submit">
              Save Course
            </button>
          </div>
        </form>
        {notice ? <p className="status-ok" style={{ marginTop: 12 }}>{notice}</p> : null}
      </section>

      <section className="panel">
        <h2 className="section-title">Course Catalog</h2>
        <DataTable
          rows={courses}
          columns={[
            { key: "id", header: "Course ID", render: (row) => row.id },
            { key: "title", header: "Title", render: (row) => row.title },
            { key: "category", header: "Category", render: (row) => row.category },
            { key: "instructor", header: "Instructor", render: (row) => row.instructor },
            { key: "rating", header: "Rating", render: (row) => row.rating.toFixed(1) },
            {
              key: "enrolled",
              header: "Enrolled",
              render: (row) => enrolledByCourse.get(row.id) ?? 0,
            },
          ]}
        />
      </section>
    </RoleShell>
  );
}
