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

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeEnrollment(entry: Enrollment): Enrollment {
  const progressPercent = clampNumber(entry.progressPercent, 0, 100);
  const lessonsCompleted =
    typeof entry.lessonsCompleted === "number"
      ? Math.max(0, Math.floor(entry.lessonsCompleted))
      : Math.max(0, Math.round(progressPercent / 8));
  const timeSpentMinutes =
    typeof entry.timeSpentMinutes === "number"
      ? Math.max(0, Math.floor(entry.timeSpentMinutes))
      : Math.max(0, lessonsCompleted * 35);
  const latestAssessmentScore =
    typeof entry.latestAssessmentScore === "number"
      ? clampNumber(Math.round(entry.latestAssessmentScore), 0, 100)
      : progressPercent >= 45
        ? clampNumber(Math.round(58 + progressPercent * 0.45), 0, 100)
        : undefined;
  const assessmentsTaken =
    typeof entry.assessmentsTaken === "number"
      ? Math.max(0, Math.floor(entry.assessmentsTaken))
      : latestAssessmentScore !== undefined
        ? 1
        : Math.max(0, Math.round(progressPercent / 35));

  return {
    ...entry,
    progressPercent,
    status: progressPercent >= 100 ? "Completed" : entry.status,
    lessonsCompleted,
    timeSpentMinutes,
    assessmentsTaken,
    latestAssessmentScore,
  };
}

function normalizeCourse(course: Course): Course {
  const rating = clampNumber(course.rating, 0, 5);
  const normalizedDuration =
    typeof course.durationHours === "number" && Number.isFinite(course.durationHours)
      ? Math.max(1, Math.round(course.durationHours))
      : undefined;

  return {
    ...course,
    rating: Number(rating.toFixed(1)),
    status: course.status ?? "active",
    durationHours: normalizedDuration,
    updatedAt: course.updatedAt ?? new Date().toISOString(),
  };
}

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
    const normalized = stored.map(normalizeCourse);
    browserStorage.saveState(STORAGE_KEYS.courses, normalized);
    return normalized;
  }

  const normalizedSeeds = seededCourses.map(normalizeCourse);
  browserStorage.saveState(STORAGE_KEYS.courses, normalizedSeeds);
  return normalizedSeeds;
}

export function addOrUpdateCourse(nextCourse: Course): Course[] {
  const current = getCoursesState();
  const normalized = normalizeCourse({
    ...nextCourse,
    updatedAt: new Date().toISOString(),
  });
  const withoutDuplicate = current.filter((item) => item.id !== normalized.id);
  const next = [normalized, ...withoutDuplicate];

  browserStorage.saveState(STORAGE_KEYS.courses, next);
  return next;
}

export function getEnrollmentsState(): Enrollment[] {
  const stored = browserStorage.loadState<Enrollment[]>(STORAGE_KEYS.enrollments);

  if (stored && stored.length > 0) {
    const normalized = stored.map(normalizeEnrollment);
    browserStorage.saveState(STORAGE_KEYS.enrollments, normalized);
    return normalized;
  }

  const normalizedSeeds = seededEnrollments.map(normalizeEnrollment);
  browserStorage.saveState(STORAGE_KEYS.enrollments, normalizedSeeds);
  return normalizedSeeds;
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
    normalizeEnrollment({
      studentId,
      courseId,
      progressPercent: 0,
      status: "In Progress",
      lessonsCompleted: 0,
      timeSpentMinutes: 0,
      assessmentsTaken: 0,
    }),
    ...current,
  ];

  browserStorage.saveState(STORAGE_KEYS.enrollments, next);
  return next;
}

export function updateEnrollmentProgress(input: {
  studentId: string;
  courseId: string;
  activityMinutes?: number;
  lessonsDelta?: number;
  progressDelta?: number;
  assessmentScore?: number;
}): Enrollment[] {
  const current = getEnrollmentsState();
  const now = new Date().toISOString();
  let updated = false;

  const next = current.map((entry) => {
    if (entry.studentId !== input.studentId || entry.courseId !== input.courseId) {
      return entry;
    }

    updated = true;
    const normalized = normalizeEnrollment(entry);
    const activityMinutes = Math.max(0, Math.floor(input.activityMinutes ?? 0));
    const lessonsDelta = Math.max(0, Math.floor(input.lessonsDelta ?? 0));
    const progressDelta = input.progressDelta ?? 0;
    const hasAssessment = typeof input.assessmentScore === "number" && Number.isFinite(input.assessmentScore);
    const normalizedAssessment = hasAssessment ? clampNumber(Math.round(input.assessmentScore ?? 0), 0, 100) : undefined;

    const progressPercent = clampNumber(normalized.progressPercent + progressDelta, 0, 100);
    const status: Enrollment["status"] = progressPercent >= 100 ? "Completed" : "In Progress";

    return {
      ...normalized,
      progressPercent,
      status,
      timeSpentMinutes: (normalized.timeSpentMinutes ?? 0) + activityMinutes,
      lessonsCompleted: (normalized.lessonsCompleted ?? 0) + lessonsDelta,
      assessmentsTaken: (normalized.assessmentsTaken ?? 0) + (hasAssessment ? 1 : 0),
      latestAssessmentScore: hasAssessment ? normalizedAssessment : normalized.latestAssessmentScore,
      lastActivityAt: now,
    };
  });

  if (!updated) {
    return current;
  }

  browserStorage.saveState(STORAGE_KEYS.enrollments, next);
  return next;
}

export function getLearningSummaryForStudent(studentId: string): {
  activeCourses: number;
  totalMinutes: number;
  lessonsCompleted: number;
  assessmentsTaken: number;
  averageAssessmentScore: number | null;
} {
  const items = getEnrollmentsForStudent(studentId).map(normalizeEnrollment);
  const activeCourses = items.length;
  const totalMinutes = items.reduce((sum, item) => sum + (item.timeSpentMinutes ?? 0), 0);
  const lessonsCompleted = items.reduce((sum, item) => sum + (item.lessonsCompleted ?? 0), 0);
  const assessmentsTaken = items.reduce((sum, item) => sum + (item.assessmentsTaken ?? 0), 0);
  const scored = items
    .map((item) => item.latestAssessmentScore)
    .filter((value): value is number => typeof value === "number");
  const averageAssessmentScore =
    scored.length > 0 ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length) : null;

  return {
    activeCourses,
    totalMinutes,
    lessonsCompleted,
    assessmentsTaken,
    averageAssessmentScore,
  };
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

export function getLatestOpenEntry(events: AttendanceEvent[]): AttendanceEvent | null {
  const sorted = [...events].sort((left, right) => {
    return new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime();
  });

  let openEntry: AttendanceEvent | null = null;

  for (const event of sorted) {
    if (event.type === "entry") {
      openEntry = event;
      continue;
    }

    if (event.type === "exit" && openEntry) {
      openEntry = null;
    }
  }

  return openEntry;
}

export function getSessionDurationMinutes(startedAt: string, endedAt = new Date().toISOString()): number {
  const startMs = new Date(startedAt).getTime();
  const endMs = new Date(endedAt).getTime();

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return 0;
  }

  return Math.max(0, Math.floor((endMs - startMs) / (1000 * 60)));
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
