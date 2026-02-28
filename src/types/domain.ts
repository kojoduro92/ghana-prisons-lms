export type Role = "admin" | "inmate" | "management";

export interface UserSession {
  userId: string;
  role: Role;
  displayName: string;
  studentId?: string;
  expiresAt: string;
  lastBiometricVerificationAt?: string;
  lastBiometricMethod?: "fingerprint" | "face";
  facilityEntryGrantedAt?: string;
  facilityEntryMethod?: "fingerprint" | "face";
  facilitySessionId?: string;
  facilityLocation?: string;
  allocatedDeviceType?: "Desktop PC" | "Laptop" | "Tablet";
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
  summary?: string;
  level?: "Beginner" | "Intermediate" | "Advanced";
  durationHours?: number;
  status?: "active" | "draft" | "archived";
  updatedAt?: string;
}

export type CourseLessonType = "video" | "reading" | "exercise" | "assessment";

export interface CourseLesson {
  id: string;
  title: string;
  type: CourseLessonType;
  durationMinutes: number;
  resourcePath?: string;
  notes?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  objective?: string;
  lessons: CourseLesson[];
}

export interface CourseBlueprint {
  courseId: string;
  modules: CourseModule[];
  updatedAt: string;
}

export interface Enrollment {
  studentId: string;
  courseId: string;
  progressPercent: number;
  status: "In Progress" | "Completed";
  timeSpentMinutes?: number;
  lessonsCompleted?: number;
  assessmentsTaken?: number;
  latestAssessmentScore?: number;
  lastActivityAt?: string;
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
  | "course-progress-updated"
  | "certificate-issued"
  | "report-generated"
  | "report-exported"
  | "state-snapshot-created"
  | "state-snapshot-restored";

export interface AuditEvent {
  id: string;
  action: AuditAction;
  actor: string;
  result: "success" | "failed";
  timestamp: string;
  target?: string;
  details?: string;
}
