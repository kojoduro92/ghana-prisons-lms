import Link from "next/link";
import { appMeta, courseCategories, topRatedCourses } from "@/lib/seed-data";
import { SecurityBadge } from "@/components/security-badge";
import { CourseCard } from "@/components/course-card";

export default function LandingPage() {
  return (
    <div className="portal-root">
      <div className="top-nav">
        <div className="inline-row" style={{ gap: 12 }}>
          <div className="logo-pill">GP</div>
          <div>
            <p className="top-nav-title">{appMeta.name}</p>
            <p className="top-nav-subtitle">Education, dignity, and structured rehabilitation.</p>
          </div>
        </div>
        <div className="top-nav-right">
          <SecurityBadge label="Offline Mode" />
          <SecurityBadge label="Local Secure Server" />
        </div>
      </div>

      <main className="portal-content" style={{ maxWidth: 1120 }}>
        <section className="hero">
          <h1>
            Education Today.
            <br />
            A Better Tomorrow.
          </h1>
        </section>

        <section className="panel">
          <h2 className="section-title">Course Categories</h2>
          <div className="grid-3">
            {courseCategories.map((category) => (
              <article key={category} className="panel" style={{ padding: 14 }}>
                <h3 style={{ fontSize: "1.05rem" }}>{category}</h3>
                <p className="quick-info">Structured learning modules available offline.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">Top Rated Courses</h2>
          <div className="grid-4">
            {topRatedCourses.map((course) => (
              <CourseCard key={course.id} title={course.title} subtitle={course.instructor} progress={Math.round(course.rating * 20)} />
            ))}
          </div>
        </section>

        <p className="quick-info" style={{ textAlign: "center" }}>
          {appMeta.offlineLabel}
        </p>
      </main>

      <div className="cta-float">
        <Link href="/admin-login" className="button-primary">
          Login
        </Link>
      </div>
    </div>
  );
}
