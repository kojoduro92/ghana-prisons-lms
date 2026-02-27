import { describe, expect, it } from "vitest";
import { buildReportRows, toCsv } from "@/lib/reporting";
import { enrollments, inmates } from "@/lib/seed-data";
import type { AttendanceEvent } from "@/types/domain";

const attendanceEvents: AttendanceEvent[] = [
  {
    studentId: "GP-10234",
    type: "entry",
    facility: "Digital Learning Lab",
    timestamp: "2026-02-27T10:00:00.000Z",
    verifiedBy: "fingerprint",
  },
  {
    studentId: "GP-10234",
    type: "exit",
    facility: "Digital Learning Lab",
    timestamp: "2026-02-27T13:00:00.000Z",
    verifiedBy: "face",
  },
];

describe("reporting helpers", () => {
  it("builds attendance rows with optional student scope", () => {
    const rows = buildReportRows({
      type: "attendance",
      attendanceEvents,
      enrollments,
      inmates,
      scopeStudentId: "GP-10234",
    });

    expect(rows.length).toBe(2);
    expect(rows[0].studentId).toBe("GP-10234");
  });

  it("builds course-effectiveness aggregate rows", () => {
    const rows = buildReportRows({
      type: "course-effectiveness",
      attendanceEvents,
      enrollments,
      inmates,
    });

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].courseId).toBeTruthy();
  });

  it("serializes rows to csv", () => {
    const csv = toCsv([
      { id: "A", count: 2 },
      { id: "B", count: 3 },
    ]);

    expect(csv).toContain("id,count");
    expect(csv).toContain('"A","2"');
  });
});
