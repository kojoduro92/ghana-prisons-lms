"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/components/data-table";
import { RoleShell } from "@/components/role-shell";
import { useAppShell } from "@/lib/app-shell";
import { formatDateTime } from "@/lib/format";
import {
  addAuditEvent,
  addReportRecord,
  getAttendanceEventsState,
  getEnrollmentsState,
  getInmatesState,
  getReportsState,
} from "@/lib/portal-state";
import { buildReportRows, downloadCsv, toCsv, type ReportRow } from "@/lib/reporting";
import { appMeta } from "@/lib/seed-data";
import type { ReportType } from "@/types/domain";

export default function ReportsWorkspacePage() {
  const { selectedInmateId } = useAppShell();
  const initialType = useMemo<ReportType>(() => {
    if (typeof window === "undefined") return "attendance";
    const queryType = new URLSearchParams(window.location.search).get("type");
    if (
      queryType === "attendance" ||
      queryType === "performance" ||
      queryType === "course-effectiveness" ||
      queryType === "operational-summary"
    ) {
      return queryType;
    }
    return "attendance";
  }, []);

  const queryStudentId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("studentId") ?? "";
  }, []);

  const [reportType, setReportType] = useState<ReportType>(initialType);
  const [scopeStudentId, setScopeStudentId] = useState(() => queryStudentId || selectedInmateId || "");
  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [reports, setReports] = useState(getReportsState);

  const attendanceEvents = useMemo(() => getAttendanceEventsState(), []);
  const enrollments = useMemo(() => getEnrollmentsState(), []);
  const inmates = useMemo(() => getInmatesState(), []);
  const generatedByType = useMemo(() => {
    const bucket = new Map<ReportType, number>();
    for (const record of reports) {
      bucket.set(record.type, (bucket.get(record.type) ?? 0) + 1);
    }
    return bucket;
  }, [reports]);

  const historyRows = reports.map((report) => ({
    id: report.id,
    type: report.type,
    generatedBy: report.generatedBy,
    generatedAt: report.generatedAt,
    scopeStudentId: report.scopeStudentId ?? "All",
    rowCount: report.rowCount ?? 0,
  }));

  function runGenerateReport(): void {
    const rows = buildReportRows({
      type: reportType,
      attendanceEvents,
      enrollments,
      inmates,
      scopeStudentId: scopeStudentId.trim() || undefined,
    });

    setReportRows(rows);
    setReports(
      addReportRecord(reportType, "Admin Officer", {
        scopeStudentId: scopeStudentId.trim() || undefined,
        rowCount: rows.length,
      }),
    );
    addAuditEvent({
      action: "report-generated",
      actor: "Admin Officer",
      result: "success",
      target: reportType,
      details: `Rows: ${rows.length}`,
    });
  }

  function runExportCsv(): void {
    const rows =
      reportRows.length > 0
        ? reportRows
        : buildReportRows({
            type: reportType,
            attendanceEvents,
            enrollments,
            inmates,
            scopeStudentId: scopeStudentId.trim() || undefined,
          });

    const csv = toCsv(rows);
    const suffix = scopeStudentId.trim() ? `-${scopeStudentId.trim()}` : "-all";
    downloadCsv(`report-${reportType}${suffix}.csv`, csv);
    addAuditEvent({
      action: "report-exported",
      actor: "Admin Officer",
      result: "success",
      target: reportType,
      details: `Rows: ${rows.length}`,
    });
  }

  return (
    <RoleShell title={appMeta.name} subtitle="Reports Workspace" userName="Admin Officer">
      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Generate / Export Reports
          </h2>
          <div className="inline-row">
            <select
              className="select"
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportType)}
            >
              <option value="attendance">Attendance</option>
              <option value="performance">Performance</option>
              <option value="course-effectiveness">Course Effectiveness</option>
              <option value="operational-summary">Operational Summary</option>
            </select>
            <input
              className="input"
              style={{ width: 220 }}
              placeholder="Student ID (optional)"
              value={scopeStudentId}
              onChange={(event) => setScopeStudentId(event.target.value)}
              data-testid="report-student-scope"
            />
            <button type="button" className="button-primary" onClick={runGenerateReport}>
              Generate Report
            </button>
            <button type="button" className="button-soft" onClick={runExportCsv}>
              Export CSV
            </button>
          </div>
        </div>

        <p className="quick-info" style={{ marginBottom: 0 }}>
          Generates local report snapshots and stores metadata in the audit-ready report history.
        </p>
      </section>

      <section className="panel">
        <h2 className="section-title">Report Preview</h2>
        <div className="grid-4" style={{ marginBottom: 12 }}>
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Attendance Reports</p>
            <h3>{generatedByType.get("attendance") ?? 0}</h3>
          </article>
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Performance Reports</p>
            <h3>{generatedByType.get("performance") ?? 0}</h3>
          </article>
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Course Effectiveness</p>
            <h3>{generatedByType.get("course-effectiveness") ?? 0}</h3>
          </article>
          <article className="panel" style={{ padding: 12 }}>
            <p className="quick-info">Operational Summary</p>
            <h3>{generatedByType.get("operational-summary") ?? 0}</h3>
          </article>
        </div>
        {reportRows.length > 0 ? (
          <DataTable
            rows={reportRows}
            columns={Object.keys(reportRows[0]).map((key) => ({
              key,
              header: key,
              render: (row: ReportRow) => String(row[key]),
            }))}
          />
        ) : (
          <p className="quick-info">No preview generated yet. Select options and click Generate Report.</p>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title">Report History</h2>
        <DataTable
          rows={historyRows}
          columns={[
            { key: "id", header: "Report ID", render: (row) => row.id },
            { key: "type", header: "Type", render: (row) => row.type },
            { key: "scope", header: "Scope", render: (row) => row.scopeStudentId },
            { key: "rows", header: "Rows", render: (row) => row.rowCount },
            { key: "by", header: "Generated By", render: (row) => row.generatedBy },
            { key: "time", header: "Generated At", render: (row) => formatDateTime(row.generatedAt) },
          ]}
        />
      </section>
    </RoleShell>
  );
}
