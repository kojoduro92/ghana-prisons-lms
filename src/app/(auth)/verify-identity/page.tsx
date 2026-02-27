"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { roleHomePath } from "@/lib/auth";
import { useAppShell } from "@/lib/app-shell";
import { formatDateTime } from "@/lib/format";
import { addAttendanceEvent, addAuditEvent, createEntryEvent } from "@/lib/portal-state";
import { STORAGE_KEYS, browserStorage } from "@/lib/storage";
import { appendVerificationLog, simulateVerificationAttempt } from "@/lib/verification";
import type { VerificationAttempt } from "@/types/domain";

export default function VerificationPage() {
  const router = useRouter();
  const { session } = useAppShell();
  const [method, setMethod] = useState<VerificationAttempt["method"]>("fingerprint");
  const [result, setResult] = useState<VerificationAttempt["result"] | null>(null);
  const [logs, setLogs] = useState<VerificationAttempt[]>(
    () => browserStorage.loadState<VerificationAttempt[]>(STORAGE_KEYS.verificationLogs) ?? [],
  );

  const nextPath = useMemo(() => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("next");
  }, []);

  function runVerification() {
    const attempt = simulateVerificationAttempt(method);
    const nextLogs = appendVerificationLog(logs, attempt);

    browserStorage.saveState(STORAGE_KEYS.verificationLogs, nextLogs);
    setLogs(nextLogs);
    setResult(attempt.result);
    addAuditEvent({
      action: "biometric-verification",
      actor: session?.displayName ?? session?.userId ?? "unknown",
      result: attempt.result,
      target: attempt.method,
      details: `Device: ${attempt.deviceId}`,
    });

    if (attempt.result === "success") {
      addAttendanceEvent(createEntryEvent(session, attempt));
    }
  }

  const continuePath = nextPath || roleHomePath(session?.role ?? "inmate");

  return (
    <div className="portal-root" style={{ display: "grid", placeItems: "center" }}>
      <div className="panel" style={{ width: "min(760px, 100%)" }}>
        <h1 style={{ marginBottom: 6 }}>Identity Verification</h1>
        <p className="quick-info" style={{ marginBottom: 16 }}>
          Identity verification required before system access.
        </p>
        {!session ? (
          <p className="status-bad" style={{ marginBottom: 12 }}>
            Session not found. Please sign in again to continue.
          </p>
        ) : null}

        <div className="grid-2">
          <button
            type="button"
            className={method === "fingerprint" ? "button-primary" : "button-soft"}
            onClick={() => setMethod("fingerprint")}
          >
            Fingerprint Authentication
          </button>
          <button
            type="button"
            className={method === "face" ? "button-primary" : "button-soft"}
            onClick={() => setMethod("face")}
          >
            Facial Recognition Scan
          </button>
        </div>

        <div className="inline-row" style={{ marginTop: 16 }}>
          <button type="button" className="button-primary" onClick={runVerification} data-testid="verify-identity-btn">
            Run Secure Verification
          </button>
          {result === "success" ? <span className="status-ok">Verification successful</span> : null}
          {result === "failed" ? <span className="status-bad">Verification failed. Retry required.</span> : null}
        </div>

        <div className="panel" style={{ marginTop: 16 }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Recent Verification Logs</p>
          <div style={{ display: "grid", gap: 8 }}>
            {logs.slice(0, 5).map((entry) => (
              <div key={`${entry.timestamp}-${entry.method}`} className="inline-row">
                <span>
                  {entry.method} - {entry.result}
                </span>
                <span className="quick-info">{formatDateTime(entry.timestamp)}</span>
              </div>
            ))}
            {logs.length === 0 ? <p className="quick-info">No verification events yet.</p> : null}
          </div>
        </div>

        <div className="inline-row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          <button
            type="button"
            className="button-primary"
            disabled={result !== "success" || !session}
            onClick={() => router.push(continuePath)}
          >
            Continue to Portal
          </button>
        </div>
      </div>
    </div>
  );
}
