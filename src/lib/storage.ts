"use client";

import type { StorageAdapter } from "@/types/domain";

export const STORAGE_KEYS = {
  session: "gplp.session",
  selectedInmate: "gplp.selected-inmate",
  verificationLogs: "gplp.verification.logs",
  attendanceEvents: "gplp.attendance.events",
  auditEvents: "gplp.audit.events",
  inmates: "gplp.inmates",
  reports: "gplp.reports",
  activityState: "gplp.activity.state",
} as const;

export const browserStorage: StorageAdapter = {
  loadState<T>(key: string): T | null {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  saveState<T>(key: string, value: T): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(value));
  },

  clearState(key: string): void {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(key);
  },
};
