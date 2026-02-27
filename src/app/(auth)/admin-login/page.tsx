"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSessionFromCredential, findDemoCredential, roleHomePath } from "@/lib/auth";
import { persistSession } from "@/lib/auth-client";
import { appMeta } from "@/lib/seed-data";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Prison1234");
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("next");
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const credential = findDemoCredential(username, password);
    if (!credential) {
      setError("Invalid credentials. Use the demo accounts listed below.");
      return;
    }

    const session = createSessionFromCredential(credential);
    persistSession(session);

    const destination = nextPath || roleHomePath(credential.role);
    router.push(`/verify-identity?next=${encodeURIComponent(destination)}`);
  }

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
