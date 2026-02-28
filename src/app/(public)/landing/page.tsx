import Link from "next/link";
import Image from "next/image";
import { adminStats, appMeta, courseCategories, topRatedCourses } from "@/lib/seed-data";
import { SecurityBadge } from "@/components/security-badge";
import { CourseCard } from "@/components/course-card";
import { BrandLogo } from "@/components/brand-logo";
import { LandingHeroSlider } from "@/components/landing-hero-slider";

const categoryDetails: Record<string, { icon: string; description: string; courses: number }> = {
  "IT & Digital Skills": { icon: "💻", description: "Core digital literacy and productivity software.", courses: 18 },
  Languages: { icon: "💬", description: "Communication, reading, and spoken language confidence.", courses: 13 },
  Management: { icon: "💼", description: "Leadership, planning, and team coordination modules.", courses: 9 },
  "Technical & Vocational": { icon: "🛠", description: "Hands-on trade skills for employability.", courses: 22 },
  "Personal Development": { icon: "🧠", description: "Mindset, discipline, and life-skills training.", courses: 11 },
  "Sales & Marketing": { icon: "📣", description: "Business communication and practical selling skills.", courses: 8 },
};

const journeyCards = [
  {
    title: "Digital Foundations Pathway",
    summary: "Computer literacy, online safety, and documentation skills for modern workplaces.",
    imageSrc: "/assets/education/course-computer.jpg",
  },
  {
    title: "Vocational Readiness Pathway",
    summary: "Carpentry, practical projects, and entrepreneurship for post-release opportunities.",
    imageSrc: "/assets/education/course-carpentry.jpg",
  },
  {
    title: "Business & Leadership Pathway",
    summary: "Management and communication modules that support reintegration and mentorship.",
    imageSrc: "/assets/education/course-management.jpg",
  },
];

const workflowSteps = [
  {
    title: "1. Register and Enroll Biometrics",
    detail: "Admin captures inmate profile, face image, fingerprint, and activates learning account.",
  },
  {
    title: "2. Facility Entry Verification",
    detail: "Inmate completes supervised biometric check before entering the learning facility.",
  },
  {
    title: "3. Device and LMS Access",
    detail: "Assigned desktop, laptop, or tablet opens the local LMS with secure role-based access.",
  },
  {
    title: "4. Learning and Assessments",
    detail: "Courses, lessons, assessments, and progress are tracked for measurable outcomes.",
  },
  {
    title: "5. Monitoring and Planning",
    detail: "Admin and management dashboards provide attendance, performance, and predictive insights.",
  },
];

const heroSlides = [
  {
    id: "slide-classroom",
    title: "Secure Learning Sessions That Build Real-World Skills",
    eyebrow: "Premium Offline Learning Experience",
    description:
      "Instructor-led and self-paced tracks are delivered in a secure, structured environment designed for measurable rehabilitation progress.",
    imageSrc: "/assets/education/hero-learning.jpg",
    primaryCtaLabel: "Launch Admin Workspace",
    primaryCtaHref: "/admin-login?next=%2Fadmin%2Fdashboard",
  },
  {
    id: "slide-library",
    title: "Focused Study, Stronger Outcomes",
    eyebrow: "Guided Independent Learning",
    description:
      "Learners continue modules, complete assessments, and track progress while maintaining strict identity and facility controls.",
    imageSrc: "/assets/education/hero-library.jpg",
    primaryCtaLabel: "Continue as Inmate",
    primaryCtaHref: "/verify-identity?next=%2Finmate%2Fdashboard",
  },
  {
    id: "slide-vocational",
    title: "Vocational and Entrepreneurship Pathways",
    eyebrow: "Career-Ready Rehabilitation",
    description:
      "Hands-on vocational courses and business fundamentals equip learners for reintegration and post-release employability.",
    imageSrc: "/assets/education/course-carpentry.jpg",
    primaryCtaLabel: "Explore Learning Paths",
    primaryCtaHref: "/inmate/courses",
  },
];

export default function LandingPage() {
  return (
    <div className="portal-root portal-root-public">
      <header className="landing-topbar">
        <div className="landing-topbar-brand">
          <BrandLogo size={52} priority />
          <div>
            <p className="top-nav-title">{appMeta.name}</p>
            <p className="top-nav-subtitle">Education, dignity, and structured rehabilitation.</p>
          </div>
        </div>

        <nav className="landing-topbar-nav" aria-label="Landing sections">
          <Link href="/landing#portal-flow" className="landing-topbar-link">
            Portal Flow
          </Link>
          <Link href="/landing#categories" className="landing-topbar-link">
            Categories
          </Link>
          <Link href="/landing#pathways" className="landing-topbar-link">
            Pathways
          </Link>
          <Link href="/landing#courses" className="landing-topbar-link">
            Courses
          </Link>
        </nav>

        <div className="landing-topbar-actions">
          <SecurityBadge label="Offline Mode" />
          <SecurityBadge label="Local Secure Server" />
          <details className="landing-login-menu">
            <summary>Login</summary>
            <div className="landing-login-dropdown">
              <Link href="/admin-login?next=%2Fadmin%2Fdashboard">Admin Workspace</Link>
              <Link href="/verify-identity?next=%2Finmate%2Fdashboard">Inmate Access</Link>
              <Link href="/admin-login?next=%2Fmanagement%2Fdashboard">Management View</Link>
            </div>
          </details>
        </div>
      </header>

      <main className="portal-content landing-content">
        <section className="panel landing-premium-hero">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">Offline-first rehabilitation learning platform</p>
            <h1>
              Education Today.
              <br />
              A Better Tomorrow.
            </h1>
            <p className="hero-caption">
              Delivering secure, structured learning for inmate rehabilitation, skill-building, and long-term
              reintegration outcomes.
            </p>
            <div className="landing-actions">
              <Link href="/admin-login?next=%2Fadmin%2Fdashboard" className="button-primary">
                Open Admin Workspace
              </Link>
              <Link href="/verify-identity?next=%2Finmate%2Fdashboard" className="button-soft">
                Continue as Inmate
              </Link>
            </div>
            <div className="landing-metric-grid">
              <article className="landing-metric-card">
                <p>Total Registered Learners</p>
                <strong>{adminStats.totalInmatesRegistered.toLocaleString()}</strong>
                <span>Across connected institutions</span>
              </article>
              <article className="landing-metric-card">
                <p>Active Learners</p>
                <strong>{adminStats.activeLearners.toLocaleString()}</strong>
                <span>Engaged in current course cycles</span>
              </article>
              <article className="landing-metric-card">
                <p>Certificates Issued</p>
                <strong>{adminStats.certificatesIssued.toLocaleString()}</strong>
                <span>Completion credentials delivered</span>
              </article>
            </div>
          </div>
          <LandingHeroSlider slides={heroSlides} />
        </section>

        <section className="panel" id="portal-flow">
          <div className="inline-row" style={{ marginBottom: 12 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              Seamless Portal Flow
            </h2>
            <Link href="/admin-login" className="button-soft">
              Start Session
            </Link>
          </div>
          <div className="landing-path-grid">
            <Link href="/admin-login?next=%2Fadmin%2Fdashboard" className="landing-path-card">
              <h3>Admin Operations</h3>
              <p>Register inmates, track attendance, manage courses, and issue certificates.</p>
              <span>Go to Admin Dashboard</span>
            </Link>
            <Link href="/verify-identity?next=%2Finmate%2Fdashboard" className="landing-path-card">
              <h3>Inmate Learning</h3>
              <p>Verify identity, continue courses, monitor goals, and download certificates.</p>
              <span>Go to Learner Dashboard</span>
            </Link>
            <Link href="/admin-login?next=%2Fmanagement%2Fdashboard" className="landing-path-card">
              <h3>Management Analytics</h3>
              <p>Review enrollment trends, completion rates, and facility-wide performance insights.</p>
              <span>Go to Management View</span>
            </Link>
          </div>
        </section>

        <section className="panel">
          <h2 className="section-title">End-to-End Learning Journey</h2>
          <div className="landing-workflow-grid">
            {workflowSteps.map((step) => (
              <article key={step.title} className="landing-workflow-step">
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel" id="categories">
          <h2 className="section-title">Course Categories</h2>
          <div className="grid-3 landing-categories">
            {courseCategories.map((category) => (
              <article key={category} className="category-card">
                <p className="category-icon">{categoryDetails[category]?.icon ?? "📘"}</p>
                <h3>{category}</h3>
                <p>{categoryDetails[category]?.description ?? "Structured learning modules available offline."}</p>
                <span className="category-meta">{categoryDetails[category]?.courses ?? 0} courses available</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel" id="pathways">
          <h2 className="section-title">Featured Learning Pathways</h2>
          <div className="landing-journey-grid">
            {journeyCards.map((journey) => (
              <article key={journey.title} className="landing-journey-card">
                <div className="landing-journey-image-wrap">
                  <Image
                    src={journey.imageSrc}
                    alt={journey.title}
                    fill
                    sizes="(max-width: 1100px) 100vw, 33vw"
                    className="landing-image"
                  />
                </div>
                <h3>{journey.title}</h3>
                <p>{journey.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel" id="courses">
          <div className="inline-row" style={{ marginBottom: 12 }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>
              Top Rated Courses
            </h2>
            <Link href="/inmate/courses" className="button-soft">
              Explore Courses
            </Link>
          </div>
          <div className="grid-4">
            {topRatedCourses.map((course) => (
              <CourseCard
                key={course.id}
                title={course.title}
                subtitle={course.instructor}
                progress={Math.round(course.rating * 20)}
                imageSrc={course.thumbnail}
              />
            ))}
          </div>
        </section>

        <section className="offline-banner">
          <span className="offline-lock" aria-hidden>
            🔒
          </span>
          <p>{appMeta.offlineLabel}</p>
        </section>
      </main>
    </div>
  );
}
