"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSessionFromCredential, findDemoCredential, roleHomePath } from "@/lib/auth";
import { useAppShell } from "@/lib/app-shell";
import { addAuditEvent } from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";
import { BrandLogo } from "@/components/brand-logo";

export default function AdminLoginPage() {
  const router = useRouter();
  const { session, setActiveSession, signOut } = useAppShell();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Prison1234");
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("next");
  }, []);
  const reason = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("reason");
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const credential = findDemoCredential(username, password);
    if (!credential) {
      addAuditEvent({
        action: "login-attempt",
        actor: username || "unknown",
        result: "failed",
        details: "Invalid credentials supplied",
      });
      setError("Invalid credentials. Use the demo accounts listed below.");
      return;
    }

    const newSession = createSessionFromCredential(credential);
    setActiveSession(newSession);
    addAuditEvent({
      action: "login-success",
      actor: newSession.displayName,
      result: "success",
      target: newSession.role,
      details: "Role session established",
    });

    const destination = nextPath || roleHomePath(credential.role);
    router.push(`/verify-identity?next=${encodeURIComponent(destination)}`);
  }

  const resumePath = session ? nextPath || roleHomePath(session.role) : null;

  return (
    <div className="portal-root auth-root">
      <div className="auth-shell">
        <aside className="auth-brand-panel">
          <BrandLogo size={88} priority />
          <h1>{appMeta.name}</h1>
          <p>Secure access for education, rehabilitation, and institutional operations.</p>
          <ul className="auth-security-list">
            <li>Secure Access Only</li>
            <li>Local Secure Server</li>
          </ul>
        </aside>

        <div className="panel auth-form-panel">
          <h2 style={{ marginBottom: 6 }}>Admin Login</h2>
          <p className="quick-info" style={{ marginBottom: 18 }}>
            Sign in, then complete biometric verification to continue.
          </p>

          {session && resumePath ? (
            <div className="panel" style={{ marginBottom: 12, padding: 12 }}>
              <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Active session detected: {session.displayName}</p>
              <div className="inline-row" style={{ justifyContent: "flex-start" }}>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => router.push(`/verify-identity?next=${encodeURIComponent(resumePath)}`)}
                >
                  Continue Session
                </button>
                <button type="button" className="button-soft" onClick={() => signOut("/admin-login")}>
                  Use Different Account
                </button>
              </div>
            </div>
          ) : null}
          {reason === "role" ? (
            <p className="status-bad" style={{ marginBottom: 12 }}>
              Requested page needs a different role. Sign in with the correct account to continue.
            </p>
          ) : null}
          {reason === "entry" ? (
            <p className="status-bad" style={{ marginBottom: 12 }}>
              Inmate learning access requires facility entry verification. Sign in and complete biometric verification.
            </p>
          ) : null}

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <label>
              Username
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
            </label>

            <label>
              Password
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error ? <p className="status-bad">{error}</p> : null}

            <button className="button-primary" type="submit" data-testid="admin-login-submit">
              Verify and Continue
            </button>
          </form>

          <div className="panel" style={{ marginTop: 16, padding: 12 }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Demo Accounts</p>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              <li>admin / Prison1234</li>
              <li>manager / Prison1234</li>
              <li>GP-10234 / Prison1234</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
