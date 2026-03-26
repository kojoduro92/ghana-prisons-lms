"use client";

import { FormEvent, useEffect, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { appMeta } from "@/lib/seed-data";
import type { ReportRecord } from "@/types/domain";

const reportTypes: Array<ReportRecord["type"]> = ["attendance", "performance", "course-effectiveness"];
const reportFormats: Array<NonNullable<ReportRecord["format"]>> = ["pdf", "xlsx", "csv"];

export default function LecturerReportsPage() {
  const [records, setRecords] = useState<ReportRecord[]>([]);
  const [reportType, setReportType] = useState<ReportRecord["type"]>("performance");
  const [format, setFormat] = useState<NonNullable<ReportRecord["format"]>>("pdf");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadReports() {
    const data = await fetchApi<{ reports: ReportRecord[] }>("/api/v1/reports");
    setRecords(data.reports);
  }

  useEffect(() => {
    void loadReports().catch(() => undefined);
  }, []);

  async function onGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const data = await fetchApi<{ report: ReportRecord; downloadUrl: string }>("/api/v1/reports/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportType,
          format,
          generatedBy: "Samuel Appiah",
        }),
      });
      await loadReports();
      setNotice(`Report generated: ${data.downloadUrl}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Lecturer - Reports" userName="Samuel Appiah">
      <section className="panel">
        <h2 className="section-title">Generate Instruction Report</h2>
        <form onSubmit={onGenerate} className="inline-row">
          <select className="select" style={{ width: 240 }} value={reportType} onChange={(event) => setReportType(event.target.value as ReportRecord["type"])}>
            {reportTypes.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <select className="select" style={{ width: 160 }} value={format} onChange={(event) => setFormat(event.target.value as NonNullable<ReportRecord["format"]>)}>
            {reportFormats.map((entry) => (
              <option key={entry} value={entry}>
                {entry.toUpperCase()}
              </option>
            ))}
          </select>
          <button className="button-primary" type="submit" disabled={busy}>
            {busy ? "Generating..." : "Generate"}
          </button>
        </form>
        {notice ? <p className="status-ok">{notice}</p> : null}
        {error ? <p className="status-bad">{error}</p> : null}
      </section>

      <section className="panel">
        <h2 className="section-title">Report History</h2>
        <DataTable
          rows={records.filter((entry) => reportTypes.includes(entry.type))}
          columns={[
            { key: "type", header: "Type", render: (row) => row.type },
            { key: "format", header: "Format", render: (row) => row.format?.toUpperCase() ?? "-" },
            { key: "rows", header: "Rows", render: (row) => row.rowCount ?? "-" },
            { key: "generatedBy", header: "By", render: (row) => row.generatedBy },
            { key: "generatedAt", header: "At", render: (row) => formatDateTime(row.generatedAt) },
            {
              key: "download",
              header: "Download",
              render: (row) => (
                <a className="button-soft" href={`/api/v1/reports/${row.id}/download`}>
                  Download
                </a>
              ),
            },
          ]}
          emptyLabel="No lecturer reports available."
        />
      </section>
    </RoleShell>
  );
}
