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
  children: React.ReactNode;
}

const roleNavLinks: Record<Role, Array<{ label: string; href: string }>> = {
  admin: [
    { label: "Dashboard", href: "/admin/dashboard" },
    { label: "Register", href: "/admin/register-inmate" },
    { label: "Attendance", href: "/admin/attendance" },
    { label: "Courses", href: "/admin/courses" },
    { label: "Certificates", href: "/admin/certificates" },
    { label: "Reports", href: "/admin/reports" },
    { label: "Security", href: "/admin/security" },
  ],
  inmate: [
    { label: "Dashboard", href: "/inmate/dashboard" },
    { label: "Courses", href: "/inmate/courses" },
    { label: "Certificates", href: "/inmate/certificates" },
  ],
  management: [{ label: "Dashboard", href: "/management/dashboard" }],
};

function roleFromPath(pathname: string): Role | null {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/inmate")) return "inmate";
  if (pathname.startsWith("/management")) return "management";
  return null;
}

export function RoleShell({ title, subtitle, userName, currentRole, children }: RoleShellProps) {
  const pathname = usePathname();
  const { session, signOut, switchRole } = useAppShell();

  const activeRole = currentRole ?? session?.role ?? roleFromPath(pathname);
  const navLinks = activeRole ? roleNavLinks[activeRole] : [];
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

  return (
    <div className="portal-root">
      <TopNav
        title={title}
        subtitle={subtitle}
        userName={displayName}
        activeRole={activeRole}
        onSignOut={() => signOut("/landing")}
        onSwitchRole={switchRole}
      />
      {navLinks.length > 0 ? (
        <nav className="role-nav" aria-label="Portal sections">
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
      <main className="portal-content">{children}</main>
    </div>
  );
}
