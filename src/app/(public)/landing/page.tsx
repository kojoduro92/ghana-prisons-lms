import Link from "next/link";
import Image from "next/image";
import { adminStats, appMeta, courseCategories, topRatedCourses } from "@/lib/seed-data";
import { CourseCard } from "@/components/course-card";
import { BrandLogo } from "@/components/brand-logo";
import { LandingHeroSlider } from "@/components/landing-hero-slider";
import { LiveChatWidget } from "@/components/live-chat-widget";

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
    title: "1. Register and Enroll",
    detail: "Administrators easily capture learner profiles and activate their customized learning accounts.",
  },
  {
    title: "2. Facility Entry Verification",
    detail: "Learners complete simple, supervised checks before securely entering the modern learning facility.",
  },
  {
    title: "3. Seamless Platform Access",
    detail: "Learners log into their dedicated dashboards with secure, structured role-based access.",
  },
  {
    title: "4. Learning and Assessments",
    detail: "Comprehensive courses, lessons, and interactive assessments track measurable outcomes.",
  },
  {
    title: "5. Monitoring and Insights",
    detail: "Management dashboards deliver real-time attendance, performance analytics, and actionable insights.",
  },
];

const heroSlides = [
  {
    id: "slide-classroom",
    title: "Secure Learning Sessions That Build Real-World Skills",
    eyebrow: "Premium Learning Experience",
    description:
      "Instructor-led and self-paced tracks are delivered in a comprehensive, structured environment designed for measurable rehabilitation progress.",
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

        <nav style={{ display: 'flex', gap: '32px', margin: '0 40px' }}>
          <Link href="/inmate/courses" style={{ fontWeight: 600, color: '#333' }}>Courses</Link>
          <Link href="/landing#categories" style={{ fontWeight: 600, color: '#333' }}>Categories</Link>
          <Link href="/landing#learning-tracks" style={{ fontWeight: 600, color: '#333' }}>Learning Tracks</Link>
          <Link href="/landing#partnerships" style={{ fontWeight: 600, color: '#333' }}>Facilities</Link>
        </nav>

        <div className="landing-topbar-actions">
          <Link href="/admin-login" className="button-primary">
            Login
          </Link>
        </div>
      </header>

      <section className="landing-hero-fullwidth" style={{ width: '100%', maxWidth: '1600px', margin: '0 auto 20px' }}>
        <LandingHeroSlider slides={heroSlides} />
      </section>

      <main className="portal-content landing-content">
        <section className="panel" id="platform-access" style={{ background: 'linear-gradient(to bottom right, #ffffff, #f9f4f0)', border: '1px solid #e8dccd' }}>
          <div className="inline-row" style={{ marginBottom: 24 }}>
            <div>
              <h2 className="section-title" style={{ marginBottom: 4 }}>
                Platform Access
              </h2>
              <p style={{ color: 'var(--muted-700)', margin: 0 }}>Three dedicated experiences built into one secure platform.</p>
            </div>
          </div>
          <div className="landing-path-grid">
            <Link href="/admin-login?next=%2Fadmin%2Fdashboard" className="landing-path-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ padding: '12px', background: '#f5efe6', borderRadius: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>🔐</span>
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>Admin Operations</h3>
              <p style={{ margin: '8px 0 16px', lineHeight: 1.5 }}>Register inmates, track attendance, manage courses, and issue certificates efficiently.</p>
              <span style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>Go to Admin Dashboard <span style={{ fontSize: '1.2rem' }}>→</span></span>
            </Link>
            <Link href="/verify-identity?next=%2Finmate%2Fdashboard" className="landing-path-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ padding: '12px', background: '#e6eff5', borderRadius: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>📖</span>
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>Inmate Learning</h3>
              <p style={{ margin: '8px 0 16px', lineHeight: 1.5 }}>Verify identity, continue courses, monitor goals, and download certificates securely.</p>
              <span style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', color: '#2d5c88' }}>Go to Learner Dashboard <span style={{ fontSize: '1.2rem' }}>→</span></span>
            </Link>
            <Link href="/admin-login?next=%2Fmanagement%2Fdashboard" className="landing-path-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ padding: '12px', background: '#f5e6eb', borderRadius: '12px', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.5rem' }}>📊</span>
              </div>
              <h3 style={{ fontSize: '1.25rem' }}>Management Analytics</h3>
              <p style={{ margin: '8px 0 16px', lineHeight: 1.5 }}>Review enrollment trends, completion rates, and facility-wide performance insights.</p>
              <span style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '6px', color: '#882d4c' }}>Go to Management View <span style={{ fontSize: '1.2rem' }}>→</span></span>
            </Link>
          </div>
        </section>

        <section className="panel" style={{ padding: '32px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 className="section-title" style={{ fontSize: '1.6rem', marginBottom: '8px' }}>End-to-End Learning Journey</h2>
            <p style={{ color: 'var(--muted-700)', maxWidth: '600px', margin: '0 auto' }}>
              A structured and secure five-step process ensuring every learner is verified, tracked, and supported from start to finish.
            </p>
          </div>
          <div className="landing-workflow-grid" style={{ position: 'relative', zIndex: 1 }}>
            {workflowSteps.map((step, idx) => (
              <article key={step.title} className="landing-workflow-step" style={{ background: '#faf8f5', border: '1px solid #e8dccd', position: 'relative', paddingTop: '24px' }}>
                <div style={{ position: 'absolute', top: '-16px', left: '20px', background: 'var(--copper-500)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(139, 84, 46, 0.3)' }}>
                  {idx + 1}
                </div>
                <h3 style={{ fontSize: '1.05rem', marginTop: '4px' }}>{step.title.split('. ')[1]}</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--muted-700)' }}>{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="panel" id="categories" style={{ background: '#fcfaf7' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
            <div>
              <h2 className="section-title" style={{ marginBottom: '8px' }}>Course Categories</h2>
              <p style={{ color: 'var(--muted-700)', margin: 0, maxWidth: '500px' }}>Explore a diverse range of subjects designed to equip learners with practical and highly sought-after skills.</p>
            </div>
          </div>
          <div className="grid-3 landing-categories">
            {courseCategories.map((category) => (
              <article key={category} className="category-card" style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'center', padding: '20px', minHeight: 'auto' }}>
                <div className="category-icon" style={{ fontSize: '2.5rem', background: '#fff', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  {categoryDetails[category]?.icon ?? "📘"}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{category}</h3>
                  <span className="category-meta" style={{ display: 'inline-block', padding: '4px 8px', background: '#f0e6d9', borderRadius: '6px', fontSize: '0.7rem' }}>
                    {categoryDetails[category]?.courses ?? 0} COURSES
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel" id="learning-tracks">
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <h2 className="section-title" style={{ fontSize: '1.8rem', marginBottom: '8px' }}>Learning Tracks</h2>
            <p style={{ color: 'var(--muted-700)', maxWidth: '600px', margin: '0 auto' }}>Curated tracks combining multiple courses to build comprehensive expertise in specific domains.</p>
          </div>
          <div className="landing-journey-grid">
            {journeyCards.map((journey) => (
              <article key={journey.title} className="landing-journey-card" style={{ display: 'flex', flexDirection: 'column', border: 'none', boxShadow: '0 12px 24px rgba(0,0,0,0.06)', borderRadius: '16px', background: '#fff' }}>
                <div className="landing-journey-image-wrap" style={{ minHeight: '200px', borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
                  <Image
                    src={journey.imageSrc}
                    alt={journey.title}
                    fill
                    sizes="(max-width: 1100px) 100vw, 33vw"
                    className="landing-image"
                    style={{ transition: 'transform 0.3s ease' }}
                  />
                </div>
                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '1.25rem', margin: '0 0 12px' }}>{journey.title}</h3>
                  <p style={{ margin: '0 0 20px', color: 'var(--muted-700)', fontSize: '0.95rem', lineHeight: 1.5, flex: 1 }}>{journey.summary}</p>
                  <Link href="/inmate/courses" className="button-soft" style={{ alignSelf: 'flex-start', padding: '8px 16px', fontSize: '0.9rem' }}>View Pathway</Link>
                </div>
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

        <section className="panel" id="benefits" style={{ background: 'linear-gradient(135deg, #2d1b11, #5c3a21)', color: 'white', padding: '48px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="section-title" style={{ color: '#fff', fontSize: '2rem' }}>Why Choose This Platform?</h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', maxWidth: '600px', margin: '0 auto', fontSize: '1.05rem' }}>
              Designed from the ground up to support large-scale rehabilitation and structured skill development.
            </p>
          </div>
          <div className="grid-3">
            <article className="landing-path-card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🌱</div>
              <h3 style={{ color: 'white', fontSize: '1.3rem' }}>Empowering Rehabilitation</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>Providing meaningful educational opportunities that build confidence and essential life skills for post-release success.</p>
            </article>
            <article className="landing-path-card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>📈</div>
              <h3 style={{ color: 'white', fontSize: '1.3rem' }}>Measurable Outcomes</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>Data-driven insights help track learner progress, engagement, and long-term success rates across facilities.</p>
            </article>
            <article className="landing-path-card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
              <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🛡️</div>
              <h3 style={{ color: 'white', fontSize: '1.3rem' }}>Secure Environment</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)' }}>A closed-loop, highly structured platform ensures learning happens safely and effectively with robust access controls.</p>
            </article>
          </div>
        </section>

        <section className="panel" id="impact" style={{ padding: '48px 32px', background: '#fdfaf5', border: 'none', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: '-10%', top: '-10%', fontSize: '20rem', opacity: 0.03, pointerEvents: 'none' }}>
            "
          </div>
          <h2 className="section-title" style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '40px' }}>Impact & Success Stories</h2>
          <div className="grid-2">
            <article className="landing-journey-card" style={{ padding: '32px', display: 'flex', gap: '20px', alignItems: 'flex-start', background: '#fff', boxShadow: '0 16px 32px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '3rem', color: 'var(--copper-300)', lineHeight: 1, marginTop: '-10px' }}>"</div>
              <div>
                <p style={{ fontStyle: 'italic', fontSize: '1.15rem', color: '#333', margin: '0 0 24px', lineHeight: 1.6 }}>
                  This platform gave me the tools to learn a trade and build a foundation for my future. For the first time, I feel prepared for the outside world.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0cbb8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#5f3820' }}>JD</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>John D.</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted-700)' }}>Vocational Readiness Graduate</span>
                  </div>
                </div>
              </div>
            </article>
            <article className="landing-journey-card" style={{ padding: '32px', display: 'flex', gap: '20px', alignItems: 'flex-start', background: '#fff', boxShadow: '0 16px 32px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: '3rem', color: 'var(--copper-300)', lineHeight: 1, marginTop: '-10px' }}>"</div>
              <div>
                <p style={{ fontStyle: 'italic', fontSize: '1.15rem', color: '#333', margin: '0 0 24px', lineHeight: 1.6 }}>
                  The digital foundations course helped me understand technology. I am no longer afraid of using a computer and feel confident about job hunting.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#b8cce0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: '#203b5f' }}>SK</div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem' }}>Samuel K.</h4>
                    <span style={{ fontSize: '0.85rem', color: 'var(--muted-700)' }}>IT & Digital Skills Graduate</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="panel" id="partnerships" style={{ border: 'none', background: '#fff', padding: '40px 20px' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 className="section-title" style={{ fontSize: '1.6rem', color: 'var(--copper-700)' }}>Trusted by leading facilities</h2>
            <p style={{ color: 'var(--muted-700)', maxWidth: '600px', margin: '8px auto 32px' }}>
              Working together with institutions to deliver high-quality education and structured rehabilitation programs.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '80px', height: '80px', background: '#f5f5f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🏛️</div>
                <div style={{ fontWeight: 600, color: '#333' }}>Nsawam Security</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '80px', height: '80px', background: '#f5f5f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🏢</div>
                <div style={{ fontWeight: 600, color: '#333' }}>Kumasi Central</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '80px', height: '80px', background: '#f5f5f5', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🏰</div>
                <div style={{ fontWeight: 600, color: '#333' }}>Ankaful Maximum</div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <LiveChatWidget />
    </div>
  );
}
