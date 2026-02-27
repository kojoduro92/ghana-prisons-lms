export type Role = "admin" | "inmate" | "management";

export interface UserSession {
  userId: string;
  role: Role;
  displayName: string;
  studentId?: string;
  expiresAt: string;
}

export interface InmateProfile {
  id: string;
  fullName: string;
  prisonNumber: string;
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other";
  educationBackground: string;
  skillInterests: string[];
  blockAssignment: string;
  biometricStatus: "Enrolled" | "Pending";
  assignedPrison: string;
}

export interface CertificateRecord {
  id: string;
  studentId: string;
  courseId: string;
  issuedAt: string;
  issuedBy: string;
  note?: string;
}

export interface Course {
  id: string;
  title: string;
  category: string;
  instructor: string;
  rating: number;
  thumbnail: string;
}

export interface Enrollment {
  studentId: string;
  courseId: string;
  progressPercent: number;
  status: "In Progress" | "Completed";
}

export interface ProgressSnapshot {
  studentId: string;
  activeCourses: number;
  completedLessons: number;
  certificatesEarned: number;
  weeklyActivity: number[];
  completionPercent: number;
}

export interface AttendanceEvent {
  studentId: string;
  type: "entry" | "exit";
  facility: string;
  timestamp: string;
  verifiedBy: "fingerprint" | "face";
}

export interface VerificationAttempt {
  method: "fingerprint" | "face";
  result: "success" | "failed";
  timestamp: string;
  deviceId: string;
}

export interface AdminDashboardStats {
  totalInmatesRegistered: number;
  activeLearners: number;
  coursesEnrolled: number;
  certificatesIssued: number;
  completionRate: number;
}

export interface ManagementAnalyticsSnapshot {
  enrollmentTrend: number[];
  coursePopularity: Array<{ label: string; value: number }>;
  completionRateByMonth: number[];
  aiForecasts: Array<{ label: string; value: string; confidence: string }>;
}

export type ReportType = "attendance" | "performance" | "course-effectiveness" | "operational-summary";

export interface ReportRecord {
  id: string;
  type: ReportType;
  generatedAt: string;
  generatedBy: string;
  scopeStudentId?: string;
  rowCount?: number;
}

export interface StorageAdapter {
  loadState<T>(key: string): T | null;
  saveState<T>(key: string, value: T): void;
  clearState(key: string): void;
}

export type AuditAction =
  | "login-attempt"
  | "login-success"
  | "biometric-verification"
  | "inmate-registered"
  | "course-created"
  | "course-enrolled"
  | "certificate-issued"
  | "report-generated"
  | "report-exported";

export interface AuditEvent {
  id: string;
  action: AuditAction;
  actor: string;
  result: "success" | "failed";
  timestamp: string;
  target?: string;
  details?: string;
}
