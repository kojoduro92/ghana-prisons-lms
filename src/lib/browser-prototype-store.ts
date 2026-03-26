"use client";

import { STORAGE_KEYS, browserStorage } from "@/lib/storage";
import type { CourseMaterialRecord } from "@/types/domain";
import type { AssignmentRecord } from "@/lib/domain-store";

interface PrototypeClockinSessionRecord {
  id: string;
  studentId: string;
  room: string;
  deviceType: "Desktop PC" | "Laptop" | "Tablet";
  deviceSerialId: string;
  verifiedBy: "fingerprint" | "face";
  proof: "camera-face" | "device-biometric" | "simulated";
  status: "active" | "closed";
  clockInAt: string;
  clockOutAt?: string;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const next: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    next.push(item);
  }
  return next;
}

export function listPrototypeCourseMaterials(courseId?: string): CourseMaterialRecord[] {
  const stored = browserStorage.loadState<CourseMaterialRecord[]>(STORAGE_KEYS.prototypeCourseMaterials) ?? [];
  const scoped = courseId ? stored.filter((entry) => entry.courseId === courseId) : stored;
  return dedupeById(scoped);
}

export function savePrototypeCourseMaterial(material: CourseMaterialRecord): CourseMaterialRecord[] {
  const current = browserStorage.loadState<CourseMaterialRecord[]>(STORAGE_KEYS.prototypeCourseMaterials) ?? [];
  const next = dedupeById([material, ...current]);
  browserStorage.saveState(STORAGE_KEYS.prototypeCourseMaterials, next);
  return next;
}

export function listPrototypeAssignments(): AssignmentRecord[] {
  const stored = browserStorage.loadState<AssignmentRecord[]>(STORAGE_KEYS.prototypeAssignments) ?? [];
  return dedupeById(stored);
}

export function savePrototypeAssignment(assignment: AssignmentRecord): AssignmentRecord[] {
  const current = browserStorage.loadState<AssignmentRecord[]>(STORAGE_KEYS.prototypeAssignments) ?? [];
  const next = dedupeById([assignment, ...current]);
  browserStorage.saveState(STORAGE_KEYS.prototypeAssignments, next);
  return next;
}

export function listPrototypeClockinSessions(status?: "all" | "active" | "closed"): PrototypeClockinSessionRecord[] {
  const stored = browserStorage.loadState<PrototypeClockinSessionRecord[]>(STORAGE_KEYS.prototypeClockinSessions) ?? [];
  if (!status || status === "all") {
    return dedupeById(stored);
  }
  return dedupeById(stored.filter((entry) => entry.status === status));
}

export function savePrototypeClockinSession(session: PrototypeClockinSessionRecord): PrototypeClockinSessionRecord[] {
  const current = browserStorage.loadState<PrototypeClockinSessionRecord[]>(STORAGE_KEYS.prototypeClockinSessions) ?? [];
  const next = dedupeById([session, ...current]);
  browserStorage.saveState(STORAGE_KEYS.prototypeClockinSessions, next);
  return next;
}

export function closePrototypeClockinSession(sessionId: string, clockOutAt: string): PrototypeClockinSessionRecord[] {
  const current = browserStorage.loadState<PrototypeClockinSessionRecord[]>(STORAGE_KEYS.prototypeClockinSessions) ?? [];
  const next: PrototypeClockinSessionRecord[] = current.map((entry) =>
    entry.id === sessionId ? { ...entry, status: "closed" as const, clockOutAt } : entry,
  );
  browserStorage.saveState(STORAGE_KEYS.prototypeClockinSessions, next);
  return next;
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read file locally."));
    };
    reader.onerror = () => reject(new Error("Unable to read file locally."));
    reader.readAsDataURL(file);
  });
}
