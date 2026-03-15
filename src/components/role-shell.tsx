"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { TopNav } from "@/components/top-nav";
import { useAppShell } from "@/lib/app-shell";
import type { Role } from "@/types/domain";

interface RoleShellProps {
  title: string;
  subtitle?: string;
  userName?: string;
  currentRole?: Role;
  hideNav?: boolean;
  hideFlowPanel?: boolean;
  children: React.ReactNode;
}

const roleNavLinks: Record<Role, Array<{ label: string; href: string }>> = {
  admin: [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Inmates", href: "/admin/inmates" },
    { label: "Register", href: "/admin/register-inmate" },
    { label: "Lecturers", href: "/admin/lecturers" },
    { label: "Officers", href: "/admin/officers" },
    { label: "Attendance", href: "/admin/attendance" },
    { label: "Courses", href: "/admin/courses" },
    { label: "Certificates", href: "/admin/certificates" },
    { label: "Reports", href: "/admin/reports" },
    { label: "Security", href: "/admin/security" },
    { label: "Settings", href: "/admin/settings" },
  ],
  inmate: [
    { label: "Dashboard", href: "/inmate/dashboard" },
    { label: "Courses", href: "/inmate/courses" },
    { label: "Assignments", href: "/inmate/assignments" },
    { label: "Certificates", href: "/inmate/certificates" },
    { label: "Progress", href: "/inmate/progress" },
  ],
  management: [
    { label: "Dashboard", href: "/management/dashboard" },
    { label: "Inmates", href: "/management/inmates" },
    { label: "Analytics", href: "/management/analytics" },
    { label: "Reports", href: "/management/reports" },
  ],
  lecturer: [
    { label: "Dashboard", href: "/lecturer/dashboard" },
    { label: "Courses", href: "/lecturer/courses" },
    { label: "Assignments", href: "/lecturer/assignments" },
    { label: "Grading", href: "/lecturer/grading" },
    { label: "Attendance", href: "/lecturer/attendance" },
    { label: "Reports", href: "/lecturer/reports" },
  ],
  clocking_officer: [
    { label: "Check-In", href: "/clockin/checkin" },
    { label: "Sessions", href: "/clockin/sessions" },
    { label: "Clock-Out", href: "/clockin/checkout" },
  ],
};

const flowActionsByRole: Record<Role, Array<{ label: string; href: string }>> = {
  admin: [
    { label: "Next Action: Register New Inmate", href: "/admin/register-inmate" },
    { label: "Next Action: Open Reports Workspace", href: "/admin/reports" },
    { label: "Next Action: Review Security Events", href: "/admin/security" },
  ],
  inmate: [
    { label: "Next Action: Continue Course Learning", href: "/inmate/courses" },
    { label: "Next Action: Check My Certificates", href: "/inmate/certificates" },
    { label: "Next Action: Return to Dashboard", href: "/inmate/dashboard" },
  ],
  management: [
    { label: "Next Action: Refresh Analytics View", href: "/management/dashboard" },
    { label: "Next Action: Review Inmate Profiles", href: "/management/inmates" },
    { label: "Next Action: Open Management Reports", href: "/management/reports" },
  ],
  lecturer: [
    { label: "Next Action: Upload Course Content", href: "/lecturer/courses" },
    { label: "Next Action: Grade Pending Submissions", href: "/lecturer/grading" },
  ],
  clocking_officer: [
    { label: "Next Action: Start Check-In Workflow", href: "/clockin/checkin" },
    { label: "Next Action: Review Active Sessions", href: "/clockin/sessions" },
  ],
};

function roleFromPath(pathname: string): Role | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/inmate")) return "inmate";
  if (pathname.startsWith("/management")) return "management";
  if (pathname.startsWith("/lecturer")) return "lecturer";
  if (pathname.startsWith("/clockin")) return "clocking_officer";
  return null;
}

function roleLabel(role: Role): string {
  if (role === "admin") return "Admin";
  if (role === "inmate") return "Inmate";
  if (role === "management") return "Management";
  if (role === "lecturer") return "Lecturer";
  return "Clocking Officer";
}

export function RoleShell({ title, subtitle, userName, currentRole, hideNav = false, hideFlowPanel = false, children }: RoleShellProps) {
  const pathname = usePathname();
  const { session, signOut, switchRole } = useAppShell();

  const activeRole = currentRole ?? session?.role ?? roleFromPath(pathname);
  const navLinks = activeRole ? roleNavLinks[activeRole] : [];
  const flowActions = activeRole
    ? flowActionsByRole[activeRole].filter((item) => !(item.href === pathname && activeRole !== "management"))
    : [];
  const displayName = userName ?? session?.displayName ?? "Signed In";

  const isNavActive = useMemo(
    () => (href: string) => {
      if (href === "/admin/dashboard" && pathname.startsWith("/admin/inmates/")) {
        return true;
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  );
  const activeSection = navLinks.find((link) => isNavActive(link.href))?.label ?? "Overview";
  const resolvedSubtitle = activeRole === "admin" ? "Admin Workspace" : subtitle;

  return (
    <div className="portal-root">
      <TopNav
        title={title}
        subtitle={resolvedSubtitle}
        userName={displayName}
        activeRole={activeRole}
        onSignOut={() => signOut()}
        onSwitchRole={switchRole}
      />
      {!hideNav && navLinks.length > 0 ? (
        <nav className={activeRole === "admin" ? "role-nav role-nav-admin" : "role-nav"} aria-label="Portal sections">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={isNavActive(link.href) ? "role-nav-link role-nav-link-active" : "role-nav-link"}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      ) : null}
      {activeRole ? (
        <section className="role-context">
          <p className="role-context-eyebrow">{roleLabel(activeRole)} Workspace</p>
          <p className="role-context-title">{activeSection}</p>
        </section>
      ) : null}
      <main className="portal-content">{children}</main>
      {!hideFlowPanel && flowActions.length > 0 ? (
        <section className="flow-panel">
          <p className="flow-panel-title">Suggested Next Actions</p>
          <div className="flow-links">
            {flowActions.map((action) => (
              <Link key={action.label} href={action.href} className="flow-link-button">
                {action.label}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
