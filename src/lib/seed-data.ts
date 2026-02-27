import type {
  AdminDashboardStats,
  Course,
  Enrollment,
  InmateProfile,
  ManagementAnalyticsSnapshot,
  ProgressSnapshot,
  ReportRecord,
} from "@/types/domain";

export const appMeta = {
  name: "Ghana Prisons Learning Portal",
  offlineLabel: "Connected to Local Server - Secure Offline Environment",
};

export const courseCategories = [
  "IT & Digital Skills",
  "Languages",
  "Management",
  "Technical & Vocational",
  "Personal Development",
  "Sales & Marketing",
];

export const topRatedCourses: Course[] = [
  {
    id: "C-001",
    title: "Basic Computer Skills",
    category: "IT & Digital Skills",
    instructor: "Mr. Johnson",
    rating: 4.7,
    thumbnail: "Desk training",
  },
  {
    id: "C-002",
    title: "English Language Basics",
    category: "Languages",
    instructor: "Mr. Johnson",
    rating: 4.5,
    thumbnail: "Language classroom",
  },
  {
    id: "C-003",
    title: "Entrepreneurship Essentials",
    category: "Management",
    instructor: "Mrs. Boateng",
    rating: 4.8,
    thumbnail: "Business fundamentals",
  },
  {
    id: "C-004",
    title: "Carpentry & Woodwork",
    category: "Technical & Vocational",
    instructor: "Mr. Owusu",
    rating: 4.4,
    thumbnail: "Workshop skills",
  },
];

export const inmates: InmateProfile[] = [
  {
    id: "GP-10234",
    fullName: "John Mensah",
    prisonNumber: "GTE-10234",
    dateOfBirth: "1996-03-24",
    gender: "Male",
    educationBackground: "Senior High",
    skillInterests: ["Basic Computer", "Entrepreneurship"],
    blockAssignment: "Block C",
    biometricStatus: "Enrolled",
    assignedPrison: "Nsawam",
  },
  {
    id: "GP-10213",
    fullName: "Kwesi Appiah",
    prisonNumber: "GTE-10213",
    dateOfBirth: "1994-07-10",
    gender: "Male",
    educationBackground: "Junior High",
    skillInterests: ["Carpentry", "Personal Development"],
    blockAssignment: "Block B",
    biometricStatus: "Enrolled",
    assignedPrison: "Kumasi Central",
  },
  {
    id: "GP-10215",
    fullName: "Amina Suleiman",
    prisonNumber: "GTE-10215",
    dateOfBirth: "1998-11-17",
    gender: "Female",
    educationBackground: "Vocational",
    skillInterests: ["Sales", "Digital Skills"],
    blockAssignment: "Block D",
    biometricStatus: "Enrolled",
    assignedPrison: "Nsawam",
  },
  {
    id: "GP-10219",
    fullName: "Peter Owusu",
    prisonNumber: "GTE-10219",
    dateOfBirth: "1990-01-05",
    gender: "Male",
    educationBackground: "Senior High",
    skillInterests: ["Language", "Management"],
    blockAssignment: "Block A",
    biometricStatus: "Pending",
    assignedPrison: "Kumasi Central",
  },
];

export const enrollments: Enrollment[] = [
  { studentId: "GP-10234", courseId: "C-001", progressPercent: 68, status: "In Progress" },
  { studentId: "GP-10234", courseId: "C-002", progressPercent: 75, status: "In Progress" },
  { studentId: "GP-10234", courseId: "C-003", progressPercent: 50, status: "In Progress" },
  { studentId: "GP-10234", courseId: "C-004", progressPercent: 40, status: "In Progress" },
  { studentId: "GP-10213", courseId: "C-004", progressPercent: 55, status: "In Progress" },
  { studentId: "GP-10215", courseId: "C-003", progressPercent: 82, status: "In Progress" },
];

export const progressSnapshots: ProgressSnapshot[] = [
  {
    studentId: "GP-10234",
    activeCourses: 4,
    completedLessons: 12,
    certificatesEarned: 2,
    weeklyActivity: [2, 4, 4, 6, 5, 7],
    completionPercent: 68,
  },
];

export const adminStats: AdminDashboardStats = {
  totalInmatesRegistered: 1250,
  activeLearners: 785,
  coursesEnrolled: 1980,
  certificatesIssued: 540,
  completionRate: 63,
};

export const enrollmentDistribution = [
  { label: "Basic Computer", value: 320 },
  { label: "Languages", value: 275 },
  { label: "Management", value: 190 },
  { label: "Technical & Vocational", value: 360 },
  { label: "Personal Development", value: 250 },
  { label: "Sales & Marketing", value: 210 },
];

export const managementSnapshot: ManagementAnalyticsSnapshot = {
  enrollmentTrend: [420, 470, 510, 560, 590, 640],
  coursePopularity: [
    { label: "Technical & Vocational", value: 32 },
    { label: "IT & Digital Skills", value: 24 },
    { label: "Languages", value: 17 },
    { label: "Management", value: 15 },
    { label: "Other", value: 12 },
  ],
  completionRateByMonth: [45, 49, 52, 56, 61, 63],
  aiForecasts: [
    { label: "Projected New Enrollments", value: "740 next quarter", confidence: "88%" },
    { label: "Highest Demand Skill Area", value: "Technical & Vocational", confidence: "84%" },
    { label: "Likely Completion Uplift", value: "+6% with 2 extra mentors", confidence: "79%" },
  ],
};

export const reports: ReportRecord[] = [
  {
    id: "REP-001",
    type: "attendance",
    generatedAt: "2026-02-25T10:00:00.000Z",
    generatedBy: "Admin Officer",
  },
  {
    id: "REP-002",
    type: "performance",
    generatedAt: "2026-02-25T12:10:00.000Z",
    generatedBy: "Admin Officer",
  },
];

export const inmateGoals = [
  { label: "Complete IT & Digital Skills Course", current: 80, total: 100 },
  { label: "Earn 3 Certificates", current: 2, total: 3 },
  { label: "Read 5 Books", current: 3, total: 5 },
];
