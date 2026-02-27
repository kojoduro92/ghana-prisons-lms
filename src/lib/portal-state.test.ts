import { beforeEach, describe, expect, it } from "vitest";
import { inmates as seededInmates } from "@/lib/seed-data";
import {
  addAttendanceEvent,
  addOrUpdateInmate,
  createEntryEvent,
  getAttendanceEventsState,
  getInmatesState,
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

  it("records attendance events", () => {
    const event = createEntryEvent(
      {
        userId: "inmate-001",
        role: "inmate",
        displayName: "John",
        studentId: "GP-10234",
        expiresAt: new Date(Date.now() + 1000 * 60).toISOString(),
      },
      {
        method: "fingerprint",
        result: "success",
        timestamp: new Date().toISOString(),
        deviceId: "lab-terminal-01",
      },
    );

    const next = addAttendanceEvent(event);
    const stored = getAttendanceEventsState();

    expect(next.length).toBe(1);
    expect(stored[0].studentId).toBe("GP-10234");
  });
});
