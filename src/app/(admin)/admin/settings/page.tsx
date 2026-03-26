"use client";

import { FormEvent, useEffect, useState } from "react";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";

interface SnapshotMeta {
  id: string;
  createdAt: string;
  actor: string;
  note?: string;
  checksum: string;
  keyId?: string;
}

export default function AdminSettingsPage() {
  const [strictMode, setStrictMode] = useState(true);
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [note, setNote] = useState("");
  const [restorePhrase, setRestorePhrase] = useState("");
  const [selectedSnapshot, setSelectedSnapshot] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSnapshots() {
    const data = await fetchApi<{ snapshots: SnapshotMeta[] }>("/api/v1/security/snapshots?limit=20");
    setSnapshots(data.snapshots);
  }

  useEffect(() => {
    void loadSnapshots().catch(() => undefined);
  }, []);

  async function handleCreateSnapshot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await fetchApi<{ snapshot: SnapshotMeta }>("/api/v1/security/snapshots", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note }),
      });
      setNote("");
      await loadSnapshots();
      setNotice("State snapshot created successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create snapshot.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestore() {
    if (!selectedSnapshot) {
      setError("Select a snapshot to restore.");
      return;
    }

    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      await fetchApi<{ restored: boolean }>(`/api/v1/security/snapshots/${selectedSnapshot}/restore`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmationPhrase: restorePhrase }),
      });
      setRestorePhrase("");
      setNotice("Snapshot restored successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to restore snapshot.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Admin - System Settings" userName="Admin Officer">
      <section className="grid-3">
        <StatCard label="Security Snapshots" value={snapshots.length} helper="Encrypted restore points" />
        <StatCard label="Strict Biometric Mode" value={strictMode ? "Enabled" : "Fallback"} helper="Controls access verification policy" />
        <StatCard label="Audit Readiness" value="Operational" helper="Audit and restore services online" />
      </section>

      <section className="grid-2">
        <article className="panel">
          <h2 className="section-title">Security and Access Policy</h2>
          <p className="quick-info" style={{ marginBottom: 12 }}>
            Configure local facility safeguards and recovery controls.
          </p>
          <div className="panel" style={{ padding: 14, marginBottom: 10 }}>
            <div className="inline-row">
              <strong>Strict Biometric Verification</strong>
              <button
                type="button"
                className="button-soft"
                onClick={() => setStrictMode((current) => !current)}
                aria-label="Toggle strict biometric mode"
              >
                {strictMode ? "Enabled" : "Disabled"}
              </button>
            </div>
            <p className="quick-info" style={{ marginTop: 8 }}>
              Strict mode requires live biometric proof before access grants. Fallback mode enables supervised simulated proof.
            </p>
          </div>
        </article>

        <article className="panel">
          <h2 className="section-title">Create State Snapshot</h2>
          <form onSubmit={handleCreateSnapshot} style={{ display: "grid", gap: 10 }}>
            <label>
              Snapshot Note
              <textarea
                className="textarea"
                rows={3}
                placeholder="Optional change note for this snapshot"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <button className="button-primary" type="submit" disabled={busy}>
              {busy ? "Processing..." : "Create Snapshot"}
            </button>
          </form>
        </article>
      </section>

      <section className="panel">
        <h2 className="section-title">Snapshot Restore</h2>
        <div className="grid-2">
          <div style={{ display: "grid", gap: 8 }}>
            <label>
              Snapshot
              <select
                className="select"
                value={selectedSnapshot}
                onChange={(event) => setSelectedSnapshot(event.target.value)}
              >
                <option value="">Select snapshot</option>
                {snapshots.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {formatDateTime(entry.createdAt)} - {entry.actor}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Confirmation Phrase
              <input
                className="input"
                value={restorePhrase}
                onChange={(event) => setRestorePhrase(event.target.value)}
                placeholder="RESTORE SNAPSHOT"
              />
            </label>
            <button className="button-soft" type="button" onClick={handleRestore} disabled={busy}>
              Restore Snapshot
            </button>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {snapshots.map((entry) => (
              <article className="panel" key={entry.id} style={{ padding: 10 }}>
                <div className="inline-row">
                  <strong>{formatDateTime(entry.createdAt)}</strong>
                  <span className="quick-info">{entry.actor}</span>
                </div>
                <p className="quick-info" style={{ margin: "6px 0 0" }}>
                  {entry.note ?? "No note"} | checksum {entry.checksum.slice(0, 12)}...
                </p>
              </article>
            ))}
          </div>
        </div>
        {notice ? <p className="status-ok">{notice}</p> : null}
        {error ? <p className="status-bad">{error}</p> : null}
      </section>
    </RoleShell>
  );
}
