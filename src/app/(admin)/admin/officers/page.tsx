"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";

interface StaffRecord {
  id: string;
  username: string;
  fullName: string;
  staffType: "admin" | "management" | "lecturer" | "clocking_officer";
  email?: string;
  phone?: string;
  createdAt: string;
}

export default function AdminOfficersPage() {
  const [staff, setStaff] = useState<StaffRecord[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  async function loadStaff() {
    const data = await fetchApi<{ staff: StaffRecord[] }>("/api/v1/staff");
    setStaff(data.staff.filter((entry) => entry.staffType === "clocking_officer"));
  }

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await loadStaff();
        if (!mounted) return;
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Unable to load officers.");
      } finally {
        if (mounted) setBusy(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((entry) => {
      return (
        entry.fullName.toLowerCase().includes(q) ||
        entry.username.toLowerCase().includes(q) ||
        (entry.email ?? "").toLowerCase().includes(q) ||
        (entry.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [query, staff]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      await fetchApi<{ staff: StaffRecord }>("/api/v1/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username,
          fullName,
          email: email || undefined,
          phone: phone || undefined,
          staffType: "clocking_officer",
        }),
      });
      await loadStaff();
      setNotice("Clocking officer account created.");
      setUsername("");
      setFullName("");
      setEmail("");
      setPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create officer.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Admin - Clocking Officers" userName="Admin Officer">
      <section className="grid-3">
        <StatCard label="Total Officers" value={staff.length} helper="Clock-in and lab access supervisors" />
        <StatCard label="Contacts With Phone" value={staff.filter((entry) => Boolean(entry.phone)).length} helper="Rapid support coverage" />
        <StatCard label="Contacts With Email" value={staff.filter((entry) => Boolean(entry.email)).length} helper="Formal communication support" />
      </section>

      <section className="grid-2">
        <article className="panel">
          <h2 className="section-title">Officer Registry</h2>
          <div className="inline-row" style={{ marginBottom: 10 }}>
            <input
              className="input"
              placeholder="Search officers..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{ width: 280 }}
            />
          </div>
          {busy ? <p className="quick-info">Loading officers...</p> : null}
          {error ? <p className="status-bad">{error}</p> : null}
          <DataTable
            rows={filtered}
            columns={[
              { key: "name", header: "Name", render: (row) => row.fullName },
              { key: "user", header: "Username", render: (row) => row.username },
              { key: "email", header: "Email", render: (row) => row.email ?? "-" },
              { key: "phone", header: "Phone", render: (row) => row.phone ?? "-" },
              { key: "createdAt", header: "Created", render: (row) => formatDateTime(row.createdAt) },
            ]}
            emptyLabel="No officers found."
          />
        </article>

        <article className="panel">
          <h2 className="section-title">Create Officer Account</h2>
          <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
            <label>
              Full Name
              <input className="input" value={fullName} onChange={(event) => setFullName(event.target.value)} required />
            </label>
            <label>
              Username
              <input className="input" value={username} onChange={(event) => setUsername(event.target.value)} required />
            </label>
            <label>
              Email
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>
              Phone
              <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </label>
            {notice ? <p className="status-ok">{notice}</p> : null}
            <button className="button-primary" type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Officer"}
            </button>
          </form>
        </article>
      </section>
    </RoleShell>
  );
}
