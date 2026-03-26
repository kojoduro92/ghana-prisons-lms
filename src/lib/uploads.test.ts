import { describe, expect, it } from "vitest";
import {
  assertAssignmentAttachmentFile,
  assertCourseMaterialFile,
  inferCourseMaterialKind,
} from "@/lib/uploads";

describe("upload helpers", () => {
  it("accepts supported course material files and infers their kind", () => {
    const file = new File(["video"], "lesson-intro.mp4", { type: "video/mp4" });
    expect(assertCourseMaterialFile(file)).toBe(file);
    expect(inferCourseMaterialKind(file.name)).toBe("video");
    expect(inferCourseMaterialKind("slides.pptx")).toBe("presentation");
    expect(inferCourseMaterialKind("worksheet.xlsx")).toBe("spreadsheet");
    expect(inferCourseMaterialKind("manual.pdf")).toBe("document");
  });

  it("rejects unsupported course material extensions", () => {
    const file = new File(["bad"], "archive.zip", { type: "application/zip" });
    expect(() => assertCourseMaterialFile(file)).toThrow(/Course materials must be MP4, PDF, Word, Excel, or PowerPoint files/);
  });

  it("accepts only pdf and word files for assignment attachments", () => {
    const valid = new File(["doc"], "assignment-brief.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const invalid = new File(["ppt"], "deck.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });

    expect(assertAssignmentAttachmentFile(valid)).toBe(valid);
    expect(() => assertAssignmentAttachmentFile(invalid)).toThrow(/Assignment attachments must be PDF or Word documents/);
  });
});
