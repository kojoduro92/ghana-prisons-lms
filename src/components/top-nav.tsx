"use client";

import { useRouter } from "next/navigation";
import { clearSession } from "@/lib/auth-client";

interface TopNavProps {
  title: string;
  subtitle?: string;
  userName?: string;
}

export function TopNav({ title, subtitle, userName }: TopNavProps) {
  const router = useRouter();

  return (
    <header className="top-nav">
      <div>
        <p className="top-nav-title">{title}</p>
        {subtitle ? <p className="top-nav-subtitle">{subtitle}</p> : null}
      </div>

      <div className="top-nav-right">
        <span className="status-chip">Offline Mode</span>
        <span className="status-chip">Local Secure Server</span>
        <span className="user-chip">{userName ?? "Signed In"}</span>
        <button
          type="button"
          className="chip-button"
          onClick={() => {
            clearSession();
            router.push("/admin-login");
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
