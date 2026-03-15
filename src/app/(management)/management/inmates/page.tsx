"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { fetchApi } from "@/lib/client-api";
import { appMeta } from "@/lib/seed-data";
import type { InmateProfile } from "@/types/domain";

export default function ManagementInmatesPage() {
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
        item.offense.toLowerCase().includes(q)
      );
    });
  }, [inmates, query]);

  const enrolledCount = inmates.filter((entry) => entry.biometricStatus === "Enrolled").length;
  const averageProgressLabel = "Visible through inmate profile reports";

  return (
    <RoleShell title={appMeta.name} subtitle="Management - Inmate Records" userName="Command Staff">
      <section className="grid-3">
        <StatCard label="Total Profiles" value={inmates.length} helper="All registered inmates" />
        <StatCard label="Biometric Enrolled" value={enrolledCount} helper="Ready for access verification" />
        <StatCard label="Progress Reports" value={filtered.length} helper={averageProgressLabel} />
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h1 className="section-title" style={{ marginBottom: 0 }}>
            Inmate Records
          </h1>
          <div className="inline-row">
            <input
              className="input"
              placeholder="Search inmate, warrant, station..."
              style={{ width: 280 }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        {busy ? <p className="quick-info">Loading inmate records...</p> : null}
        {error ? <p className="status-bad">{error}</p> : null}
        <DataTable
          rows={filtered}
          columns={[
            { key: "id", header: "Inmate ID", render: (row) => row.id },
            { key: "name", header: "Prisoner Name", render: (row) => row.fullName },
            { key: "warrant", header: "Warrant Serial", render: (row) => row.warrantSerialNumber },
            { key: "station", header: "Station", render: (row) => row.station },
            { key: "cell", header: "Block / Cell", render: (row) => `${row.blockName} / ${row.cellNumber}` },
            { key: "offense", header: "Offense", render: (row) => row.offense },
            {
              key: "actions",
              header: "Actions",
              render: (row) => (
                <Link className="button-soft" href={`/management/inmates/${row.id}`}>
                  View Profile
                </Link>
              ),
            },
          ]}
          emptyLabel="No inmate record matches your filters."
        />
      </section>
    </RoleShell>
  );
}
