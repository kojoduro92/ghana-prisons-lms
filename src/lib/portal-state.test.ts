import { beforeEach, describe, expect, it } from "vitest";
import { inmates as seededInmates } from "@/lib/seed-data";
import {
  addAttendanceEvent,
  addAuditEvent,
  addCourseLesson,
  addCourseModule,
  addOrUpdateCourse,
  addReportRecord,
  addOrUpdateInmate,
  createAttendanceEvent,
  createEntryEvent,
  createExitEvent,
  enrollStudentInCourse,
  getAttendanceEventsState,
  getAuditEventsState,
  getCertificatesForStudent,
  getCourseBlueprint,
  getCoursesState,
  getLearningSummaryForStudent,
  getEnrollmentsForStudent,
  getEnrollmentsState,
  getInmatesState,
  getLatestOpenEntry,
  getReportsState,
  getSessionDurationMinutes,
  issueCertificate,
  removeCourseLesson,
  removeCourseModule,
  summarizeAttendance,
  updateEnrollmentProgress,
} from "@/lib/portal-state";

beforeEach(() => {
  window.localStorage.clear();
});

describe("portal state", () => {
  it("seeds inmates into local storage when missing", () => {
    const result = getInmatesState();

    expect(result.length).toBe(seededInmates.length);
    expect(result[0].id).toBe(seededInmates[0].id);
  });

  it("adds newly registered inmates to the front of list", () => {
    const next = addOrUpdateInmate({
      id: "GP-99999",
      fullName: "New Learner",
      prisonNumber: "GTE-99999",
      dateOfBirth: "1999-01-01",
      gender: "Male",
      educationBackground: "Senior High",
      skillInterests: ["IT"],
      blockAssignment: "Block Z",
      biometricStatus: "Enrolled",
      assignedPrison: "Nsawam",
    });

    expect(next[0].id).toBe("GP-99999");
    expect(next.some((item) => item.id === seededInmates[0].id)).toBe(true);
  });

  it("records attendance events and returns summary", () => {
    const session = {
      userId: "inmate-001",
      role: "inmate" as const,
      displayName: "John",
      studentId: "GP-10234",
      expiresAt: new Date(Date.now() + 1000 * 60).toISOString(),
    };

    const entry = createEntryEvent(session, {
      method: "fingerprint",
      result: "success",
      timestamp: new Date().toISOString(),
      deviceId: "lab-terminal-01",
    });
    const exit = createExitEvent(session, "face");

    addAttendanceEvent(entry);
    const next = addAttendanceEvent(exit);
    const stored = getAttendanceEventsState();
    const summary = summarizeAttendance(stored);

    expect(next.length).toBe(2);
    expect(stored[0].type).toBe("exit");
    expect(stored[0].studentId).toBe("GP-10234");
    expect(summary.entries).toBe(1);
    expect(summary.exits).toBe(1);
    expect(summary.completionRate).toBe(100);
  });

  it("creates manual attendance event with requested type", () => {
    const session = {
      userId: "inmate-777",
      role: "inmate" as const,
      displayName: "Test",
      studentId: "GP-77777",
      expiresAt: new Date(Date.now() + 1000 * 60).toISOString(),
    };

    const event = createAttendanceEvent(session, "entry", "fingerprint");
    expect(event.type).toBe("entry");
    expect(event.verifiedBy).toBe("fingerprint");
    expect(event.studentId).toBe("GP-77777");
  });

  it("tracks open attendance sessions until clock-out", () => {
    const now = Date.now();
    const events = [
      {
        studentId: "GP-1",
        type: "entry" as const,
        facility: "Lab",
        timestamp: new Date(now - 25 * 60_000).toISOString(),
        verifiedBy: "face" as const,
      },
      {
        studentId: "GP-1",
        type: "exit" as const,
        facility: "Lab",
        timestamp: new Date(now - 20 * 60_000).toISOString(),
        verifiedBy: "face" as const,
      },
      {
        studentId: "GP-1",
        type: "entry" as const,
        facility: "Lab",
        timestamp: new Date(now - 12 * 60_000).toISOString(),
        verifiedBy: "fingerprint" as const,
      },
    ];

    const open = getLatestOpenEntry(events);
    expect(open?.type).toBe("entry");
    expect(open?.verifiedBy).toBe("fingerprint");
  });

  it("calculates session duration in minutes", () => {
    const start = "2026-02-28T10:00:00.000Z";
    const end = "2026-02-28T10:37:00.000Z";
    expect(getSessionDurationMinutes(start, end)).toBe(37);
  });

  it("adds report metadata records to local history", () => {
    const next = addReportRecord("attendance", "Admin Officer", {
      scopeStudentId: "GP-10234",
      rowCount: 5,
    });

    const history = getReportsState();
    expect(next[0].type).toBe("attendance");
    expect(history[0].scopeStudentId).toBe("GP-10234");
    expect(history[0].rowCount).toBe(5);
  });

  it("adds audit events to security history", () => {
    const next = addAuditEvent({
      action: "login-attempt",
      actor: "admin",
      result: "failed",
      details: "bad password",
    });
    const history = getAuditEventsState();

    expect(next.length).toBe(1);
    expect(history[0].action).toBe("login-attempt");
    expect(history[0].result).toBe("failed");
  });

  it("adds and persists courses", () => {
    const next = addOrUpdateCourse({
      id: "C-999",
      title: "Project Management Basics",
      category: "Management",
      instructor: "Ms. Agyeman",
      rating: 4.2,
      thumbnail: "asset",
    });

    const stored = getCoursesState();
    expect(next[0].id).toBe("C-999");
    expect(stored[0].title).toBe("Project Management Basics");
  });

  it("builds and persists course curriculum modules and lessons", () => {
    const addedModule = addCourseModule("C-001", {
      title: "Digital Practice Lab",
      objective: "Hands-on exercises and guided practice.",
    });

    const createdModule = addedModule.modules.find((module) => module.title === "Digital Practice Lab");
    expect(createdModule).toBeDefined();

    const withLesson = addCourseLesson("C-001", {
      moduleId: createdModule?.id ?? "",
      title: "Practice Session A",
      type: "exercise",
      durationMinutes: 30,
      notes: "Supervised computer lab activity.",
    });

    const refreshed = getCourseBlueprint("C-001");
    const moduleFromStorage = refreshed.modules.find((module) => module.id === createdModule?.id);
    expect(moduleFromStorage?.lessons.some((lesson) => lesson.title === "Practice Session A")).toBe(true);
    expect(withLesson.courseId).toBe("C-001");
  });

  it("removes course lesson and module from curriculum", () => {
    const base = addCourseModule("C-002", {
      title: "Communication Studio",
      objective: "Applied communication sessions.",
    });
    const moduleId = base.modules[base.modules.length - 1]?.id ?? "";
    const withLesson = addCourseLesson("C-002", {
      moduleId,
      title: "Dialogue Drill",
      type: "exercise",
      durationMinutes: 25,
    });
    const lessonId = withLesson.modules.find((module) => module.id === moduleId)?.lessons[0]?.id ?? "";

    const afterLessonRemoval = removeCourseLesson("C-002", moduleId, lessonId);
    expect(afterLessonRemoval.modules.find((module) => module.id === moduleId)?.lessons.length).toBe(0);

    const afterModuleRemoval = removeCourseModule("C-002", moduleId);
    expect(afterModuleRemoval.modules.some((module) => module.id === moduleId)).toBe(false);
  });

  it("enrolls student without creating duplicates", () => {
    const before = getEnrollmentsForStudent("GP-10234").length;
    const first = enrollStudentInCourse("GP-10234", "C-999");
    const second = enrollStudentInCourse("GP-10234", "C-999");

    const after = getEnrollmentsForStudent("GP-10234").length;
    expect(first.length).toBe(second.length);
    expect(after).toBe(before + 1);
    expect(getEnrollmentsState().some((entry) => entry.studentId === "GP-10234" && entry.courseId === "C-999")).toBe(
      true,
    );
  });

  it("updates progress, lessons, and assessment details for an enrolled course", () => {
    const next = updateEnrollmentProgress({
      studentId: "GP-10234",
      courseId: "C-001",
      activityMinutes: 40,
      lessonsDelta: 1,
      progressDelta: 5,
      assessmentScore: 83,
    });
    const updated = next.find((entry) => entry.studentId === "GP-10234" && entry.courseId === "C-001");

    expect(updated).toBeDefined();
    expect(updated?.progressPercent).toBeGreaterThan(68);
    expect(updated?.timeSpentMinutes).toBeGreaterThan(0);
    expect(updated?.lessonsCompleted).toBeGreaterThan(0);
    expect(updated?.assessmentsTaken).toBeGreaterThan(0);
    expect(updated?.latestAssessmentScore).toBe(83);
    expect(updated?.lastActivityAt).toBeDefined();
  });

  it("builds learning summary metrics for student analytics", () => {
    updateEnrollmentProgress({
      studentId: "GP-10234",
      courseId: "C-002",
      activityMinutes: 30,
      lessonsDelta: 1,
      progressDelta: 4,
      assessmentScore: 79,
    });

    const summary = getLearningSummaryForStudent("GP-10234");
    expect(summary.activeCourses).toBeGreaterThan(0);
    expect(summary.totalMinutes).toBeGreaterThan(0);
    expect(summary.lessonsCompleted).toBeGreaterThan(0);
    expect(summary.assessmentsTaken).toBeGreaterThan(0);
    expect(summary.averageAssessmentScore).not.toBeNull();
  });

  it("issues certificates and persists them for an inmate", () => {
    const before = getCertificatesForStudent("GP-10234").length;
    const next = issueCertificate({
      studentId: "GP-10234",
      courseId: "C-003",
      issuedBy: "Admin Officer",
      note: "Issued from test",
    });

    const inmateCertificates = getCertificatesForStudent("GP-10234");
    expect(next[0].studentId).toBe("GP-10234");
    expect(next[0].courseId).toBe("C-003");
    expect(inmateCertificates.length).toBe(before + 1);
  });

  it("does not issue duplicate certificate for same student and course", () => {
    const first = issueCertificate({
      studentId: "GP-10234",
      courseId: "C-004",
      issuedBy: "Admin Officer",
    });
    const second = issueCertificate({
      studentId: "GP-10234",
      courseId: "C-004",
      issuedBy: "Admin Officer",
    });

    const matching = getCertificatesForStudent("GP-10234").filter((item) => item.courseId === "C-004");
    expect(second.length).toBe(first.length);
    expect(matching.length).toBe(1);
  });
});
