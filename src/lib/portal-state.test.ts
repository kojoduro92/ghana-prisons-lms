import { beforeEach, describe, expect, it } from "vitest";
import { inmates as seededInmates } from "@/lib/seed-data";
import {
  addAttendanceEvent,
  addAuditEvent,
  addReportRecord,
  addOrUpdateInmate,
  createAttendanceEvent,
  createEntryEvent,
  createExitEvent,
  getAttendanceEventsState,
  getAuditEventsState,
  getInmatesState,
  getReportsState,
  summarizeAttendance,
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
});
