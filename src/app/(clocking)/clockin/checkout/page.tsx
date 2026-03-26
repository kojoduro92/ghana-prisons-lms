"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";

interface ClockinSessionRecord {
  id: string;
  studentId: string;
  room: string;
  deviceType: "Desktop PC" | "Laptop" | "Tablet";
  deviceSerialId: string;
  verifiedBy: "fingerprint" | "face";
  proof: "camera-face" | "device-biometric" | "simulated";
  status: "active" | "closed";
  clockInAt: string;
  clockOutAt?: string;
}

export default function ClockinCheckoutPage() {
  const [sessions, setSessions] = useState<ClockinSessionRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const data = await fetchApi<{ sessions: ClockinSessionRecord[] }>("/api/v1/access/sessions?status=active");
    setSessions(data.sessions);
  }

  useEffect(() => {
    void load().catch(() => undefined);
  }, []);

  async function handleClockout(sessionId: string) {
    setBusyId(sessionId);
    setNotice(null);
    setError(null);
    try {
      await fetchApi<{ clockedOut: boolean }>("/api/v1/access/clockout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      await load();
      setNotice(`Session ${sessionId.slice(0, 10)} clocked out.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to clock out session.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Clocking Officer - Clock-Out" userName="Clocking Officer">
      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Active Sessions Pending Clock-Out
          </h2>
          <button className="button-soft" type="button" onClick={() => void load().catch(() => undefined)}>
            Refresh
          </button>
        </div>
        {notice ? <p className="status-ok">{notice}</p> : null}
        {error ? <p className="status-bad">{error}</p> : null}
        <DataTable
          rows={sessions}
          columns={[
            { key: "id", header: "Session ID", render: (row) => row.id.slice(0, 12) },
            { key: "student", header: "Inmate", render: (row) => row.studentId },
            { key: "room", header: "Room", render: (row) => row.room },
            { key: "device", header: "Device", render: (row) => `${row.deviceType} (${row.deviceSerialId})` },
            { key: "clockIn", header: "Clock-In", render: (row) => formatDateTime(row.clockInAt) },
            {
              key: "action",
              header: "Action",
              render: (row) => (
                <button
                  className="button-primary"
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void handleClockout(row.id)}
                >
                  {busyId === row.id ? "Closing..." : "Clock Out"}
                </button>
              ),
            },
          ]}
          emptyLabel="No active sessions to close."
        />
      </section>
    </RoleShell>
  );
}
