import type {
  AttendanceEvent,
  CertificateRecord,
  Course,
  CourseMaterialRecord,
  Enrollment,
  InmateProfile,
  ReportRecord,
  Role,
} from "@/types/domain";
import type {
  AssignmentRecord,
  ClockinSessionRecord,
  StaffRecord,
  SubmissionRecord,
} from "@/lib/domain-store";
import * as jsonStore from "@/lib/domain-store";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/security/password";

const DEFAULT_PASSWORD = "Prison1234";
const DEFAULT_THUMBNAIL = "/assets/education/course-computer.jpg";

function hasMysqlDatasource(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  return url.startsWith("mysql://");
}

async function withBackend<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  if (!hasMysqlDatasource()) {
    return fallback();
  }
  try {
    return await primary();
  } catch (error) {
    console.warn("[repositories] Prisma unavailable, using compatibility store:", error);
    return fallback();
  }
}

function mapStaffTypeToRole(staffType: StaffRecord["staffType"]): Role {
  if (staffType === "admin") return "admin";
  if (staffType === "management") return "management";
  if (staffType === "lecturer") return "lecturer";
  return "clocking_officer";
}

function normalizeSkillInterests(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string") as string[];
  }
  return [];
}

function formatDateOnly(date: Date | null): string {
  if (!date) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

async function ensureRoleId(roleName: Role): Promise<string> {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (role) return role.id;
  const created = await prisma.role.create({ data: { name: roleName } });
  return created.id;
}

function mapInmateProfile(record: {
  studentId: string;
  fullName: string;
  warrantName?: string | null;
  warrantSerialNumber?: string | null;
  prisonNumber: string;
  dateOfBirth: Date | null;
  gender: string;
  station?: string | null;
  blockName?: string | null;
  cellNumber?: string | null;
  offense?: string | null;
  sentence?: string | null;
  educationBackground: string | null;
  skillInterests: unknown;
  blockAssignment: string;
  biometricStatus: string;
  assignedPrison: string;
}): InmateProfile {
  return {
    id: record.studentId,
    fullName: record.fullName,
    warrantName: record.warrantName ?? "Not recorded",
    warrantSerialNumber: record.warrantSerialNumber ?? record.prisonNumber,
    prisonNumber: record.prisonNumber,
    dateOfBirth: formatDateOnly(record.dateOfBirth),
    gender: (record.gender as "Male" | "Female" | "Other") ?? "Other",
    station: record.station ?? record.assignedPrison,
    blockName: record.blockName ?? record.blockAssignment,
    cellNumber: record.cellNumber ?? "Not assigned",
    offense: record.offense ?? "Not recorded",
    sentence: record.sentence ?? "Not recorded",
    educationBackground: record.educationBackground ?? "Unknown",
    skillInterests: normalizeSkillInterests(record.skillInterests),
    blockAssignment: record.blockAssignment,
    biometricStatus: (record.biometricStatus as "Enrolled" | "Pending") ?? "Pending",
    assignedPrison: record.assignedPrison,
  };
}

export async function listDomainState() {
  return withBackend(
    async () => {
      const [inmates, staff, courses, enrollments, assignments, submissions, certificates, attendance, reports, clockinSessions] =
        await Promise.all([
          listInmates(),
          listStaff(),
          listCourses(),
          listEnrollments(),
          listAssignments(),
          listSubmissions(),
          listCertificates(),
          listAttendance(),
          listReports(),
          listClockinSessions(),
        ]);
      return {
        inmates,
        staff,
        courses,
        enrollments,
        assignments,
        submissions,
        certificates,
        attendance,
        reports,
        clockinSessions,
      };
    },
    async () => jsonStore.listDomainState(),
  );
}

export async function listInmates(): Promise<InmateProfile[]> {
  return withBackend(
    async () => {
      const rows = await prisma.inmateProfile.findMany({
        orderBy: { createdAt: "desc" },
      });
      return rows.map(mapInmateProfile);
    },
    async () => jsonStore.listInmates(),
  );
}

export async function upsertInmate(input: InmateProfile): Promise<InmateProfile> {
  return withBackend(
    async () => {
      const roleId = await ensureRoleId("inmate");
      const passwordHash = await hashPassword(DEFAULT_PASSWORD);
      const user = await prisma.user.upsert({
        where: { username: input.id },
        update: {
          roleId,
          status: "active",
        },
        create: {
          username: input.id,
          roleId,
          passwordHash,
          status: "active",
        },
      });

      const upserted = await prisma.inmateProfile.upsert({
        where: { studentId: input.id },
        update: {
          fullName: input.fullName,
          warrantName: input.warrantName,
          warrantSerialNumber: input.warrantSerialNumber,
          prisonNumber: input.prisonNumber,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender,
          station: input.station,
          blockName: input.blockName,
          cellNumber: input.cellNumber,
          offense: input.offense,
          sentence: input.sentence,
          educationBackground: input.educationBackground,
          skillInterests: input.skillInterests,
          blockAssignment: input.blockAssignment,
          biometricStatus: input.biometricStatus,
          assignedPrison: input.assignedPrison,
        },
        create: {
          userId: user.id,
          studentId: input.id,
          warrantName: input.warrantName,
          warrantSerialNumber: input.warrantSerialNumber,
          prisonNumber: input.prisonNumber,
          fullName: input.fullName,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
          gender: input.gender,
          station: input.station,
          blockName: input.blockName,
          cellNumber: input.cellNumber,
          offense: input.offense,
          sentence: input.sentence,
          educationBackground: input.educationBackground,
          skillInterests: input.skillInterests,
          blockAssignment: input.blockAssignment,
          biometricStatus: input.biometricStatus,
          assignedPrison: input.assignedPrison,
        },
      });

      return mapInmateProfile(upserted);
    },
    async () => jsonStore.upsertInmate(input),
  );
}

export async function listStaff(): Promise<StaffRecord[]> {
  return withBackend(
    async () => {
      const rows = await prisma.staffProfile.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
      });
      return rows.map((row) => ({
        id: row.id,
        username: row.user.username,
        fullName: row.fullName,
        staffType: row.staffType,
        email: row.email ?? undefined,
        phone: row.phone ?? undefined,
        createdAt: row.createdAt.toISOString(),
      }));
    },
    async () => jsonStore.listStaff(),
  );
}

export async function upsertStaff(
  input: Omit<StaffRecord, "id" | "createdAt"> & { id?: string },
): Promise<StaffRecord> {
  return withBackend(
    async () => {
      const roleId = await ensureRoleId(mapStaffTypeToRole(input.staffType));
      const passwordHash = await hashPassword(DEFAULT_PASSWORD);
      const user = await prisma.user.upsert({
        where: { username: input.username },
        update: {
          roleId,
          status: "active",
        },
        create: {
          username: input.username,
          roleId,
          passwordHash,
          status: "active",
        },
      });

      const code = input.id ?? `STF-${Date.now()}`;
      const profile = await prisma.staffProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: input.fullName,
          staffType: input.staffType,
          email: input.email ?? null,
          phone: input.phone ?? null,
        },
        create: {
          userId: user.id,
          staffCode: code,
          fullName: input.fullName,
          staffType: input.staffType,
          email: input.email ?? null,
          phone: input.phone ?? null,
        },
      });

      return {
        id: profile.id,
        username: user.username,
        fullName: profile.fullName,
        staffType: profile.staffType,
        email: profile.email ?? undefined,
        phone: profile.phone ?? undefined,
        createdAt: profile.createdAt.toISOString(),
      };
    },
    async () => jsonStore.upsertStaff(input),
  );
}

export async function listCourses(): Promise<Course[]> {
  return withBackend(
    async () => {
      const rows = await prisma.course.findMany({
        include: { category: true, lecturer: true },
        orderBy: { updatedAt: "desc" },
      });

      return rows.map((row) => ({
        id: row.courseCode,
        title: row.title,
        category: row.category.name,
        instructor: row.lecturer?.fullName ?? "Unassigned",
        rating: 4.5,
        thumbnail: DEFAULT_THUMBNAIL,
        summary: row.description ?? undefined,
        level: (row.level as "Beginner" | "Intermediate" | "Advanced") ?? "Beginner",
        durationHours: row.durationWeeks ? row.durationWeeks * 5 : undefined,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
      }));
    },
    async () => jsonStore.listCourses(),
  );
}

export async function upsertCourse(input: Course): Promise<Course> {
  return withBackend(
    async () => {
      const category = await prisma.courseCategory.upsert({
        where: { name: input.category },
        update: {},
        create: { name: input.category },
      });

      const lecturer = await prisma.staffProfile.findFirst({
        where: {
          staffType: "lecturer",
          fullName: {
            contains: input.instructor,
          },
        },
      });

      const course = await prisma.course.upsert({
        where: { courseCode: input.id },
        update: {
          title: input.title,
          description: input.summary ?? null,
          categoryId: category.id,
          lecturerStaffId: lecturer?.id ?? null,
          level: input.level ?? null,
          durationWeeks: input.durationHours ? Math.max(1, Math.round(input.durationHours / 5)) : null,
          status: input.status ?? "active",
        },
        create: {
          courseCode: input.id,
          title: input.title,
          description: input.summary ?? null,
          categoryId: category.id,
          lecturerStaffId: lecturer?.id ?? null,
          level: input.level ?? null,
          durationWeeks: input.durationHours ? Math.max(1, Math.round(input.durationHours / 5)) : null,
          status: input.status ?? "active",
        },
      });

      return {
        ...input,
        status: course.status,
        updatedAt: course.updatedAt.toISOString(),
      };
    },
    async () => jsonStore.upsertCourse(input),
  );
}

export async function listEnrollments(studentId?: string): Promise<Enrollment[]> {
  return withBackend(
    async () => {
      const rows = await prisma.courseEnrollment.findMany({
        where: studentId
          ? {
              inmate: {
                studentId,
              },
            }
          : undefined,
        include: {
          inmate: true,
          course: true,
        },
        orderBy: { updatedAt: "desc" },
      });
      return rows.map((row) => ({
        studentId: row.inmate.studentId,
        courseId: row.course.courseCode,
        progressPercent: row.completionPct,
        status: row.completionStatus === "completed" ? "Completed" : "In Progress",
        timeSpentMinutes: row.timeSpentMinutes,
        lessonsCompleted: row.lessonsCompleted,
        assessmentsTaken: row.assessmentsTaken,
        latestAssessmentScore: row.latestScore ?? undefined,
        lastActivityAt: row.lastActivityAt?.toISOString(),
      }));
    },
    async () => jsonStore.listEnrollments(studentId),
  );
}

export async function listCourseMaterials(courseId?: string): Promise<CourseMaterialRecord[]> {
  return withBackend(
    async () => {
      const rows = await prisma.courseMaterial.findMany({
        where: courseId
          ? {
              course: {
                courseCode: courseId,
              },
            }
          : undefined,
        include: {
          course: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return rows.map((row) => ({
        id: row.id,
        courseId: row.course.courseCode,
        title: row.title,
        kind: row.kind as CourseMaterialRecord["kind"],
        mimeType: row.mimeType,
        fileName: row.fileName,
        fileSizeBytes: row.fileSizeBytes,
        storagePath: row.storagePath,
        uploadedBy: row.uploadedByName,
        createdAt: row.createdAt.toISOString(),
      }));
    },
    async () => jsonStore.listCourseMaterials(courseId),
  );
}

export async function getCourseMaterialById(materialId: string): Promise<CourseMaterialRecord | null> {
  return withBackend(
    async () => {
      const row = await prisma.courseMaterial.findUnique({
        where: { id: materialId },
        include: { course: true },
      });

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        courseId: row.course.courseCode,
        title: row.title,
        kind: row.kind as CourseMaterialRecord["kind"],
        mimeType: row.mimeType,
        fileName: row.fileName,
        fileSizeBytes: row.fileSizeBytes,
        storagePath: row.storagePath,
        uploadedBy: row.uploadedByName,
        createdAt: row.createdAt.toISOString(),
      };
    },
    async () => jsonStore.getCourseMaterialById(materialId),
  );
}

export async function createCourseMaterial(input: Omit<CourseMaterialRecord, "id" | "createdAt">): Promise<CourseMaterialRecord> {
  return withBackend(
    async () => {
      const course = await prisma.course.findUnique({ where: { courseCode: input.courseId } });
      if (!course) {
        throw new Error("Course not found for material upload.");
      }

      const created = await prisma.courseMaterial.create({
        data: {
          courseId: course.id,
          title: input.title,
          kind: input.kind,
          mimeType: input.mimeType,
          fileName: input.fileName,
          fileSizeBytes: input.fileSizeBytes,
          storagePath: input.storagePath,
          uploadedByName: input.uploadedBy,
        },
      });

      return {
        id: created.id,
        ...input,
        createdAt: created.createdAt.toISOString(),
      };
    },
    async () => jsonStore.createCourseMaterial(input),
  );
}

export async function upsertEnrollment(input: Enrollment): Promise<Enrollment> {
  return withBackend(
    async () => {
      const inmate = await prisma.inmateProfile.findUnique({ where: { studentId: input.studentId } });
      const course = await prisma.course.findUnique({ where: { courseCode: input.courseId } });
      if (!inmate || !course) {
        throw new Error("Enrollment requires valid inmate and course.");
      }

      await prisma.courseEnrollment.upsert({
        where: {
          inmateId_courseId: {
            inmateId: inmate.id,
            courseId: course.id,
          },
        },
        update: {
          completionPct: input.progressPercent,
          completionStatus: input.status === "Completed" ? "completed" : "in_progress",
          timeSpentMinutes: input.timeSpentMinutes ?? 0,
          lessonsCompleted: input.lessonsCompleted ?? 0,
          assessmentsTaken: input.assessmentsTaken ?? 0,
          latestScore: input.latestAssessmentScore ?? null,
          lastActivityAt: input.lastActivityAt ? new Date(input.lastActivityAt) : null,
        },
        create: {
          inmateId: inmate.id,
          courseId: course.id,
          completionPct: input.progressPercent,
          completionStatus: input.status === "Completed" ? "completed" : "in_progress",
          timeSpentMinutes: input.timeSpentMinutes ?? 0,
          lessonsCompleted: input.lessonsCompleted ?? 0,
          assessmentsTaken: input.assessmentsTaken ?? 0,
          latestScore: input.latestAssessmentScore ?? null,
          lastActivityAt: input.lastActivityAt ? new Date(input.lastActivityAt) : null,
        },
      });
      return input;
    },
    async () => jsonStore.upsertEnrollment(input),
  );
}

export async function listAssignments(courseId?: string): Promise<AssignmentRecord[]> {
  return withBackend(
    async () => {
      const rows = await prisma.assignment.findMany({
        where: courseId
          ? {
              course: {
                courseCode: courseId,
              },
            }
          : undefined,
        include: {
          course: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return rows.map(
        (row): AssignmentRecord => ({
          id: row.id,
          courseId: row.course.courseCode,
          title: row.title,
          dueAt: row.dueAt?.toISOString(),
          gradingMode: (row.gradingMode as "manual" | "auto") ?? undefined,
        answerKey: row.answerKey ?? undefined,
        createdBy: row.createdById ?? undefined,
        attachmentFileName: row.attachmentFileName ?? undefined,
        attachmentMimeType: row.attachmentMimeType ?? undefined,
          attachmentSizeBytes: row.attachmentSizeBytes ?? undefined,
          attachmentPath: row.attachmentPath ?? undefined,
          createdAt: row.createdAt.toISOString(),
        }),
      );
    },
    async () => jsonStore.listAssignments(courseId),
  );
}

export async function createAssignment(input: Omit<AssignmentRecord, "id" | "createdAt"> & { id?: string }): Promise<AssignmentRecord> {
  return withBackend(
    async () => {
      const course = await prisma.course.findUnique({ where: { courseCode: input.courseId } });
      if (!course) {
        throw new Error("Course not found for assignment.");
      }

      const created = await prisma.assignment.create({
        data: {
          id: input.id ?? undefined,
          courseId: course.id,
          title: input.title,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          gradingMode: input.gradingMode ?? null,
          answerKey: input.answerKey ?? null,
          createdById: input.createdBy ?? null,
          attachmentFileName: input.attachmentFileName ?? null,
          attachmentMimeType: input.attachmentMimeType ?? null,
          attachmentSizeBytes: input.attachmentSizeBytes ?? null,
          attachmentPath: input.attachmentPath ?? null,
        },
      });

      const result: AssignmentRecord = {
        id: created.id,
        courseId: input.courseId,
        title: created.title,
        dueAt: created.dueAt?.toISOString(),
        gradingMode: (created.gradingMode as "manual" | "auto") ?? undefined,
        answerKey: created.answerKey ?? undefined,
        createdBy: created.createdById ?? undefined,
        attachmentFileName: created.attachmentFileName ?? undefined,
        attachmentMimeType: created.attachmentMimeType ?? undefined,
        attachmentSizeBytes: created.attachmentSizeBytes ?? undefined,
        attachmentPath: created.attachmentPath ?? undefined,
        createdAt: created.createdAt.toISOString(),
      };
      return result;
    },
    async () => jsonStore.createAssignment(input),
  );
}

export async function getAssignmentById(assignmentId: string): Promise<AssignmentRecord | null> {
  return withBackend(
    async () => {
      const row = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: { course: true },
      });

      if (!row) {
        return null;
      }

      const result: AssignmentRecord = {
        id: row.id,
        courseId: row.course.courseCode,
        title: row.title,
        dueAt: row.dueAt?.toISOString(),
        gradingMode: (row.gradingMode as "manual" | "auto") ?? undefined,
        answerKey: row.answerKey ?? undefined,
        createdBy: row.createdById ?? undefined,
        attachmentFileName: row.attachmentFileName ?? undefined,
        attachmentMimeType: row.attachmentMimeType ?? undefined,
        attachmentSizeBytes: row.attachmentSizeBytes ?? undefined,
        attachmentPath: row.attachmentPath ?? undefined,
        createdAt: row.createdAt.toISOString(),
      };
      return result;
    },
    async () => jsonStore.getAssignmentById(assignmentId),
  );
}

export async function listSubmissions(assignmentId?: string): Promise<SubmissionRecord[]> {
  return withBackend(
    async () => {
      const rows = await prisma.submission.findMany({
        where: assignmentId ? { assignmentId } : undefined,
        include: {
          inmate: true,
          gradedBy: true,
        },
        orderBy: { submittedAt: "desc" },
      });
      return rows.map((row) => ({
        id: row.id,
        assignmentId: row.assignmentId,
        studentId: row.inmate.studentId,
        submittedAt: row.submittedAt.toISOString(),
        score: row.score ?? undefined,
        feedback: row.feedback ?? undefined,
        gradedBy: row.gradedBy?.fullName ?? undefined,
      }));
    },
    async () => jsonStore.listSubmissions(assignmentId),
  );
}

export async function createSubmission(input: Omit<SubmissionRecord, "id">): Promise<SubmissionRecord> {
  return withBackend(
    async () => {
      const inmate = await prisma.inmateProfile.findUnique({ where: { studentId: input.studentId } });
      if (!inmate) {
        throw new Error("Inmate not found for submission.");
      }
      const gradedBy =
        input.gradedBy && input.gradedBy.trim()
          ? await prisma.staffProfile.findFirst({
              where: {
                fullName: {
                  contains: input.gradedBy,
                },
              },
            })
          : null;
      const created = await prisma.submission.create({
        data: {
          assignmentId: input.assignmentId,
          inmateId: inmate.id,
          submittedAt: new Date(input.submittedAt),
          score: input.score ?? null,
          feedback: input.feedback ?? null,
          gradedByStaffId: gradedBy?.id ?? null,
        },
      });
      return {
        id: created.id,
        ...input,
      };
    },
    async () => jsonStore.createSubmission(input),
  );
}

export async function listCertificates(studentId?: string): Promise<CertificateRecord[]> {
  return withBackend(
    async () => {
      const rows = await prisma.certificate.findMany({
        where: studentId
          ? {
              inmate: {
                studentId,
              },
            }
          : undefined,
        include: {
          inmate: true,
          course: true,
        },
        orderBy: { issuedAt: "desc" },
      });
      return rows.map((row) => ({
        id: row.id,
        studentId: row.inmate.studentId,
        courseId: row.course.courseCode,
        issuedAt: row.issuedAt.toISOString(),
        issuedBy: row.issuedById ?? "System",
        note: row.note ?? undefined,
      }));
    },
    async () => jsonStore.listCertificates(studentId),
  );
}

export async function createCertificate(
  input: Omit<CertificateRecord, "id" | "issuedAt">,
): Promise<CertificateRecord> {
  return withBackend(
    async () => {
      const inmate = await prisma.inmateProfile.findUnique({ where: { studentId: input.studentId } });
      const course = await prisma.course.findUnique({ where: { courseCode: input.courseId } });
      if (!inmate || !course) {
        throw new Error("Certificate requires valid inmate and course.");
      }
      const created = await prisma.certificate.create({
        data: {
          inmateId: inmate.id,
          courseId: course.id,
          issuedById: input.issuedBy,
          note: input.note ?? null,
        },
      });
      return {
        id: created.id,
        studentId: input.studentId,
        courseId: input.courseId,
        issuedAt: created.issuedAt.toISOString(),
        issuedBy: input.issuedBy,
        note: created.note ?? undefined,
      };
    },
    async () => jsonStore.createCertificate(input),
  );
}

export async function listAttendance(studentId?: string): Promise<AttendanceEvent[]> {
  return withBackend(
    async () => {
      const rows = await prisma.attendanceLog.findMany({
        where: studentId
          ? {
              inmate: {
                studentId,
              },
            }
          : undefined,
        include: {
          inmate: true,
        },
        orderBy: { occurredAt: "desc" },
      });
      return rows.map((row) => ({
        studentId: row.inmate.studentId,
        type: row.attendanceType,
        facility: row.facility ?? "Digital Learning Lab",
        timestamp: row.occurredAt.toISOString(),
        verifiedBy: row.method ?? "fingerprint",
      }));
    },
    async () => jsonStore.listAttendance(studentId),
  );
}

export async function createAttendance(input: AttendanceEvent): Promise<AttendanceEvent> {
  return withBackend(
    async () => {
      const inmate = await prisma.inmateProfile.findUnique({ where: { studentId: input.studentId } });
      if (!inmate) {
        throw new Error("Inmate not found for attendance.");
      }
      await prisma.attendanceLog.create({
        data: {
          inmateId: inmate.id,
          attendanceType: input.type,
          occurredAt: new Date(input.timestamp),
          status: input.type === "entry" ? "in" : "out",
          facility: input.facility,
          method: input.verifiedBy,
        },
      });
      return input;
    },
    async () => jsonStore.createAttendance(input),
  );
}

export async function listClockinSessions(status?: "active" | "closed"): Promise<ClockinSessionRecord[]> {
  return withBackend(
    async () => {
      const rows = await prisma.clockinSession.findMany({
        where: status ? { sessionStatus: status } : undefined,
        include: {
          inmate: true,
          officer: true,
          room: true,
          device: true,
        },
        orderBy: { clockInAt: "desc" },
      });
      return rows.map((row) => ({
        id: row.id,
        studentId: row.inmate.studentId,
        officerId: row.officer?.id ?? undefined,
        room: row.room.name,
        deviceType: row.device.deviceType as "Desktop PC" | "Laptop" | "Tablet",
        deviceSerialId: row.device.serialId,
        verifiedBy: row.biometricMethod,
        proof:
          row.biometricProof === "camera_face"
            ? "camera-face"
            : row.biometricProof === "device_biometric"
              ? "device-biometric"
              : "simulated",
        status: row.sessionStatus as "active" | "closed",
        clockInAt: row.clockInAt.toISOString(),
        clockOutAt: row.clockOutAt?.toISOString(),
      }));
    },
    async () => jsonStore.listClockinSessions(status),
  );
}

export async function createClockinSession(
  input: Omit<ClockinSessionRecord, "id" | "clockInAt" | "status">,
): Promise<ClockinSessionRecord> {
  return withBackend(
    async () => {
      const inmate = await prisma.inmateProfile.findUnique({ where: { studentId: input.studentId } });
      if (!inmate) {
        throw new Error("Inmate not found for clock-in.");
      }

      const officer = input.officerId
        ? await prisma.staffProfile.findFirst({
            where: {
              OR: [{ id: input.officerId }, { staffCode: input.officerId }],
              staffType: "clocking_officer",
            },
          })
        : null;

      const room = await prisma.hallRoom.upsert({
        where: { name_location: { name: input.room, location: "Facility" } },
        update: {
          roomType: "Lab",
        },
        create: {
          name: input.room,
          location: "Facility",
          roomType: "Lab",
        },
      });

      const device = await prisma.device.upsert({
        where: { serialId: input.deviceSerialId },
        update: {
          deviceType: input.deviceType,
          status: "allocated",
        },
        create: {
          serialId: input.deviceSerialId,
          deviceType: input.deviceType,
          status: "allocated",
        },
      });

      const created = await prisma.clockinSession.create({
        data: {
          inmateId: inmate.id,
          officerStaffId: officer?.id ?? null,
          roomId: room.id,
          deviceId: device.id,
          biometricMethod: input.verifiedBy,
          biometricProof:
            input.proof === "camera-face" ? "camera_face" : input.proof === "device-biometric" ? "device_biometric" : "simulated",
          sessionStatus: "active",
        },
      });

      return {
        id: created.id,
        status: "active",
        clockInAt: created.clockInAt.toISOString(),
        ...input,
      };
    },
    async () => jsonStore.createClockinSession(input),
  );
}

export async function closeClockinSession(sessionId: string): Promise<ClockinSessionRecord | null> {
  return withBackend(
    async () => {
      const found = await prisma.clockinSession.findUnique({
        where: { id: sessionId },
        include: { inmate: true, officer: true, room: true, device: true },
      });
      if (!found) return null;
      const updated = await prisma.clockinSession.update({
        where: { id: sessionId },
        data: {
          sessionStatus: "closed",
          clockOutAt: new Date(),
        },
        include: { inmate: true, officer: true, room: true, device: true },
      });
      return {
        id: updated.id,
        studentId: updated.inmate.studentId,
        officerId: updated.officer?.id ?? undefined,
        room: updated.room.name,
        deviceType: updated.device.deviceType as "Desktop PC" | "Laptop" | "Tablet",
        deviceSerialId: updated.device.serialId,
        verifiedBy: updated.biometricMethod,
        proof:
          updated.biometricProof === "camera_face"
            ? "camera-face"
            : updated.biometricProof === "device_biometric"
              ? "device-biometric"
              : "simulated",
        status: "closed",
        clockInAt: updated.clockInAt.toISOString(),
        clockOutAt: updated.clockOutAt?.toISOString(),
      };
    },
    async () => jsonStore.closeClockinSession(sessionId),
  );
}

export async function listReports(): Promise<ReportRecord[]> {
  return withBackend<ReportRecord[]>(
    async () => {
      const jobs = await prisma.reportJob.findMany({
        include: {
          exports: true,
        },
        orderBy: { generatedAt: "desc" },
      });
      const mapped: ReportRecord[] = jobs.map((job) => {
        const latestExport = job.exports.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))[0];
        return {
          id: job.id,
          type: job.reportType.replaceAll("_", "-") as ReportRecord["type"],
          generatedAt: job.generatedAt.toISOString(),
          generatedBy: job.generatedById ?? "System",
          rowCount: typeof (job.metadata as { rowCount?: number } | null)?.rowCount === "number"
            ? (job.metadata as { rowCount: number }).rowCount
            : undefined,
          format: latestExport?.format,
          fileName: latestExport?.fileName,
          filePath: latestExport?.filePath,
          status: (job.status as ReportRecord["status"]) ?? "completed",
        };
      });
      return mapped;
    },
    async () => jsonStore.listReports(),
  );
}

export async function createReportRecord(input: Omit<ReportRecord, "id" | "generatedAt">): Promise<ReportRecord> {
  return withBackend(
    async () => {
      const created = await prisma.reportJob.create({
        data: {
          reportType: input.type.replaceAll("-", "_") as "attendance" | "performance" | "course_effectiveness" | "operational_summary" | "executive_pack",
          generatedById: input.generatedBy,
          status: input.status ?? "completed",
          metadata: {
            rowCount: input.rowCount ?? null,
          },
        },
      });

      if (input.format && input.fileName && input.filePath) {
        await prisma.reportExport.create({
          data: {
            reportJobId: created.id,
            format: input.format,
            fileName: input.fileName,
            filePath: input.filePath,
          },
        });
      }

      return {
        ...input,
        id: created.id,
        generatedAt: created.generatedAt.toISOString(),
      };
    },
    async () => jsonStore.createReportRecord(input),
  );
}

export async function restoreDomainStateFromSnapshot(snapshotState: Record<string, unknown>) {
  return jsonStore.restoreDomainStateFromSnapshot(snapshotState);
}
