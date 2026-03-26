"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { listPrototypeClockinSessions } from "@/lib/browser-prototype-store";
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

export default function ClockinSessionsPage() {
  const [sessions, setSessions] = useState<ClockinSessionRecord[]>([]);
  const [status, setStatus] = useState<"all" | "active" | "closed">("all");

  const load = useCallback(async (nextStatus: "all" | "active" | "closed") => {
    const suffix = nextStatus === "all" ? "" : `?status=${nextStatus}`;
    try {
      const data = await fetchApi<{ sessions: ClockinSessionRecord[] }>(`/api/v1/access/sessions${suffix}`);
      setSessions([...data.sessions, ...listPrototypeClockinSessions(nextStatus)]);
    } catch {
      setSessions(listPrototypeClockinSessions(nextStatus));
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const suffix = "";
    void fetchApi<{ sessions: ClockinSessionRecord[] }>(`/api/v1/access/sessions${suffix}`)
      .then((data) => {
        if (!mounted) return;
        setSessions([...data.sessions, ...listPrototypeClockinSessions("all")]);
      })
      .catch(() => {
        if (!mounted) return;
        setSessions(listPrototypeClockinSessions("all"));
      });
    return () => {
      mounted = false;
    };
  }, []);

  const sorted = useMemo(() => {
    return [...sessions].sort((left, right) => (left.clockInAt < right.clockInAt ? 1 : -1));
  }, [sessions]);

  return (
    <RoleShell title={appMeta.name} subtitle="Clocking Officer - Session Monitor" userName="Clocking Officer">
      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Clock-In Session Ledger
          </h2>
          <div className="inline-row">
            <select
              className="select"
              value={status}
              onChange={(event) => {
                const next = event.target.value as "all" | "active" | "closed";
                setStatus(next);
                void load(next).catch(() => undefined);
              }}
            >
              <option value="all">All Sessions</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
            </select>
            <button className="button-soft" type="button" onClick={() => void load(status).catch(() => undefined)}>
              Refresh
            </button>
          </div>
        </div>
        <DataTable
          rows={sorted}
          columns={[
            { key: "id", header: "Session ID", render: (row) => row.id.slice(0, 12) },
            { key: "student", header: "Inmate", render: (row) => row.studentId },
            { key: "room", header: "Room", render: (row) => row.room },
            { key: "device", header: "Device", render: (row) => `${row.deviceType} (${row.deviceSerialId})` },
            { key: "method", header: "Method", render: (row) => row.verifiedBy },
            { key: "status", header: "Status", render: (row) => <span className={row.status === "active" ? "status-ok" : "status-neutral"}>{row.status}</span> },
            { key: "clockIn", header: "Clock-In", render: (row) => formatDateTime(row.clockInAt) },
            { key: "clockOut", header: "Clock-Out", render: (row) => (row.clockOutAt ? formatDateTime(row.clockOutAt) : "-") },
          ]}
          emptyLabel="No sessions found."
        />
      </section>
    </RoleShell>
  );
}
