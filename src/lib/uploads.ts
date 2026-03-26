import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { hasBlobStore, readPrivateBlob, writePrivateBlob } from "@/lib/blob-store";
import type { CourseMaterialKind } from "@/types/domain";

export const COURSE_MATERIAL_MAX_BYTES = 100 * 1024 * 1024;
export const ASSIGNMENT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

const COURSE_MATERIAL_EXTENSIONS = new Set([".mp4", ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"]);
const ASSIGNMENT_ATTACHMENT_EXTENSIONS = new Set([".pdf", ".doc", ".docx"]);

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "file";
}

function getExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

function assertFile(file: FormDataEntryValue | null, fieldName: string): File {
  if (!(file instanceof File)) {
    throw new Error(`${fieldName} file is required.`);
  }
  return file;
}

export function assertCourseMaterialFile(file: FormDataEntryValue | null): File {
  const next = assertFile(file, "Course material");
  const extension = getExtension(next.name);
  if (!COURSE_MATERIAL_EXTENSIONS.has(extension)) {
    throw new Error("Course materials must be MP4, PDF, Word, Excel, or PowerPoint files.");
  }
  if (next.size > COURSE_MATERIAL_MAX_BYTES) {
    throw new Error("Course material exceeds the 100 MB upload limit.");
  }
  return next;
}

export function assertAssignmentAttachmentFile(file: FormDataEntryValue | null): File {
  const next = assertFile(file, "Assignment attachment");
  const extension = getExtension(next.name);
  if (!ASSIGNMENT_ATTACHMENT_EXTENSIONS.has(extension)) {
    throw new Error("Assignment attachments must be PDF or Word documents.");
  }
  if (next.size > ASSIGNMENT_ATTACHMENT_MAX_BYTES) {
    throw new Error("Assignment attachment exceeds the 25 MB upload limit.");
  }
  return next;
}

export function inferCourseMaterialKind(fileName: string): CourseMaterialKind {
  const extension = getExtension(fileName);
  if (extension === ".mp4") return "video";
  if (extension === ".xls" || extension === ".xlsx") return "spreadsheet";
  if (extension === ".ppt" || extension === ".pptx") return "presentation";
  return "document";
}

export async function persistUploadedFile(file: File, relativeDirectory: string) {
  const extension = getExtension(file.name);
  const safeBaseName = sanitizeSegment(path.basename(file.name, extension));
  const storedFileName = `${Date.now()}-${randomUUID()}-${safeBaseName}${extension}`;
  const relativePath = path.posix.join(relativeDirectory, storedFileName);

  if (hasBlobStore()) {
    await writePrivateBlob(relativePath, file, file.type || "application/octet-stream");
  } else {
    const absolutePath = path.join(process.cwd(), relativePath);
    const buffer = Buffer.from(await file.arrayBuffer());

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);
  }

  return {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSizeBytes: file.size,
    storagePath: relativePath,
  };
}

export async function readStoredFile(storagePath: string) {
  if (hasBlobStore()) {
    const stored = await readPrivateBlob(storagePath);
    if (!stored) {
      throw new Error(`Stored file not found: ${storagePath}`);
    }
    return stored.buffer;
  }

  const absolutePath = path.join(process.cwd(), storagePath);
  return readFile(absolutePath);
}
