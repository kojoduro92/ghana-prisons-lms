import Link from "next/link";
import { appMeta } from "@/lib/seed-data";
import { BrandLogo } from "@/components/brand-logo";

const accessCards = [
  {
    title: "Admin Login",
    href: "/auth/login?next=%2Fadmin%2Fdashboard",
    icon: "admin",
  },
  {
    title: "Management Login",
    href: "/auth/login?next=%2Fmanagement%2Fdashboard",
    icon: "management",
  },
  {
    title: "Lecturer Login",
    href: "/auth/login?next=%2Flecturer%2Fdashboard",
    icon: "lecturer",
  },
  {
    title: "Inmate Login",
    href: "/auth/inmate-login?next=%2Finmate%2Fdashboard",
    icon: "inmate",
  },
  {
    title: "Lab Access & Clock-In",
    href: "/auth/clockin-login?next=%2Fclockin%2Fcheckin",
    icon: "lab",
  },
] as const;

function AccessIcon({ type }: { type: (typeof accessCards)[number]["icon"] }) {
  if (type === "admin") {
    return (
      <svg viewBox="0 0 24 24" className="access-doc-svg" aria-hidden="true">
        <path d="M10.5 2h3l.6 2.1a7.7 7.7 0 0 1 1.8.8l2-.9 2.1 2.1-.9 2a7.7 7.7 0 0 1 .8 1.8L22 10.5v3l-2.1.6a7.7 7.7 0 0 1-.8 1.8l.9 2-2.1 2.1-2-.9a7.7 7.7 0 0 1-1.8.8L13.5 22h-3l-.6-2.1a7.7 7.7 0 0 1-1.8-.8l-2 .9-2.1-2.1.9-2a7.7 7.7 0 0 1-.8-1.8L2 13.5v-3l2.1-.6a7.7 7.7 0 0 1 .8-1.8l-.9-2 2.1-2.1 2 .9a7.7 7.7 0 0 1 1.8-.8L10.5 2ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
      </svg>
    );
  }

  if (type === "management") {
    return (
      <svg viewBox="0 0 24 24" className="access-doc-svg" aria-hidden="true">
        <path d="M3 5h8v6H3V5Zm10 0h8v4h-8V5ZM3 13h6v6H3v-6Zm8-2h10v8H11v-8Z" />
      </svg>
    );
  }

  if (type === "lecturer") {
    return (
      <svg viewBox="0 0 24 24" className="access-doc-svg" aria-hidden="true">
        <path d="M12 3a4 4 0 1 1 0 8 4 4 0 0 1 0-8ZM4 20a8 8 0 1 1 16 0H4Zm14.5-9.2 2.8-2.8 1.4 1.4-2.8 2.8-1.4-1.4Z" />
      </svg>
    );
  }

  if (type === "inmate") {
    return (
      <svg viewBox="0 0 24 24" className="access-doc-svg" aria-hidden="true">
        <path d="M17 10h-1V8a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v7h14v-7a2 2 0 0 0-2-2Zm-3 0h-4V8a2 2 0 1 1 4 0v2Zm-2 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="access-doc-svg" aria-hidden="true">
      <path d="M4 4h16v16H4V4Zm3 2v12h10V6H7Zm2 2h6v2H9V8Zm0 4h6v4H9v-4Z" />
    </svg>
  );
}

export default function UnifiedAccessPage() {
  return (
    <div className="portal-root portal-root-public access-root access-doc-root">
      <header className="access-doc-topbar">
        <div className="access-doc-brand">
          <BrandLogo size={68} priority />
          <p>{appMeta.name}</p>
        </div>
      </header>

      <main className="portal-content access-doc-content">
        <section className="access-doc-hero">
          <h1 className="access-doc-title">Unified Access Entry Page</h1>
          <p className="access-doc-subtitle">Select your access option:</p>
          <div className="access-grid">
            {accessCards.map((card) => (
              <Link key={card.title} href={card.href} className="access-card access-doc-card">
                <span className="access-card-icon access-doc-card-icon" aria-hidden="true">
                  <AccessIcon type={card.icon} />
                </span>
                <span className="access-card-title">{card.title}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer className="access-footer access-doc-footer">
        <span>Last Sync: 2 mins ago</span>
        <span>•</span>
        <span>Local Secure Server</span>
      </footer>
    </div>
  );
}
