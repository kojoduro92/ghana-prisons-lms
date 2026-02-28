"use client";

import type { AttendanceEvent, Enrollment, InmateProfile, ReportType } from "@/types/domain";

export type ReportRow = Record<string, string | number>;

function monthKey(timestamp: string): string | null {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 7);
}

export function buildReportRows(input: {
  type: ReportType;
  attendanceEvents: AttendanceEvent[];
  enrollments: Enrollment[];
  inmates: InmateProfile[];
  scopeStudentId?: string;
}): ReportRow[] {
  const { type, attendanceEvents, enrollments, inmates, scopeStudentId } = input;
  const scopedAttendance = scopeStudentId
    ? attendanceEvents.filter((event) => event.studentId === scopeStudentId)
    : attendanceEvents;
  const scopedEnrollments = scopeStudentId
    ? enrollments.filter((entry) => entry.studentId === scopeStudentId)
    : enrollments;
  const scopedInmates = scopeStudentId ? inmates.filter((inmate) => inmate.id === scopeStudentId) : inmates;

  if (type === "attendance") {
    return scopedAttendance.map((event) => ({
        studentId: event.studentId,
        type: event.type,
        facility: event.facility,
        verifiedBy: event.verifiedBy,
        timestamp: event.timestamp,
      }));
  }

  if (type === "performance") {
    return scopedEnrollments.map((entry) => ({
        studentId: entry.studentId,
        courseId: entry.courseId,
        progressPercent: entry.progressPercent,
        status: entry.status,
        timeSpentMinutes: entry.timeSpentMinutes ?? 0,
        lessonsCompleted: entry.lessonsCompleted ?? 0,
        assessmentsTaken: entry.assessmentsTaken ?? 0,
        latestAssessmentScore: entry.latestAssessmentScore ?? "-",
        lastActivityAt: entry.lastActivityAt ?? "-",
      }));
  }

  if (type === "course-effectiveness") {
    const grouped = new Map<string, number[]>();

    for (const enrollment of scopedEnrollments) {
      const bucket = grouped.get(enrollment.courseId) ?? [];
      bucket.push(enrollment.progressPercent);
      grouped.set(enrollment.courseId, bucket);
    }

    return Array.from(grouped.entries()).map(([courseId, values]) => {
      const average = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
      const completionCount = values.filter((value) => value >= 80).length;
      const assessments = scopedEnrollments
        .filter((entry) => entry.courseId === courseId)
        .map((entry) => entry.latestAssessmentScore)
        .filter((value): value is number => typeof value === "number");
      const avgAssessment =
        assessments.length > 0
          ? Math.round(assessments.reduce((sum, score) => sum + score, 0) / assessments.length)
          : "-";

      return {
        courseId,
        enrollmentCount: values.length,
        avgProgressPercent: Math.round(average),
        highProgressCount: completionCount,
        completionRatePercent: Math.round((completionCount / Math.max(1, values.length)) * 100),
        avgAssessmentScore: avgAssessment,
      };
    });
  }

  const monthSet = new Set<string>();
  for (const event of scopedAttendance) {
    const key = monthKey(event.timestamp);
    if (key) monthSet.add(key);
  }
  for (const enrollment of scopedEnrollments) {
    const key = enrollment.lastActivityAt ? monthKey(enrollment.lastActivityAt) : null;
    if (key) monthSet.add(key);
  }
  if (monthSet.size === 0) {
    monthSet.add(new Date().toISOString().slice(0, 7));
  }

  const periods = Array.from(monthSet.values()).sort((left, right) => (left < right ? 1 : -1)).slice(0, 6);

  return periods.map((period) => {
    const monthlyAttendance = scopedAttendance.filter((event) => event.timestamp.slice(0, 7) === period);
    const monthlyEntries = monthlyAttendance.filter((event) => event.type === "entry").length;
    const monthlyExits = monthlyAttendance.filter((event) => event.type === "exit").length;
    const attendanceClosurePercent =
      monthlyEntries > 0 ? Math.round((Math.min(monthlyEntries, monthlyExits) / monthlyEntries) * 100) : 0;

    const monthlyEnrollments = scopedEnrollments.filter((entry) => {
      if (!entry.lastActivityAt) return false;
      return entry.lastActivityAt.slice(0, 7) === period;
    });
    const activeLearners = new Set(monthlyAttendance.map((event) => event.studentId)).size;
    const engagedLearners = new Set(monthlyEnrollments.map((entry) => entry.studentId)).size;
    const avgProgressPercent =
      monthlyEnrollments.length > 0
        ? Math.round(monthlyEnrollments.reduce((sum, entry) => sum + entry.progressPercent, 0) / monthlyEnrollments.length)
        : 0;
    const highProgressSharePercent =
      monthlyEnrollments.length > 0
        ? Math.round((monthlyEnrollments.filter((entry) => entry.progressPercent >= 80).length / monthlyEnrollments.length) * 100)
        : 0;

    return {
      period,
      registeredInmates: scopedInmates.length,
      activeEnrollments: scopedEnrollments.length,
      attendanceEntries: monthlyEntries,
      attendanceExits: monthlyExits,
      attendanceClosurePercent,
      activeLearners,
      engagedLearners,
      avgProgressPercent,
      highProgressSharePercent,
    };
  });
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
