import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasBlobStore, readJsonBlob, writeJsonBlob } from "@/lib/blob-store";
import type {
  AttendanceEvent,
  CertificateRecord,
  Course,
  CourseMaterialRecord,
  Enrollment,
  InmateProfile,
  ReportRecord,
} from "@/types/domain";
import { certificates, enrollments, inmates, reports, topRatedCourses } from "@/lib/seed-data";

export interface StaffRecord {
  id: string;
  username: string;
  fullName: string;
  staffType: "admin" | "management" | "lecturer" | "clocking_officer";
  email?: string;
  phone?: string;
  createdAt: string;
}

export interface AssignmentRecord {
  id: string;
  courseId: string;
  title: string;
  dueAt?: string;
  gradingMode?: "manual" | "auto";
  answerKey?: string;
  createdBy?: string;
  attachmentFileName?: string;
  attachmentMimeType?: string;
  attachmentSizeBytes?: number;
  attachmentPath?: string;
  attachmentDataUrl?: string;
  createdAt: string;
}

export interface SubmissionRecord {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  score?: number;
  feedback?: string;
  gradedBy?: string;
}

export interface ClockinSessionRecord {
  id: string;
  studentId: string;
  officerId?: string;
  room: string;
  deviceType: "Desktop PC" | "Laptop" | "Tablet";
  deviceSerialId: string;
  verifiedBy: "fingerprint" | "face";
  proof: "camera-face" | "device-biometric" | "simulated";
  status: "active" | "closed";
  clockInAt: string;
  clockOutAt?: string;
}

interface DomainState {
  inmates: InmateProfile[];
  staff: StaffRecord[];
  courses: Course[];
  courseMaterials: CourseMaterialRecord[];
  enrollments: Enrollment[];
  assignments: AssignmentRecord[];
  submissions: SubmissionRecord[];
  certificates: CertificateRecord[];
  attendance: AttendanceEvent[];
  reports: ReportRecord[];
  clockinSessions: ClockinSessionRecord[];
}

const STORE_PATH = path.join(process.cwd(), "data", "domain-store.json");
const STORE_BLOB_PATH = "system/domain-store.json";

function normalizeInmateProfile(inmate: InmateProfile): InmateProfile {
  const warrantSerialNumber = inmate.warrantSerialNumber?.trim() || inmate.prisonNumber?.trim() || inmate.id;
  const station = inmate.station?.trim() || inmate.assignedPrison?.trim() || "Unassigned";
  const blockName = inmate.blockName?.trim() || inmate.blockAssignment?.trim() || "TBD";

  return {
    ...inmate,
    warrantName: inmate.warrantName?.trim() || "Not recorded",
    warrantSerialNumber,
    prisonNumber: inmate.prisonNumber?.trim() || warrantSerialNumber,
    station,
    blockName,
    cellNumber: inmate.cellNumber?.trim() || "Not assigned",
    offense: inmate.offense?.trim() || "Not recorded",
    sentence: inmate.sentence?.trim() || "Not recorded",
    educationBackground: inmate.educationBackground?.trim() || "Not specified",
    skillInterests: Array.isArray(inmate.skillInterests) ? inmate.skillInterests.filter(Boolean) : [],
    blockAssignment: blockName,
    biometricStatus: inmate.biometricStatus ?? "Pending",
    assignedPrison: station,
  };
}

function defaultStaff(): StaffRecord[] {
  return [
    {
      id: "staff-admin-001",
      username: "admin",
      fullName: "Admin Officer",
      staffType: "admin",
      createdAt: new Date().toISOString(),
    },
    {
      id: "staff-mgr-001",
      username: "manager",
      fullName: "Command Staff",
      staffType: "management",
      createdAt: new Date().toISOString(),
    },
    {
      id: "staff-lect-001",
      username: "lecturer",
      fullName: "Samuel Appiah",
      staffType: "lecturer",
      createdAt: new Date().toISOString(),
    },
    {
      id: "staff-officer-001",
      username: "officer",
      fullName: "Clocking Officer",
      staffType: "clocking_officer",
      createdAt: new Date().toISOString(),
    },
  ];
}

function defaultState(): DomainState {
  return {
    inmates: inmates.map(normalizeInmateProfile),
    staff: defaultStaff(),
    courses: topRatedCourses,
    courseMaterials: [],
    enrollments,
    assignments: [],
    submissions: [],
    certificates,
    attendance: [],
    reports,
    clockinSessions: [],
  };
}

async function readState(): Promise<DomainState> {
  if (hasBlobStore()) {
    try {
      const parsed = await readJsonBlob<Partial<DomainState>>(STORE_BLOB_PATH);
      if (parsed) {
        return {
          ...defaultState(),
          ...parsed,
          inmates: (parsed.inmates ?? defaultState().inmates).map(normalizeInmateProfile),
          staff: parsed.staff ?? defaultState().staff,
          courses: parsed.courses ?? defaultState().courses,
          courseMaterials: parsed.courseMaterials ?? [],
          enrollments: parsed.enrollments ?? defaultState().enrollments,
          assignments: parsed.assignments ?? [],
          submissions: parsed.submissions ?? [],
          certificates: parsed.certificates ?? defaultState().certificates,
          attendance: parsed.attendance ?? [],
          reports: parsed.reports ?? defaultState().reports,
          clockinSessions: parsed.clockinSessions ?? [],
        };
      }
    } catch (error) {
      console.warn("[domain-store] Blob read failed, falling back to local file:", error);
    }
  }

  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<DomainState>;
    return {
      ...defaultState(),
      ...parsed,
      inmates: (parsed.inmates ?? defaultState().inmates).map(normalizeInmateProfile),
      staff: parsed.staff ?? defaultState().staff,
      courses: parsed.courses ?? defaultState().courses,
      courseMaterials: parsed.courseMaterials ?? [],
      enrollments: parsed.enrollments ?? defaultState().enrollments,
      assignments: parsed.assignments ?? [],
      submissions: parsed.submissions ?? [],
      certificates: parsed.certificates ?? defaultState().certificates,
      attendance: parsed.attendance ?? [],
      reports: parsed.reports ?? defaultState().reports,
      clockinSessions: parsed.clockinSessions ?? [],
    };
  } catch {
    return defaultState();
  }
}

async function writeState(next: DomainState): Promise<void> {
  if (hasBlobStore()) {
    await writeJsonBlob(STORE_BLOB_PATH, next);
    return;
  }

  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
}

export async function listDomainState(): Promise<DomainState> {
  return readState();
}

export async function restoreDomainStateFromSnapshot(snapshotState: Record<string, unknown>): Promise<DomainState> {
  const current = await readState();
  const raw = snapshotState as Partial<DomainState>;
  const restored: DomainState = {
    inmates: Array.isArray(raw.inmates) ? (raw.inmates as InmateProfile[]).map(normalizeInmateProfile) : current.inmates,
    staff: Array.isArray(raw.staff) ? (raw.staff as StaffRecord[]) : current.staff,
    courses: Array.isArray(raw.courses) ? (raw.courses as Course[]) : current.courses,
    courseMaterials: Array.isArray(raw.courseMaterials) ? (raw.courseMaterials as CourseMaterialRecord[]) : current.courseMaterials,
    enrollments: Array.isArray(raw.enrollments) ? (raw.enrollments as Enrollment[]) : current.enrollments,
    assignments: Array.isArray(raw.assignments) ? (raw.assignments as AssignmentRecord[]) : current.assignments,
    submissions: Array.isArray(raw.submissions) ? (raw.submissions as SubmissionRecord[]) : current.submissions,
    certificates: Array.isArray(raw.certificates) ? (raw.certificates as CertificateRecord[]) : current.certificates,
    attendance: Array.isArray(raw.attendance) ? (raw.attendance as AttendanceEvent[]) : current.attendance,
    reports: Array.isArray(raw.reports) ? (raw.reports as ReportRecord[]) : current.reports,
    clockinSessions: Array.isArray(raw.clockinSessions)
      ? (raw.clockinSessions as ClockinSessionRecord[])
      : current.clockinSessions,
  };
  await writeState(restored);
  return restored;
}

export async function listInmates(): Promise<InmateProfile[]> {
  const state = await readState();
  return state.inmates.map(normalizeInmateProfile);
}

export async function upsertInmate(input: InmateProfile): Promise<InmateProfile> {
  const state = await readState();
  const normalized = normalizeInmateProfile(input);
  const filtered = state.inmates.filter((entry) => entry.id !== normalized.id);
  state.inmates = [normalized, ...filtered];
  await writeState(state);
  return normalized;
}

export async function listStaff(): Promise<StaffRecord[]> {
  const state = await readState();
  return state.staff;
}

export async function upsertStaff(input: Omit<StaffRecord, "id" | "createdAt"> & { id?: string }): Promise<StaffRecord> {
  const state = await readState();
  const next: StaffRecord = {
    id: input.id || `staff-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  const filtered = state.staff.filter((entry) => entry.id !== next.id);
  state.staff = [next, ...filtered];
  await writeState(state);
  return next;
}

export async function listCourses(): Promise<Course[]> {
  const state = await readState();
  return state.courses;
}

export async function upsertCourse(input: Course): Promise<Course> {
  const state = await readState();
  const filtered = state.courses.filter((entry) => entry.id !== input.id);
  const next = { ...input, updatedAt: new Date().toISOString() };
  state.courses = [next, ...filtered];
  await writeState(state);
  return next;
}

export async function listEnrollments(studentId?: string): Promise<Enrollment[]> {
  const state = await readState();
  if (!studentId) {
    return state.enrollments;
  }
  return state.enrollments.filter((entry) => entry.studentId === studentId);
}

export async function listCourseMaterials(courseId?: string): Promise<CourseMaterialRecord[]> {
  const state = await readState();
  if (!courseId) {
    return state.courseMaterials;
  }
  return state.courseMaterials.filter((entry) => entry.courseId === courseId);
}

export async function getCourseMaterialById(materialId: string): Promise<CourseMaterialRecord | null> {
  const state = await readState();
  return state.courseMaterials.find((entry) => entry.id === materialId) ?? null;
}

export async function createCourseMaterial(input: Omit<CourseMaterialRecord, "id" | "createdAt">): Promise<CourseMaterialRecord> {
  const state = await readState();
  const next: CourseMaterialRecord = {
    id: `MAT-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  state.courseMaterials = [next, ...state.courseMaterials];
  await writeState(state);
  return next;
}

export async function upsertEnrollment(input: Enrollment): Promise<Enrollment> {
  const state = await readState();
  const filtered = state.enrollments.filter(
    (entry) => !(entry.studentId === input.studentId && entry.courseId === input.courseId),
  );
  state.enrollments = [input, ...filtered];
  await writeState(state);
  return input;
}

export async function listAssignments(courseId?: string): Promise<AssignmentRecord[]> {
  const state = await readState();
  if (!courseId) {
    return state.assignments;
  }
  return state.assignments.filter((entry) => entry.courseId === courseId);
}

export async function createAssignment(input: Omit<AssignmentRecord, "id" | "createdAt"> & { id?: string }): Promise<AssignmentRecord> {
  const state = await readState();
  const next: AssignmentRecord = {
    id: input.id ?? `ASG-${randomUUID()}`,
    createdAt: new Date().toISOString(),
    ...input,
  };
  state.assignments = [next, ...state.assignments];
  await writeState(state);
  return next;
}

export async function getAssignmentById(assignmentId: string): Promise<AssignmentRecord | null> {
  const state = await readState();
  return state.assignments.find((entry) => entry.id === assignmentId) ?? null;
}

export async function listSubmissions(assignmentId?: string): Promise<SubmissionRecord[]> {
  const state = await readState();
  if (!assignmentId) {
    return state.submissions;
  }
  return state.submissions.filter((entry) => entry.assignmentId === assignmentId);
}

export async function createSubmission(input: Omit<SubmissionRecord, "id">): Promise<SubmissionRecord> {
  const state = await readState();
  const next: SubmissionRecord = {
    id: `SUB-${randomUUID()}`,
    ...input,
  };
  state.submissions = [next, ...state.submissions];
  await writeState(state);
  return next;
}

export async function listCertificates(studentId?: string): Promise<CertificateRecord[]> {
  const state = await readState();
  if (!studentId) {
    return state.certificates;
  }
  return state.certificates.filter((entry) => entry.studentId === studentId);
}

export async function createCertificate(input: Omit<CertificateRecord, "id" | "issuedAt">): Promise<CertificateRecord> {
  const state = await readState();
  const next: CertificateRecord = {
    id: `CERT-${randomUUID()}`,
    issuedAt: new Date().toISOString(),
    ...input,
  };
  state.certificates = [next, ...state.certificates];
  await writeState(state);
  return next;
}

export async function listAttendance(studentId?: string): Promise<AttendanceEvent[]> {
  const state = await readState();
  if (!studentId) {
    return state.attendance;
  }
  return state.attendance.filter((entry) => entry.studentId === studentId);
}

export async function createAttendance(input: AttendanceEvent): Promise<AttendanceEvent> {
  const state = await readState();
  state.attendance = [input, ...state.attendance];
  await writeState(state);
  return input;
}

export async function listClockinSessions(status?: "active" | "closed"): Promise<ClockinSessionRecord[]> {
  const state = await readState();
  if (!status) {
    return state.clockinSessions;
  }
  return state.clockinSessions.filter((entry) => entry.status === status);
}

export async function createClockinSession(input: Omit<ClockinSessionRecord, "id" | "clockInAt" | "status">): Promise<ClockinSessionRecord> {
  const state = await readState();
  const next: ClockinSessionRecord = {
    id: `CLK-${randomUUID()}`,
    clockInAt: new Date().toISOString(),
    status: "active",
    ...input,
  };
  state.clockinSessions = [next, ...state.clockinSessions];
  await writeState(state);
  return next;
}

export async function closeClockinSession(sessionId: string): Promise<ClockinSessionRecord | null> {
  const state = await readState();
  const index = state.clockinSessions.findIndex((entry) => entry.id === sessionId);
  if (index < 0) {
    return null;
  }
  const updated: ClockinSessionRecord = {
    ...state.clockinSessions[index],
    status: "closed",
    clockOutAt: new Date().toISOString(),
  };
  state.clockinSessions[index] = updated;
  await writeState(state);
  return updated;
}

export async function listReports(): Promise<ReportRecord[]> {
  const state = await readState();
  return state.reports;
}

export async function createReportRecord(input: Omit<ReportRecord, "id" | "generatedAt">): Promise<ReportRecord> {
  const state = await readState();
  const next: ReportRecord = {
    id: `REP-${randomUUID()}`,
    generatedAt: new Date().toISOString(),
    ...input,
  };
  state.reports = [next, ...state.reports];
  await writeState(state);
  return next;
}
