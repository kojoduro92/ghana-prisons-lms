"use client";

import Link from "next/link";
import type { Role } from "@/types/domain";
import { BrandLogo } from "@/components/brand-logo";

interface TopNavProps {
  title: string;
  subtitle?: string;
  userName?: string;
  activeRole?: Role | null;
  onSignOut: () => void;
  onSwitchRole: (role: Role) => void;
}

export function TopNav({ title, subtitle, userName, activeRole, onSignOut, onSwitchRole }: TopNavProps) {
  const inmateOnlyMode = activeRole === "inmate";

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <BrandLogo size={44} />
        <div>
          <p className="top-nav-title">{title}</p>
          {subtitle ? <p className="top-nav-subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <div className="top-nav-right">
        <Link href="/landing" className="chip-button chip-link">
          Portal Home
        </Link>
        {!inmateOnlyMode ? (
          <div className="top-nav-role-switch">
            <button
              type="button"
              className={activeRole === "admin" ? "chip-button chip-button-active" : "chip-button"}
              onClick={() => {
                if (activeRole !== "admin") onSwitchRole("admin");
              }}
            >
              Admin
            </button>
            <button
              type="button"
              className="chip-button"
              onClick={() => onSwitchRole("inmate")}
            >
              Inmate
            </button>
            <button
              type="button"
              className={activeRole === "management" ? "chip-button chip-button-active" : "chip-button"}
              onClick={() => {
                if (activeRole !== "management") onSwitchRole("management");
              }}
            >
              Management
            </button>
            <button
              type="button"
              className={activeRole === "lecturer" ? "chip-button chip-button-active" : "chip-button"}
              onClick={() => {
                if (activeRole !== "lecturer") onSwitchRole("lecturer");
              }}
            >
              Lecturer
            </button>
            <button
              type="button"
              className={activeRole === "clocking_officer" ? "chip-button chip-button-active" : "chip-button"}
              onClick={() => {
                if (activeRole !== "clocking_officer") onSwitchRole("clocking_officer");
              }}
            >
              Officer
            </button>
          </div>
        ) : null}
        <span className="user-chip">{userName ?? "Signed In"}</span>
        <button type="button" className="chip-button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
