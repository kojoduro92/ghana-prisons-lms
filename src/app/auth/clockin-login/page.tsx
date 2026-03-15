"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { persistSession } from "@/lib/auth-client";
import type { UserSession } from "@/types/domain";

export default function ClockinLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("officer");
  const [password, setPassword] = useState("Prison1234");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next"));
    setReason(params.get("reason"));
    setFallback(params.get("fallback"));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          next: nextPath || "/clockin/checkin",
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        data?: { redirectTo?: string; session?: UserSession };
        error?: { message?: string };
      };

      if (!response.ok || !payload.success) {
        setError(payload.error?.message ?? "Unable to sign in.");
        return;
      }

      if (payload.data?.session) {
        persistSession({
          ...payload.data.session,
          studentId: payload.data.session.studentId ?? undefined,
        });
      }

      router.push(payload.data?.redirectTo || "/clockin/checkin");
    } catch {
      setError("Unable to contact local auth service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="portal-root auth-root clockin-login-root">
      <div className="clockin-login-shell">
        <header className="clockin-login-header">
          <div className="clockin-login-brand">
            <BrandLogo size={64} priority />
            <div>
              <p>Ghana Prisons Learning Portal</p>
              <span>Lab Access & Clock-In System</span>
            </div>
          </div>
          <div className="clockin-login-status">
            <span>Secure Server</span>
          </div>
        </header>

        <div className="panel clockin-login-panel">
          <h1>Clocking Officer Login</h1>
          <p className="quick-info">Use officer credentials to open biometric check-in and device allocation workflow.</p>
          {reason === "role" ? (
            <p className="status-bad" style={{ marginBottom: 12 }}>
              This area only allows clocking officer accounts.
            </p>
          ) : null}
          {reason === "role" && fallback ? (
            <p className="status-good" style={{ marginBottom: 12 }}>
              Existing session detected. <Link href={fallback}>Continue to your dashboard</Link>.
            </p>
          ) : null}

          <form onSubmit={onSubmit} className="clockin-login-form">
            <label>
              Officer Username
              <input
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>
            {error ? <p className="status-bad">{error}</p> : null}
            <button className="button-primary clockin-login-submit" type="submit" data-testid="clockin-login-submit" disabled={busy}>
              {busy ? "Signing In..." : "Open Clock-In Console"}
            </button>
          </form>

          <div className="panel clockin-login-account">
            <p>Clocking Officer Demo Account</p>
            <ul>
              <li>officer / Prison1234</li>
            </ul>
          </div>

          <div className="clockin-login-links">
            <Link href="/access" className="button-soft">
              Back to Access Entry
            </Link>
            <Link href="/auth/login?next=%2Fadmin%2Fdashboard" className="button-soft">
              Staff Login
            </Link>
            <Link href="/auth/inmate-login?next=%2Finmate%2Fdashboard" className="button-soft">
              Inmate Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
