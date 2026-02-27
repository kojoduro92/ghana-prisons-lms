"use client";

import type { AttendanceEvent, Enrollment, InmateProfile, ReportType } from "@/types/domain";

export type ReportRow = Record<string, string | number>;

export function buildReportRows(input: {
  type: ReportType;
  attendanceEvents: AttendanceEvent[];
  enrollments: Enrollment[];
  inmates: InmateProfile[];
  scopeStudentId?: string;
}): ReportRow[] {
  const { type, attendanceEvents, enrollments, inmates, scopeStudentId } = input;

  if (type === "attendance") {
    return attendanceEvents
      .filter((event) => (scopeStudentId ? event.studentId === scopeStudentId : true))
      .map((event) => ({
        studentId: event.studentId,
        type: event.type,
        facility: event.facility,
        verifiedBy: event.verifiedBy,
        timestamp: event.timestamp,
      }));
  }

  if (type === "performance") {
    return enrollments
      .filter((entry) => (scopeStudentId ? entry.studentId === scopeStudentId : true))
      .map((entry) => ({
        studentId: entry.studentId,
        courseId: entry.courseId,
        progressPercent: entry.progressPercent,
        status: entry.status,
      }));
  }

  if (type === "course-effectiveness") {
    const grouped = new Map<string, number[]>();

    for (const enrollment of enrollments) {
      const bucket = grouped.get(enrollment.courseId) ?? [];
      bucket.push(enrollment.progressPercent);
      grouped.set(enrollment.courseId, bucket);
    }

    return Array.from(grouped.entries()).map(([courseId, values]) => {
      const average = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
      const completionCount = values.filter((value) => value >= 80).length;

      return {
        courseId,
        enrollmentCount: values.length,
        avgProgressPercent: Math.round(average),
        highProgressCount: completionCount,
      };
    });
  }

  return inmates.map((inmate) => ({
    studentId: inmate.id,
    name: inmate.fullName,
    biometricStatus: inmate.biometricStatus,
    assignedPrison: inmate.assignedPrison,
  }));
}

export function toCsv(rows: ReportRow[]): string {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(",")];

  for (const row of rows) {
    const values = headers.map((header) => {
      const raw = String(row[header] ?? "");
      const escaped = raw.replaceAll('"', '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
