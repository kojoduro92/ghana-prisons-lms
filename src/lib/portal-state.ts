"use client";

import type {
  AttendanceEvent,
  InmateProfile,
  ReportRecord,
  ReportType,
  UserSession,
  VerificationAttempt,
} from "@/types/domain";
import { inmates as seededInmates, reports as seededReports } from "@/lib/seed-data";
import { STORAGE_KEYS, browserStorage } from "@/lib/storage";

export function getInmatesState(): InmateProfile[] {
  const stored = browserStorage.loadState<InmateProfile[]>(STORAGE_KEYS.inmates);

  if (stored && stored.length > 0) {
    return stored;
  }

  browserStorage.saveState(STORAGE_KEYS.inmates, seededInmates);
  return seededInmates;
}

export function saveInmatesState(nextInmates: InmateProfile[]): void {
  browserStorage.saveState(STORAGE_KEYS.inmates, nextInmates);
}

export function addOrUpdateInmate(nextInmate: InmateProfile): InmateProfile[] {
  const current = getInmatesState();
  const withoutDuplicate = current.filter((item) => item.id !== nextInmate.id);
  const next = [nextInmate, ...withoutDuplicate];

  saveInmatesState(next);
  return next;
}

export function getAttendanceEventsState(): AttendanceEvent[] {
  return browserStorage.loadState<AttendanceEvent[]>(STORAGE_KEYS.attendanceEvents) ?? [];
}

export function addAttendanceEvent(event: AttendanceEvent, maxItems = 200): AttendanceEvent[] {
  const next = [event, ...getAttendanceEventsState()].slice(0, maxItems);
  browserStorage.saveState(STORAGE_KEYS.attendanceEvents, next);
  return next;
}

export function createAttendanceEvent(
  session: UserSession | null,
  type: AttendanceEvent["type"],
  verifiedBy: AttendanceEvent["verifiedBy"],
  facility = "Digital Learning Lab",
): AttendanceEvent {
  return {
    studentId: session?.studentId ?? session?.userId ?? "unknown",
    type,
    facility,
    timestamp: new Date().toISOString(),
    verifiedBy,
  };
}

export function createEntryEvent(
  session: UserSession | null,
  attempt: VerificationAttempt,
  facility = "Digital Learning Lab",
): AttendanceEvent {
  return {
    studentId: session?.studentId ?? session?.userId ?? "unknown",
    type: "entry",
    facility,
    timestamp: attempt.timestamp,
    verifiedBy: attempt.method,
  };
}

export function createExitEvent(
  session: UserSession | null,
  verifiedBy: AttendanceEvent["verifiedBy"] = "fingerprint",
  facility = "Digital Learning Lab",
): AttendanceEvent {
  return createAttendanceEvent(session, "exit", verifiedBy, facility);
}

export function getAttendanceEventsForStudent(studentId: string): AttendanceEvent[] {
  return getAttendanceEventsState().filter((event) => event.studentId === studentId);
}

export function summarizeAttendance(events: AttendanceEvent[]): {
  entries: number;
  exits: number;
  completionRate: number;
} {
  const entries = events.filter((event) => event.type === "entry").length;
  const exits = events.filter((event) => event.type === "exit").length;
  const completionRate = entries > 0 ? Math.round((Math.min(entries, exits) / entries) * 100) : 0;

  return { entries, exits, completionRate };
}

export function getReportsState(): ReportRecord[] {
  const stored = browserStorage.loadState<ReportRecord[]>(STORAGE_KEYS.reports);

  if (stored && stored.length > 0) {
    return stored;
  }

  browserStorage.saveState(STORAGE_KEYS.reports, seededReports);
  return seededReports;
}

export function addReportRecord(
  type: ReportType,
  generatedBy: string,
  options?: { scopeStudentId?: string; rowCount?: number },
): ReportRecord[] {
  const current = getReportsState();
  const nextRecord: ReportRecord = {
    id: `REP-${String(current.length + 1).padStart(3, "0")}`,
    type,
    generatedAt: new Date().toISOString(),
    generatedBy,
    scopeStudentId: options?.scopeStudentId,
    rowCount: options?.rowCount,
  };

  const next = [nextRecord, ...current].slice(0, 200);
  browserStorage.saveState(STORAGE_KEYS.reports, next);
  return next;
}
