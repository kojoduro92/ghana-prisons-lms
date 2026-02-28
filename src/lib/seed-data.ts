import type {
  AdminDashboardStats,
  CertificateRecord,
  Course,
  CourseBlueprint,
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
    instructor: "Mr. K. Johnson",
    rating: 4.8,
    thumbnail: "/assets/education/course-computer.jpg",
    summary: "Digital literacy, internet safety, and office tools for modern workplaces.",
    level: "Beginner",
    durationHours: 24,
    status: "active",
    updatedAt: "2026-02-24T09:30:00.000Z",
  },
  {
    id: "C-002",
    title: "English Language Basics",
    category: "Languages",
    instructor: "Ms. A. Daniels",
    rating: 4.6,
    thumbnail: "/assets/education/course-english.jpg",
    summary: "Reading, writing, and conversation modules for clear communication.",
    level: "Beginner",
    durationHours: 18,
    status: "active",
    updatedAt: "2026-02-23T12:10:00.000Z",
  },
  {
    id: "C-003",
    title: "Entrepreneurship Essentials",
    category: "Management",
    instructor: "Mrs. E. Boateng",
    rating: 4.9,
    thumbnail: "/assets/education/course-entrepreneurship.jpg",
    summary: "Idea development, small business planning, and practical enterprise skills.",
    level: "Intermediate",
    durationHours: 28,
    status: "active",
    updatedAt: "2026-02-21T15:00:00.000Z",
  },
  {
    id: "C-004",
    title: "Carpentry & Woodwork",
    category: "Technical & Vocational",
    instructor: "Mr. Owusu",
    rating: 4.5,
    thumbnail: "/assets/education/course-carpentry.jpg",
    summary: "Hands-on measurements, tool handling, and production workshop practice.",
    level: "Intermediate",
    durationHours: 32,
    status: "active",
    updatedAt: "2026-02-22T08:40:00.000Z",
  },
  {
    id: "C-005",
    title: "Foundations of Team Management",
    category: "Management",
    instructor: "Mrs. A. Boadi",
    rating: 4.4,
    thumbnail: "/assets/education/course-management.jpg",
    summary: "Planning, delegation, and ethical decision-making in supervised environments.",
    level: "Intermediate",
    durationHours: 20,
    status: "active",
    updatedAt: "2026-02-20T11:25:00.000Z",
  },
  {
    id: "C-006",
    title: "Sales and Customer Communication",
    category: "Sales & Marketing",
    instructor: "Mr. T. Mensah",
    rating: 4.3,
    thumbnail: "/assets/education/course-marketing.jpg",
    summary: "Customer engagement, value communication, and practical sales habits.",
    level: "Beginner",
    durationHours: 16,
    status: "active",
    updatedAt: "2026-02-19T10:05:00.000Z",
  },
];

export const courseBlueprints: CourseBlueprint[] = [
  {
    courseId: "C-001",
    updatedAt: "2026-02-24T09:30:00.000Z",
    modules: [
      {
        id: "M-001",
        title: "Digital Foundations",
        objective: "Build confidence with computers, file handling, and core office tools.",
        lessons: [
          { id: "L-001", title: "Computer Basics and Safe Startup", type: "video", durationMinutes: 28 },
          { id: "L-002", title: "Typing, Documents, and File Storage", type: "exercise", durationMinutes: 35 },
        ],
      },
      {
        id: "M-002",
        title: "Internet and Productivity",
        objective: "Use web and productivity tools safely for learning and work.",
        lessons: [
          { id: "L-003", title: "Internet Navigation and Safety", type: "reading", durationMinutes: 22 },
          { id: "L-004", title: "Spreadsheet and Email Practice", type: "assessment", durationMinutes: 30 },
        ],
      },
    ],
  },
  {
    courseId: "C-002",
    updatedAt: "2026-02-23T12:10:00.000Z",
    modules: [
      {
        id: "M-001",
        title: "Core Language Skills",
        objective: "Strengthen reading and writing for daily communication.",
        lessons: [
          { id: "L-001", title: "Sentence Structure and Vocabulary", type: "reading", durationMinutes: 24 },
          { id: "L-002", title: "Listening and Conversation Practice", type: "exercise", durationMinutes: 32 },
        ],
      },
    ],
  },
  {
    courseId: "C-003",
    updatedAt: "2026-02-21T15:00:00.000Z",
    modules: [
      {
        id: "M-001",
        title: "Business Ideation",
        objective: "Identify feasible business opportunities and customer needs.",
        lessons: [
          { id: "L-001", title: "Opportunity Discovery", type: "video", durationMinutes: 26 },
          { id: "L-002", title: "Market Needs Mapping", type: "exercise", durationMinutes: 34 },
        ],
      },
      {
        id: "M-002",
        title: "Planning and Operations",
        objective: "Create a practical, low-risk startup plan.",
        lessons: [
          { id: "L-003", title: "Budget and Resource Planning", type: "reading", durationMinutes: 20 },
          { id: "L-004", title: "Pitch and Assessment", type: "assessment", durationMinutes: 28 },
        ],
      },
    ],
  },
  {
    courseId: "C-004",
    updatedAt: "2026-02-22T08:40:00.000Z",
    modules: [
      {
        id: "M-001",
        title: "Workshop Safety and Tools",
        objective: "Operate workshop tools safely with correct measurements.",
        lessons: [
          { id: "L-001", title: "Safety Standards and PPE", type: "reading", durationMinutes: 18 },
          { id: "L-002", title: "Measurement and Cutting Practice", type: "exercise", durationMinutes: 40 },
        ],
      },
    ],
  },
  {
    courseId: "C-005",
    updatedAt: "2026-02-20T11:25:00.000Z",
    modules: [
      {
        id: "M-001",
        title: "Team Coordination",
        objective: "Lead daily work teams with clarity and accountability.",
        lessons: [
          { id: "L-001", title: "Role Assignment and Delegation", type: "video", durationMinutes: 22 },
          { id: "L-002", title: "Conflict Handling Scenarios", type: "assessment", durationMinutes: 27 },
        ],
      },
    ],
  },
  {
    courseId: "C-006",
    updatedAt: "2026-02-19T10:05:00.000Z",
    modules: [
      {
        id: "M-001",
        title: "Customer Interaction",
        objective: "Handle customer communication professionally.",
        lessons: [
          { id: "L-001", title: "Customer Needs and Value Statement", type: "reading", durationMinutes: 20 },
          { id: "L-002", title: "Sales Dialogue Practice", type: "exercise", durationMinutes: 30 },
        ],
      },
    ],
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
  { studentId: "GP-10234", courseId: "C-006", progressPercent: 36, status: "In Progress" },
  { studentId: "GP-10213", courseId: "C-004", progressPercent: 55, status: "In Progress" },
  { studentId: "GP-10213", courseId: "C-005", progressPercent: 48, status: "In Progress" },
  { studentId: "GP-10215", courseId: "C-003", progressPercent: 82, status: "In Progress" },
  { studentId: "GP-10215", courseId: "C-006", progressPercent: 63, status: "In Progress" },
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

export const certificates: CertificateRecord[] = [
  {
    id: "CERT-001",
    studentId: "GP-10234",
    courseId: "C-001",
    issuedAt: "2026-02-20T10:00:00.000Z",
    issuedBy: "Admin Officer",
    note: "Completed Basic Computer Skills competency track.",
  },
  {
    id: "CERT-002",
    studentId: "GP-10234",
    courseId: "C-002",
    issuedAt: "2026-02-24T14:30:00.000Z",
    issuedBy: "Admin Officer",
    note: "Completed English Language Basics module.",
  },
];

export const inmateGoals = [
  { label: "Complete IT & Digital Skills Course", current: 80, total: 100 },
  { label: "Earn 3 Certificates", current: 2, total: 3 },
  { label: "Read 5 Books", current: 3, total: 5 },
];
