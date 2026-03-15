"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { persistSession } from "@/lib/auth-client";
import { appMeta } from "@/lib/seed-data";
import type { UserSession } from "@/types/domain";

export default function InmateLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("GP-10234");
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
          next: nextPath || "/inmate/dashboard",
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

      router.push(payload.data?.redirectTo || "/inmate/dashboard");
    } catch {
      setError("Unable to contact local auth service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="portal-root auth-root inmate-login-root">
      <div className="inmate-login-shell">
        <aside className="inmate-login-brand">
          <div className="inmate-login-brand-head">
            <BrandLogo size={84} priority />
            <p>{appMeta.name}</p>
          </div>
          <h1>Inmate Learning Login</h1>
          <p>Use your inmate ID and password to access assigned courses, progress, and certificates.</p>
          <ul>
            <li>Inmate-only authentication interface</li>
            <li>Direct dashboard access after credential login</li>
            <li>All activity is locally audited</li>
          </ul>
        </aside>

        <div className="panel inmate-login-form-panel">
          <h2>Inmate Sign In</h2>
          <p className="quick-info">Enter your student ID exactly as assigned by the facility.</p>
          {reason === "role" ? (
            <p className="status-bad" style={{ marginBottom: 12 }}>
              This area only allows inmate accounts. Use your inmate credential.
            </p>
          ) : null}
          {reason === "role" && fallback ? (
            <p className="status-neutral" style={{ marginBottom: 12 }}>
              A non-inmate session was detected and cannot continue on this page.
            </p>
          ) : null}
          <form onSubmit={onSubmit} className="inmate-login-form">
            <label>
              Inmate ID / Student ID
              <input
                className="input"
                value={username}
                onChange={(event) => setUsername(event.target.value.toUpperCase())}
                placeholder="GP-10234"
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

            <button className="button-primary inmate-login-submit" type="submit" data-testid="inmate-login-submit" disabled={busy}>
              {busy ? "Signing In..." : "Sign In to Inmate Portal"}
            </button>
          </form>

          <div className="panel inmate-login-accounts">
            <p>Inmate Demo Account</p>
            <ul>
              <li>GP-10234 / Prison1234</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
