"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { topRatedCourses } from "@/lib/seed-data";
import { InmateLandingSlider, type InmateLandingSlide } from "@/components/inmate-landing-slider";

const categories = [
  {
    label: "IT & Digital Skills",
    icon: "digital",
    desc: "Digital tools, computing, design, analytics, and practical technology courses.",
  },
  {
    label: "Languages",
    icon: "language",
    desc: "Speaking, writing, reading, and communication pathways for personal growth.",
  },
  {
    label: "Management",
    icon: "management",
    desc: "Time, money, law, hygiene, and first-aid foundations for daily leadership.",
  },
  {
    label: "Technical & Vocational",
    icon: "vocational",
    desc: "Hands-on trade and production courses for practical rehabilitation outcomes.",
  },
] as const;

const heroSlides: InmateLandingSlide[] = [
  {
    id: "skills",
    eyebrow: "Digital Learning",
    title: "Learn Today, Build New Skills for Tomorrow",
    description: "Structured learning programs designed for rehabilitation, growth, and practical outcomes.",
    imageSrc: "/assets/education/hero-learning.jpg",
    ctaLabel: "Login To Continue",
    ctaHref: "/auth/inmate-login?next=%2Finmate%2Fdashboard",
  },
  {
    id: "library",
    eyebrow: "Guided Lessons",
    title: "Attend Classes, Track Progress, Earn Certificates",
    description: "Study plans, assignments, and certificate-ready course tracks are available in one place.",
    imageSrc: "/assets/education/hero-library.jpg",
    ctaLabel: "Open Inmate Login",
    ctaHref: "/auth/inmate-login?next=%2Finmate%2Fdashboard",
  },
  {
    id: "workshop",
    eyebrow: "Vocational Paths",
    title: "Practical Training for Real-World Employment",
    description: "Explore technical and vocational courses that build confidence for post-release opportunities.",
    imageSrc: "/assets/education/course-carpentry.jpg",
    ctaLabel: "Start Learning",
    ctaHref: "/auth/inmate-login?next=%2Finmate%2Fdashboard",
  },
];

function CategoryIcon({ type }: { type: (typeof categories)[number]["icon"] }) {
  if (type === "digital") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 6h16v10H4V6Zm2 2v6h12V8H6Zm-3 10h18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "language") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3a8 8 0 1 0 0 18M4.5 9.5h15M4.5 14.5h15M12 3c2.5 2.3 3.8 5.1 3.8 9S14.5 18.7 12 21M12 3C9.5 5.3 8.2 8.1 8.2 12s1.3 6.7 3.8 9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "management") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 7a3 3 0 1 0 0-.001M5 19v-1.1c0-2.2 2.4-4 5.4-4h3.2c3 0 5.4 1.8 5.4 4V19M18.5 8.5a2 2 0 1 0 0-.001M2.5 18.5v-.6c0-1.4 1.1-2.6 2.7-3.2M5.5 8.5a2 2 0 1 1 0-.001M21.5 18.5v-.6c0-1.4-1.1-2.6-2.7-3.2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 18h16M6 18V8l6-3 6 3v10M9 12h6M9 15h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function LandingPage() {
  const [selectedCategory, setSelectedCategory] = useState<(typeof categories)[number]["label"]>(categories[0].label);
  const selectedCategoryConfig = categories.find((category) => category.label === selectedCategory) ?? categories[0];
  const visibleCourses = topRatedCourses.filter((course) => course.category === selectedCategory);

  return (
    <div className="portal-root portal-root-public inmate-landing-v2-root">
      <main className="inmate-landing-v2-main">
        <header className="inmate-landing-v2-header">
          <div className="inmate-landing-v2-brand">
            <BrandLogo size={52} priority />
            <div>
              <h1>Ghana Prisons Learning Portal</h1>
              <p>Inmate Learning Access</p>
            </div>
          </div>
          <Link href="/auth/inmate-login?next=%2Finmate%2Fdashboard" className="button-primary inmate-landing-v2-login">
            Inmate Login
          </Link>
        </header>

        <InmateLandingSlider slides={heroSlides} />

        <section className="inmate-landing-v2-section">
          <div className="inmate-landing-v2-section-head">
            <h2>Course Categories</h2>
            <span>Click a category to view all courses</span>
          </div>
          <div className="inmate-landing-v2-categories">
            {categories.map((category) => {
              const isActive = selectedCategory === category.label;
              const count = topRatedCourses.filter((course) => course.category === category.label).length;
              return (
                <button
                  key={category.label}
                  type="button"
                  className={isActive ? "inmate-landing-v2-category-card is-active" : "inmate-landing-v2-category-card"}
                  onClick={() => setSelectedCategory(category.label)}
                >
                  <span className="inmate-landing-v2-category-icon">
                    <CategoryIcon type={category.icon} />
                  </span>
                  <h3>{category.label}</h3>
                  <p>{category.desc}</p>
                  <strong>{count} courses</strong>
                </button>
              );
            })}
          </div>
        </section>

        <section className="inmate-landing-v2-section">
          <div className="inmate-landing-v2-section-head">
            <div>
              <h2>{selectedCategoryConfig.label}</h2>
              <span>{selectedCategoryConfig.desc}</span>
            </div>
            <span>{visibleCourses.length} available course(s)</span>
          </div>
          <div className="inmate-landing-v2-courses">
            {visibleCourses.map((course) => (
              <article key={course.id} className="inmate-landing-v2-course-card">
                <div className="inmate-landing-v2-course-image-wrap">
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    sizes="(max-width: 1300px) 100vw, 32vw"
                    className="inmate-landing-v2-course-image"
                  />
                  <div className="inmate-landing-v2-course-badges">
                    <span>{course.category}</span>
                    <b>{course.level}</b>
                  </div>
                </div>
                <div className="inmate-landing-v2-course-body">
                  <h3>{course.title}</h3>
                  <p>{course.summary}</p>
                  <div className="inmate-landing-v2-course-meta">
                    <strong>{course.instructor}</strong>
                    <span>{course.durationHours} hrs</span>
                  </div>
                  <div className="inmate-landing-v2-course-footer">
                    <Link href={`/landing/courses/${course.id}`} className="button-soft">
                      View Details
                    </Link>
                    <Link
                      href={`/auth/inmate-login?next=${encodeURIComponent(`/inmate/courses/${course.id}`)}`}
                      className="button-primary"
                    >
                      Enroll
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="inmate-landing-v2-footer">
          <span>Secured Offline Environment</span>
          <span>•</span>
          <span>Ghana Prisons Service Learning & Rehabilitation System</span>
        </footer>
      </main>
    </div>
  );
}
