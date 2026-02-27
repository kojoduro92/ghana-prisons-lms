"use client";

import type { Role } from "@/types/domain";

interface TopNavProps {
  title: string;
  subtitle?: string;
  userName?: string;
  activeRole?: Role | null;
  onSignOut: () => void;
  onSwitchRole: (role: Role) => void;
}

export function TopNav({ title, subtitle, userName, activeRole, onSignOut, onSwitchRole }: TopNavProps) {
  return (
    <header className="top-nav">
      <div>
        <p className="top-nav-title">{title}</p>
        {subtitle ? <p className="top-nav-subtitle">{subtitle}</p> : null}
      </div>

      <div className="top-nav-right">
        <span className="status-chip">Offline Mode</span>
        <span className="status-chip">Local Secure Server</span>
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
            className={activeRole === "inmate" ? "chip-button chip-button-active" : "chip-button"}
            onClick={() => {
              if (activeRole !== "inmate") onSwitchRole("inmate");
            }}
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
        </div>
        <span className="user-chip">{userName ?? "Signed In"}</span>
        <button type="button" className="chip-button" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </header>
  );
}
