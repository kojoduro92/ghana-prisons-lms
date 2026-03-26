"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { loginPathForPath } from "@/lib/auth";
import { persistSession } from "@/lib/auth-client";
import { appMeta } from "@/lib/seed-data";
import type { UserSession } from "@/types/domain";

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Prison1234");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string | null>(null);
  const [forceVerify, setForceVerify] = useState(false);
  const redirectLoginPath = nextPath ? loginPathForPath(nextPath) : "/auth/login";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNextPath(params.get("next"));
    setReason(params.get("reason"));
    setFallback(params.get("fallback"));
    setForceVerify(params.get("verify") === "1");
  }, []);

  useEffect(() => {
    if (redirectLoginPath !== "/auth/login") {
      const query = typeof window === "undefined" ? "" : window.location.search.slice(1);
      const suffix = query ? `?${query}` : "";
      router.replace(`${redirectLoginPath}${suffix}`);
    }
  }, [redirectLoginPath, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
          next: nextPath || undefined,
        }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        data?: { redirectTo?: string; requiresVerification?: boolean; session?: UserSession };
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

      const redirectTo = payload.data?.redirectTo || "/access";
      if (payload.data?.requiresVerification || forceVerify) {
        const verifyQuery = new URLSearchParams();
        verifyQuery.set("next", redirectTo);
        if (forceVerify) {
          verifyQuery.set("verify", "1");
        }
        router.push(`/verify-identity?${verifyQuery.toString()}`);
        return;
      }
      router.push(redirectTo);
    } catch {
      setError("Unable to contact local auth service.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="portal-root auth-root">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <BrandLogo size={88} priority />
          <h1>{appMeta.name}</h1>
          <p>Secure offline sign-in for role-based access across all facility operations.</p>
          <ul className="auth-security-list">
            <li>Signed & encrypted server session token</li>
            <li>Biometric checkpoint before restricted routes</li>
            <li>Audit trail for all privileged actions</li>
          </ul>
        </aside>

        <div className="panel auth-form-panel">
          <h2 style={{ marginBottom: 6 }}>Staff Login</h2>
          <p className="quick-info" style={{ marginBottom: 18 }}>
            Admin, management, and lecturer accounts sign in here.
          </p>
          {reason === "role" ? (
            <p className="status-bad" style={{ marginBottom: 12 }}>
              Access denied for this route with your previous role. Use a valid account.
            </p>
          ) : null}
          {reason === "role" && fallback ? (
            <p className="status-good" style={{ marginBottom: 12 }}>
              Existing session detected. <Link href={fallback}>Continue to your dashboard</Link>.
            </p>
          ) : null}
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
            <label>
              Username
              <input className="input" value={username} onChange={(event) => setUsername(event.target.value)} />
            </label>
            <label>
              Password
              <input
                className="input"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {error ? <p className="status-bad">{error}</p> : null}

            <button className="button-primary" type="submit" data-testid="admin-login-submit" disabled={busy}>
              {busy ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div className="panel" style={{ marginTop: 16, padding: 12 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Demo Accounts</p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              <li>admin / Prison1234</li>
              <li>manager / Prison1234</li>
              <li>lecturer / Prison1234</li>
            </ul>
          </div>
          <div style={{ marginTop: 10 }}>
            <Link href="/access" className="button-soft">
              Back to Access Entry
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
