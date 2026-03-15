"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { getCourseBlueprint, getCoursesState } from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";

export default function PublicCoursePreviewPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = decodeURIComponent(params.courseId);
  const [courses] = useState(getCoursesState);

  const course = useMemo(() => courses.find((entry) => entry.id === courseId), [courseId, courses]);
  const curriculum = useMemo(() => (course ? getCourseBlueprint(course.id) : null), [course]);

  if (!course) {
    return (
      <div className="portal-root portal-root-public access-root">
        <main className="portal-content" style={{ paddingTop: 40 }}>
          <section className="panel" style={{ maxWidth: 960, margin: "0 auto" }}>
            <h1 className="section-title">Course Not Found</h1>
            <p className="quick-info">The selected course is not available in the current public catalog.</p>
            <div className="inline-row" style={{ justifyContent: "flex-start" }}>
              <Link href="/landing" className="button-soft">
                Back to Landing
              </Link>
              <Link href="/auth/inmate-login?next=%2Finmate%2Fdashboard" className="button-primary">
                Inmate Login
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const loginHref = `/auth/inmate-login?next=${encodeURIComponent(`/inmate/courses/${course.id}`)}`;

  return (
    <div className="portal-root portal-root-public access-root">
      <header className="access-doc-topbar">
        <div className="access-doc-brand">
          <BrandLogo size={68} priority />
          <p>{appMeta.name}</p>
        </div>
      </header>

      <main className="portal-content access-doc-content">
        <section className="panel" style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}>
          <div className="inline-row" style={{ marginBottom: 16 }}>
            <div>
              <p className="role-context-eyebrow" style={{ marginBottom: 4 }}>
                Public Course Preview
              </p>
              <h1 style={{ marginBottom: 4 }}>{course.title}</h1>
              <p className="quick-info" style={{ margin: 0 }}>
                {course.category} | {course.level ?? "Beginner"} | {course.durationHours ?? 0} hours | {course.instructor}
              </p>
            </div>
            <div className="inline-row">
              <Link href="/landing" className="button-soft">
                Back to Landing
              </Link>
              <Link href={loginHref} className="button-primary">
                Enroll
              </Link>
            </div>
          </div>

          <div className="grid-2">
            <article className="panel" style={{ padding: 16 }}>
              <h2 className="section-title">Course Overview</h2>
              <p>{course.summary ?? "Structured learning pathway available offline for inmate learners."}</p>
              <div className="inline-row" style={{ justifyContent: "flex-start", marginTop: 12 }}>
                <span className="metric-pill">{`Rating: ${course.rating.toFixed(1)}`}</span>
                <span className="metric-pill">{`Duration: ${course.durationHours ?? 0} hrs`}</span>
                <span className="metric-pill">{`Status: ${(course.status ?? "active").toUpperCase()}`}</span>
              </div>
            </article>

            <article className="panel" style={{ padding: 0, overflow: "hidden", minHeight: 280 }}>
              <div style={{ position: "relative", minHeight: 280 }}>
                <Image
                  src={course.thumbnail}
                  alt={course.title}
                  fill
                  sizes="(max-width: 900px) 100vw, 48vw"
                  style={{ objectFit: "cover" }}
                />
              </div>
            </article>
          </div>
        </section>

        <section className="panel" style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}>
          <div className="inline-row" style={{ marginBottom: 12 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              Course Breakdown
            </h2>
            <span className="quick-info">{curriculum?.modules.length ?? 0} module(s)</span>
          </div>

          {curriculum?.modules.length ? (
            <div className="builder-list">
              {curriculum.modules.map((module) => (
                <article key={module.id} className="builder-module">
                  <h3 style={{ marginBottom: 6 }}>{`${module.id} - ${module.title}`}</h3>
                  <p className="quick-info" style={{ marginTop: 0 }}>
                    {module.objective ?? "No module objective provided."}
                  </p>
                  {module.lessons.length ? (
                    <ul className="builder-lesson-list">
                      {module.lessons.map((lesson) => (
                        <li key={lesson.id} className="builder-lesson">
                          <div>
                            <strong>{`${lesson.id} - ${lesson.title}`}</strong>
                            <p className="quick-info" style={{ margin: "4px 0 0" }}>
                              {`${lesson.type} | ${lesson.durationMinutes} min`}
                            </p>
                            {lesson.notes ? (
                              <p className="quick-info" style={{ margin: "4px 0 0" }}>
                                {lesson.notes}
                              </p>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="quick-info">This module currently has no lessons.</p>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="quick-info">Curriculum details are being prepared for this course.</p>
          )}
        </section>
      </main>
    </div>
  );
}
