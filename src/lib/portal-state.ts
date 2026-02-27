"use client";

import type {
  AttendanceEvent,
  AuditAction,
  AuditEvent,
  CertificateRecord,
  Course,
  Enrollment,
  InmateProfile,
  ReportRecord,
  ReportType,
  UserSession,
  VerificationAttempt,
} from "@/types/domain";
import {
  certificates as seededCertificates,
  enrollments as seededEnrollments,
  inmates as seededInmates,
  reports as seededReports,
  topRatedCourses as seededCourses,
} from "@/lib/seed-data";
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

export function getCoursesState(): Course[] {
  const stored = browserStorage.loadState<Course[]>(STORAGE_KEYS.courses);

  if (stored && stored.length > 0) {
    return stored;
  }

  browserStorage.saveState(STORAGE_KEYS.courses, seededCourses);
  return seededCourses;
}

export function addOrUpdateCourse(nextCourse: Course): Course[] {
  const current = getCoursesState();
  const withoutDuplicate = current.filter((item) => item.id !== nextCourse.id);
  const next = [nextCourse, ...withoutDuplicate];

  browserStorage.saveState(STORAGE_KEYS.courses, next);
  return next;
}

export function getEnrollmentsState(): Enrollment[] {
  const stored = browserStorage.loadState<Enrollment[]>(STORAGE_KEYS.enrollments);

  if (stored && stored.length > 0) {
    return stored;
  }

  browserStorage.saveState(STORAGE_KEYS.enrollments, seededEnrollments);
  return seededEnrollments;
}

export function getEnrollmentsForStudent(studentId: string): Enrollment[] {
  return getEnrollmentsState().filter((entry) => entry.studentId === studentId);
}

export function enrollStudentInCourse(studentId: string, courseId: string): Enrollment[] {
  const current = getEnrollmentsState();
  const existing = current.find((item) => item.studentId === studentId && item.courseId === courseId);

  if (existing) {
    return current;
  }

  const next: Enrollment[] = [
    { studentId, courseId, progressPercent: 0, status: "In Progress" },
    ...current,
  ];

  browserStorage.saveState(STORAGE_KEYS.enrollments, next);
  return next;
}

export function getCertificatesState(): CertificateRecord[] {
  const stored = browserStorage.loadState<CertificateRecord[]>(STORAGE_KEYS.certificates);

  if (stored && stored.length > 0) {
    return stored;
  }

  browserStorage.saveState(STORAGE_KEYS.certificates, seededCertificates);
  return seededCertificates;
}

export function getCertificatesForStudent(studentId: string): CertificateRecord[] {
  return getCertificatesState().filter((item) => item.studentId === studentId);
}

export function issueCertificate(input: {
  studentId: string;
  courseId: string;
  issuedBy: string;
  note?: string;
}): CertificateRecord[] {
  const current = getCertificatesState();
  const existing = current.find(
    (item) => item.studentId === input.studentId && item.courseId === input.courseId,
  );

  if (existing) {
    return current;
  }

  const maxId = current.reduce((max, item) => {
    const value = Number(item.id.replace("CERT-", ""));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);

  const nextRecord: CertificateRecord = {
    id: `CERT-${String(maxId + 1).padStart(3, "0")}`,
    studentId: input.studentId,
    courseId: input.courseId,
    issuedBy: input.issuedBy,
    issuedAt: new Date().toISOString(),
    note: input.note,
  };

  const next = [nextRecord, ...current];
  browserStorage.saveState(STORAGE_KEYS.certificates, next);
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

export function getAuditEventsState(): AuditEvent[] {
  return browserStorage.loadState<AuditEvent[]>(STORAGE_KEYS.auditEvents) ?? [];
}

export function addAuditEvent(input: {
  action: AuditAction;
  actor: string;
  result: "success" | "failed";
  target?: string;
  details?: string;
}): AuditEvent[] {
  const current = getAuditEventsState();
  const nextEvent: AuditEvent = {
    id: `AUD-${String(current.length + 1).padStart(4, "0")}`,
    action: input.action,
    actor: input.actor,
    result: input.result,
    target: input.target,
    details: input.details,
    timestamp: new Date().toISOString(),
  };

  const next = [nextEvent, ...current].slice(0, 400);
  browserStorage.saveState(STORAGE_KEYS.auditEvents, next);
  return next;
}
