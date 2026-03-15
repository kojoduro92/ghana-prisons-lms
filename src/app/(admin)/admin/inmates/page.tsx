"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { fetchApi } from "@/lib/client-api";
import { appMeta } from "@/lib/seed-data";
import type { InmateProfile } from "@/types/domain";

export default function AdminInmatesPage() {
  const [inmates, setInmates] = useState<InmateProfile[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        const data = await fetchApi<{ inmates: InmateProfile[] }>("/api/v1/inmates");
        if (!mounted) return;
        setInmates(data.inmates);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load inmates.");
      } finally {
        if (mounted) setBusy(false);
      }
    }
    void run();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inmates;
    return inmates.filter((item) => {
      return (
        item.fullName.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.warrantSerialNumber.toLowerCase().includes(q) ||
        item.station.toLowerCase().includes(q) ||
        item.blockName.toLowerCase().includes(q) ||
        item.cellNumber.toLowerCase().includes(q)
      );
    });
  }, [inmates, query]);

  const enrolledCount = inmates.filter((entry) => entry.biometricStatus === "Enrolled").length;

  return (
    <RoleShell title={appMeta.name} subtitle="Admin - Inmate Registry" userName="Admin Officer">
      <section className="grid-3">
        <StatCard label="Total Profiles" value={inmates.length} helper="All registered inmates" />
        <StatCard label="Biometric Enrolled" value={enrolledCount} helper="Ready for access verification" />
        <StatCard label="Pending Enrollment" value={Math.max(0, inmates.length - enrolledCount)} helper="Pending biometric capture" />
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h1 className="section-title" style={{ marginBottom: 0 }}>
            Inmate Profiles
          </h1>
          <div className="inline-row">
            <input
              className="input"
              placeholder="Search inmate, warrant, station..."
              style={{ width: 260 }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <Link href="/admin/register-inmate" className="button-primary">
              Register Inmate
            </Link>
          </div>
        </div>
        {busy ? <p className="quick-info">Loading inmate profiles...</p> : null}
        {error ? <p className="status-bad">{error}</p> : null}
        <DataTable
          rows={filtered}
          columns={[
            { key: "id", header: "Inmate ID", render: (row) => row.id },
            { key: "name", header: "Prisoner Name", render: (row) => row.fullName },
            { key: "warrant", header: "Warrant Serial", render: (row) => row.warrantSerialNumber },
            { key: "station", header: "Station", render: (row) => row.station },
            { key: "cell", header: "Block / Cell", render: (row) => `${row.blockName} / ${row.cellNumber}` },
            {
              key: "biometric",
              header: "Biometric",
              render: (row) => (
                <span className={row.biometricStatus === "Enrolled" ? "status-ok" : "status-bad"}>{row.biometricStatus}</span>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <Link className="button-soft" href={`/admin/inmates/${row.id}`}>
                  Open Profile
                </Link>
              ),
            },
          ]}
          emptyLabel="No inmate profile matches your filters."
        />
      </section>
    </RoleShell>
  );
}
