"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSessionFromCredential, findDemoCredential, roleHomePath } from "@/lib/auth";
import { useAppShell } from "@/lib/app-shell";
import { addAuditEvent } from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";

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
    <div className="portal-root" style={{ display: "grid", placeItems: "center" }}>
      <div className="panel" style={{ width: "min(460px, 100%)", padding: 24 }}>
        <div className="inline-row" style={{ justifyContent: "center", marginBottom: 16 }}>
          <div className="logo-pill">GP</div>
        </div>
        <h1 style={{ textAlign: "center", marginBottom: 6 }}>{appMeta.name}</h1>
        <p className="quick-info" style={{ textAlign: "center", marginBottom: 18 }}>
          Secure Admin and Role Access
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
  );
}
