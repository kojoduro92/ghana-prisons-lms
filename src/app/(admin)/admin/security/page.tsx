"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { formatDateTime } from "@/lib/format";
import { addAuditEvent, getAttendanceEventsState, getAuditEventsState } from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";
import { STORAGE_KEYS, browserStorage } from "@/lib/storage";
import type { AuditAction, VerificationAttempt } from "@/types/domain";

const actionOptions: AuditAction[] = [
  "login-attempt",
  "login-success",
  "biometric-verification",
  "inmate-registered",
  "course-created",
  "course-enrolled",
  "course-progress-updated",
  "certificate-issued",
  "report-generated",
  "report-exported",
  "state-snapshot-created",
  "state-snapshot-restored",
];

interface SnapshotMeta {
  id: string;
  createdAt: string;
  actor: string;
  note?: string;
  checksum: string;
  keyId?: string;
}

interface PendingRestoreApproval {
  snapshotId: string;
  approvalToken: string;
  challenge: string;
  expiresAt: string;
  requiredPhrase: string;
}

const SNAPSHOT_STORAGE_KEYS = Object.values(STORAGE_KEYS).filter(
  (key) => key !== STORAGE_KEYS.session && key !== STORAGE_KEYS.selectedInmate,
);

export default function SecurityAuditPage() {
  const [query, setQuery] = useState("");
  const [resultFilter, setResultFilter] = useState<"all" | "success" | "failed">("all");
  const [actionFilter, setActionFilter] = useState<"all" | AuditAction>("all");
  const [snapshotNote, setSnapshotNote] = useState("");
  const [snapshotNotice, setSnapshotNotice] = useState<string | null>(null);
  const [snapshotBusy, setSnapshotBusy] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [pendingRestore, setPendingRestore] = useState<PendingRestoreApproval | null>(null);
  const [restoreChallengeInput, setRestoreChallengeInput] = useState("");
  const [restorePhraseInput, setRestorePhraseInput] = useState("");

  const [auditEvents] = useState(getAuditEventsState);
  const [attendanceEvents] = useState(getAttendanceEventsState);
  const [verificationLogs] = useState(
    () => browserStorage.loadState<VerificationAttempt[]>(STORAGE_KEYS.verificationLogs) ?? [],
  );

  useEffect(() => {
    void refreshSnapshots();
  }, []);

  async function refreshSnapshots(): Promise<void> {
    try {
      const response = await fetch("/api/state/snapshots");
      if (!response.ok) {
        setSnapshotNotice("Unable to load server snapshots.");
        return;
      }

      const payload = (await response.json()) as { snapshots?: SnapshotMeta[] };
      setSnapshots(payload.snapshots ?? []);
    } catch {
      setSnapshotNotice("Unable to connect to local snapshot service.");
    }
  }

  function collectStateForSnapshot(): Record<string, unknown> {
    if (typeof window === "undefined") {
      return {};
    }

    const state: Record<string, unknown> = {};

    for (const key of SNAPSHOT_STORAGE_KEYS) {
      const raw = window.localStorage.getItem(key);
      if (raw === null) continue;
      try {
        state[key] = JSON.parse(raw) as unknown;
      } catch {
        state[key] = raw;
      }
    }

    return state;
  }

  function applySnapshotState(snapshotState: Record<string, unknown>): void {
    if (typeof window === "undefined") {
      return;
    }

    for (const key of SNAPSHOT_STORAGE_KEYS) {
      if (!(key in snapshotState)) {
        window.localStorage.removeItem(key);
        continue;
      }

      const value = snapshotState[key];
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }

  function downloadSnapshotJson(filename: string, payload: unknown): void {
    const content = JSON.stringify(payload, null, 2);
    const blob = new Blob([content], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreateSnapshot(): Promise<void> {
    setSnapshotBusy(true);
    setSnapshotNotice(null);

    try {
      const response = await fetch("/api/state/snapshots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          actor: "Admin Officer",
          note: snapshotNote.trim() || undefined,
          state: collectStateForSnapshot(),
        }),
      });

      if (!response.ok) {
        setSnapshotNotice("Snapshot creation failed.");
        setSnapshotBusy(false);
        return;
      }

      setSnapshotNote("");
      setSnapshotNotice("Local server snapshot created successfully.");
      addAuditEvent({
        action: "state-snapshot-created",
        actor: "Admin Officer",
        result: "success",
        target: "local-server",
        details: "Operational state snapshot created",
      });
      await refreshSnapshots();
    } catch {
      setSnapshotNotice("Snapshot creation failed due to network/service error.");
    } finally {
      setSnapshotBusy(false);
    }
  }

  async function handleRequestRestoreApproval(snapshotId: string): Promise<void> {
    setSnapshotBusy(true);
    setSnapshotNotice(null);

    try {
      const response = await fetch(`/api/state/snapshots/${encodeURIComponent(snapshotId)}/restore-approval`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stage: "request",
          actor: "Admin Officer",
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setSnapshotNotice(payload?.error ?? "Unable to request restore approval.");
        setSnapshotBusy(false);
        return;
      }

      const payload = (await response.json()) as {
        approvalToken?: string;
        challenge?: string;
        expiresAt?: string;
        requiredPhrase?: string;
      };
      if (!payload.approvalToken || !payload.challenge || !payload.expiresAt || !payload.requiredPhrase) {
        setSnapshotNotice("Restore approval payload was invalid.");
        setSnapshotBusy(false);
        return;
      }

      setPendingRestore({
        snapshotId,
        approvalToken: payload.approvalToken,
        challenge: payload.challenge,
        expiresAt: payload.expiresAt,
        requiredPhrase: payload.requiredPhrase,
      });
      setRestoreChallengeInput("");
      setRestorePhraseInput("");
      setSnapshotNotice(`Approval requested for ${snapshotId}. Enter code and phrase to confirm restore.`);
    } catch {
      setSnapshotNotice("Restore approval request failed due to network/service error.");
    } finally {
      setSnapshotBusy(false);
    }
  }

  async function handleConfirmRestore(): Promise<void> {
    if (!pendingRestore) {
      return;
    }

    setSnapshotBusy(true);
    setSnapshotNotice(null);

    try {
      const response = await fetch(
        `/api/state/snapshots/${encodeURIComponent(pendingRestore.snapshotId)}/restore-approval`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stage: "confirm",
            approvalToken: pendingRestore.approvalToken,
            challenge: restoreChallengeInput.trim(),
            confirmationPhrase: restorePhraseInput.trim(),
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setSnapshotNotice(payload?.error ?? "Snapshot restore failed.");
        setSnapshotBusy(false);
        return;
      }

      const payload = (await response.json()) as {
        snapshot?: { id: string; state: Record<string, unknown> };
      };
      if (!payload.snapshot?.state) {
        setSnapshotNotice("Snapshot payload was invalid.");
        setSnapshotBusy(false);
        return;
      }

      applySnapshotState(payload.snapshot.state);
      setPendingRestore(null);
      setRestoreChallengeInput("");
      setRestorePhraseInput("");
      setSnapshotNotice(`Snapshot ${payload.snapshot.id} restored to browser storage.`);
      addAuditEvent({
        action: "state-snapshot-restored",
        actor: "Admin Officer",
        result: "success",
        target: payload.snapshot.id,
        details: "Browser state restored from encrypted local server snapshot with signed approval",
      });
      await refreshSnapshots();
    } catch {
      setSnapshotNotice("Snapshot restore failed due to network/service error.");
    } finally {
      setSnapshotBusy(false);
    }
  }

  function handleDownloadLiveState(): void {
    const timestamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
    downloadSnapshotJson(`portal-live-state-${timestamp}.json`, {
      createdAt: new Date().toISOString(),
      actor: "Admin Officer",
      state: collectStateForSnapshot(),
    });
    setSnapshotNotice("Live portal state downloaded.");
  }

  const filtered = useMemo(() => {
    return auditEvents.filter((event) => {
      const matchesQuery =
        event.actor.toLowerCase().includes(query.toLowerCase()) ||
        (event.target ?? "").toLowerCase().includes(query.toLowerCase()) ||
        (event.details ?? "").toLowerCase().includes(query.toLowerCase());

      const matchesResult = resultFilter === "all" ? true : event.result === resultFilter;
      const matchesAction = actionFilter === "all" ? true : event.action === actionFilter;
      return matchesQuery && matchesResult && matchesAction;
    });
  }, [auditEvents, actionFilter, query, resultFilter]);

  const failedVerifications = verificationLogs.filter((log) => log.result === "failed").length;
  const failedLogins = auditEvents.filter((event) => event.action === "login-attempt" && event.result === "failed").length;
  const adminChangeEvents = auditEvents.filter((event) =>
    [
      "inmate-registered",
      "course-created",
      "course-enrolled",
      "course-progress-updated",
      "certificate-issued",
      "report-generated",
      "report-exported",
      "state-snapshot-created",
      "state-snapshot-restored",
    ].includes(event.action),
  ).length;
  const recentBiometricLogs = [...verificationLogs]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 8);

  return (
    <RoleShell title={appMeta.name} subtitle="Security & Audit Center" userName="Admin Officer">
      <section className="grid-3">
        <StatCard label="Audit Events" value={auditEvents.length} helper="Persisted security actions" />
        <StatCard label="Failed Biometric Attempts" value={failedVerifications} helper="From verification flow" />
        <StatCard label="Attendance Events" value={attendanceEvents.length} helper="Entry and exit records" />
      </section>
      <section className="grid-3">
        <StatCard label="Failed Login Attempts" value={failedLogins} helper="Credential access denials" />
        <StatCard label="Admin Change Events" value={adminChangeEvents} helper="Registration, reports, and course updates" />
        <StatCard label="Recent Biometric Logs" value={recentBiometricLogs.length} helper="Most recent verification attempts" />
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Local State Backup & Recovery
          </h2>
          <div className="inline-row">
            <button type="button" className="button-soft" onClick={handleDownloadLiveState}>
              Download Live State
            </button>
            <button type="button" className="button-primary" onClick={() => void handleCreateSnapshot()} disabled={snapshotBusy}>
              {snapshotBusy ? "Working..." : "Create Server Snapshot"}
            </button>
          </div>
        </div>

        <div className="inline-row" style={{ justifyContent: "flex-start" }}>
          <input
            className="input"
            style={{ width: 420 }}
            placeholder="Snapshot note (e.g. Before monthly reporting reset)"
            value={snapshotNote}
            onChange={(event) => setSnapshotNote(event.target.value)}
          />
        </div>
        {snapshotNotice ? <p className="quick-info" style={{ marginTop: 10 }}>{snapshotNotice}</p> : null}
        {pendingRestore ? (
          <div className="panel" style={{ marginTop: 12, padding: 12 }}>
            <p style={{ margin: "0 0 8px", fontWeight: 700 }}>
              Restore Approval Pending: {pendingRestore.snapshotId}
            </p>
            <p className="quick-info" style={{ margin: "0 0 8px" }}>
              Enter challenge code <strong>{pendingRestore.challenge}</strong> and phrase{" "}
              <strong>{pendingRestore.requiredPhrase}</strong> before {formatDateTime(pendingRestore.expiresAt)}.
            </p>
            <div className="grid-2">
              <label>
                Challenge Code
                <input
                  className="input"
                  value={restoreChallengeInput}
                  onChange={(event) => setRestoreChallengeInput(event.target.value)}
                  placeholder={pendingRestore.challenge}
                />
              </label>
              <label>
                Confirmation Phrase
                <input
                  className="input"
                  value={restorePhraseInput}
                  onChange={(event) => setRestorePhraseInput(event.target.value)}
                  placeholder={pendingRestore.requiredPhrase}
                />
              </label>
            </div>
            <div className="inline-row" style={{ marginTop: 10, justifyContent: "flex-start" }}>
              <button
                type="button"
                className="button-primary"
                onClick={() => void handleConfirmRestore()}
                disabled={snapshotBusy}
              >
                {snapshotBusy ? "Working..." : "Confirm Restore"}
              </button>
              <button
                type="button"
                className="button-soft"
                onClick={() => {
                  setPendingRestore(null);
                  setRestoreChallengeInput("");
                  setRestorePhraseInput("");
                }}
                disabled={snapshotBusy}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <DataTable
            rows={snapshots}
            columns={[
              { key: "id", header: "Snapshot ID", render: (row) => row.id },
              { key: "actor", header: "Actor", render: (row) => row.actor },
              { key: "note", header: "Note", render: (row) => row.note ?? "-" },
              { key: "checksum", header: "Checksum", render: (row) => row.checksum.slice(0, 12) },
              { key: "key", header: "Key ID", render: (row) => row.keyId ?? "-" },
              { key: "createdAt", header: "Created At", render: (row) => formatDateTime(row.createdAt) },
              {
                key: "actions",
                header: "Actions",
                render: (row) => (
                  <button
                    type="button"
                    className="button-soft"
                    onClick={() => void handleRequestRestoreApproval(row.id)}
                    disabled={snapshotBusy}
                  >
                    Request Restore
                  </button>
                ),
              },
            ]}
            emptyLabel="No server snapshots yet."
          />
        </div>
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Security Event Log
          </h2>
          <div className="inline-row">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="input"
              style={{ width: 240 }}
              placeholder="Search actor, target, details"
            />
            <select
              className="select"
              value={resultFilter}
              onChange={(event) => setResultFilter(event.target.value as "all" | "success" | "failed")}
            >
              <option value="all">All results</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
            </select>
            <select
              className="select"
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value as "all" | AuditAction)}
            >
              <option value="all">All actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DataTable
          rows={filtered}
          columns={[
            { key: "id", header: "Event ID", render: (row) => row.id },
            { key: "action", header: "Action", render: (row) => row.action },
            { key: "actor", header: "Actor", render: (row) => row.actor },
            { key: "target", header: "Target", render: (row) => row.target ?? "-" },
            { key: "result", header: "Result", render: (row) => row.result },
            { key: "details", header: "Details", render: (row) => row.details ?? "-" },
            { key: "time", header: "Timestamp", render: (row) => formatDateTime(row.timestamp) },
          ]}
          emptyLabel="No security events for current filters."
        />
      </section>

      <section className="grid-2">
        <div className="panel">
          <h2 className="section-title">Biometric Verification Attempts</h2>
          <DataTable
            rows={recentBiometricLogs}
            columns={[
              { key: "method", header: "Method", render: (row) => row.method },
              { key: "result", header: "Result", render: (row) => row.result },
              { key: "device", header: "Device", render: (row) => row.deviceId },
              { key: "time", header: "Timestamp", render: (row) => formatDateTime(row.timestamp) },
            ]}
            emptyLabel="No biometric attempts logged yet."
          />
        </div>

        <div className="panel">
          <h2 className="section-title">Recent Facility Access Events</h2>
          <DataTable
            rows={attendanceEvents.slice(0, 8)}
            columns={[
              { key: "student", header: "Student ID", render: (row) => row.studentId },
              { key: "type", header: "Type", render: (row) => row.type.toUpperCase() },
              { key: "facility", header: "Facility", render: (row) => row.facility },
              { key: "method", header: "Method", render: (row) => row.verifiedBy },
              { key: "time", header: "Timestamp", render: (row) => formatDateTime(row.timestamp) },
            ]}
            emptyLabel="No facility access events logged yet."
          />
        </div>
      </section>
    </RoleShell>
  );
}
