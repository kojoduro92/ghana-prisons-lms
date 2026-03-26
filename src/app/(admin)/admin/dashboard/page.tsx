"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RoleShell } from "@/components/role-shell";
import { fetchApi } from "@/lib/client-api";
import { formatDateTime } from "@/lib/format";
import { getAttendanceEventsState } from "@/lib/portal-state";
import { appMeta } from "@/lib/seed-data";
import type { AttendanceEvent } from "@/types/domain";

type ReportType = "attendance" | "performance" | "course-effectiveness" | "operational-summary" | "executive-pack";
type ReportFormat = "pdf" | "xlsx" | "csv";
type AdminSectionKey =
  | "dashboard"
  | "inmates"
  | "register"
  | "lecturers"
  | "officers"
  | "attendance"
  | "courses"
  | "certificates"
  | "reports"
  | "security"
  | "settings";
type PrimaryTabKey = "courses" | "enrolled" | "tracking";
type SecondaryTabKey = "courses" | "inmates" | "lecturers";

interface ClockinSessionRecord {
  id: string;
  studentId: string;
  room: string;
  deviceType: "Desktop PC" | "Laptop" | "Tablet";
  deviceSerialId: string;
  verifiedBy: "fingerprint" | "face";
  status: "active" | "closed";
  clockInAt: string;
}

interface BiometricVerificationRecord {
  id: string;
  studentId: string;
  method: "face" | "fingerprint";
  result: "success" | "failed";
  verifiedAt: string;
  deviceId: string;
  proof: "camera-face" | "device-biometric" | "simulated";
  strictMode: boolean;
}

interface ReportGenerateResponse {
  downloadUrl: string;
  report: {
    id: string;
    type: string;
    format?: string;
  };
}

interface CardMenuAction {
  label: string;
  href?: string;
  onSelect?: () => void;
  children?: CardMenuAction[];
}

function CardMenu({
  menuId,
  openMenuId,
  setOpenMenuId,
  actions,
}: {
  menuId: string;
  openMenuId: string | null;
  setOpenMenuId: (id: string | null) => void;
  actions: CardMenuAction[];
}) {
  const isOpen = openMenuId === menuId;
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  function closeMenu() {
    setOpenSubmenu(null);
    setOpenMenuId(null);
  }

  return (
    <div className="admin-board-menu">
      <button
        type="button"
        className="admin-board-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={(event) => {
          event.stopPropagation();
          if (isOpen) {
            closeMenu();
            return;
          }
          setOpenSubmenu(null);
          setOpenMenuId(menuId);
        }}
      >
        •••
      </button>
      {isOpen ? (
        <div className="admin-board-menu-pop" role="menu" onClick={(event) => event.stopPropagation()}>
          {actions.map((action) => {
            if (action.children?.length) {
              const submenuOpen = openSubmenu === action.label;
              return (
                <div key={action.label} className="admin-board-menu-group">
                  <button
                    type="button"
                    className="admin-board-menu-item admin-board-menu-item-parent"
                    role="menuitem"
                    aria-haspopup="menu"
                    aria-expanded={submenuOpen}
                    onClick={() => setOpenSubmenu(submenuOpen ? null : action.label)}
                  >
                    <span>{action.label}</span>
                    <span className="admin-board-menu-caret">{submenuOpen ? "▾" : "▸"}</span>
                  </button>
                  {submenuOpen ? (
                    <div className="admin-board-submenu" role="menu">
                      {action.children.map((entry) => {
                        if (entry.href) {
                          return (
                            <Link
                              key={`${action.label}-${entry.label}`}
                              href={entry.href}
                              className="admin-board-menu-item admin-board-submenu-item"
                              role="menuitem"
                              onClick={closeMenu}
                            >
                              {entry.label}
                            </Link>
                          );
                        }

                        return (
                          <button
                            key={`${action.label}-${entry.label}`}
                            type="button"
                            className="admin-board-menu-item admin-board-submenu-item"
                            role="menuitem"
                            onClick={() => {
                              entry.onSelect?.();
                              closeMenu();
                            }}
                          >
                            {entry.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            }

            if (action.href) {
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="admin-board-menu-item"
                  role="menuitem"
                  onClick={closeMenu}
                >
                  {action.label}
                </Link>
              );
            }

            return (
              <button
                key={action.label}
                type="button"
                className="admin-board-menu-item"
                role="menuitem"
                onClick={() => {
                  action.onSelect?.();
                  closeMenu();
                }}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const DASHBOARD_SECTION_TABS: Array<{ key: AdminSectionKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "inmates", label: "Inmates" },
  { key: "register", label: "Register" },
  { key: "lecturers", label: "Lecturers" },
  { key: "officers", label: "Officers" },
  { key: "attendance", label: "Attendance" },
  { key: "courses", label: "Courses" },
  { key: "certificates", label: "Certificates" },
  { key: "reports", label: "Reports" },
  { key: "security", label: "Security" },
  { key: "settings", label: "Settings" },
];

const SECTION_CONFIG: Record<Exclude<AdminSectionKey, "dashboard">, { title: string; description: string; primaryHref: string; secondaryHref: string; reportType: ReportType }> = {
  inmates: {
    title: "Inmate Registry",
    description: "Review inmate profiles, enrollment status, and profile quality checks in one place.",
    primaryHref: "/admin/inmates",
    secondaryHref: "/admin/register-inmate",
    reportType: "performance",
  },
  register: {
    title: "Registration",
    description: "Start new inmate registration workflows with biometric and profile capture controls.",
    primaryHref: "/admin/register-inmate",
    secondaryHref: "/admin/inmates",
    reportType: "operational-summary",
  },
  lecturers: {
    title: "Lecturer Management",
    description: "Manage lecturer assignments, profile records, and teaching load distributions.",
    primaryHref: "/admin/lecturers",
    secondaryHref: "/admin/courses",
    reportType: "course-effectiveness",
  },
  officers: {
    title: "Officer Management",
    description: "Manage clocking officers responsible for lab access and attendance operations.",
    primaryHref: "/admin/officers",
    secondaryHref: "/clockin/sessions",
    reportType: "operational-summary",
  },
  attendance: {
    title: "Attendance",
    description: "Audit entry and exit events, detect anomalies, and monitor closure rates.",
    primaryHref: "/admin/attendance",
    secondaryHref: "/clockin/sessions",
    reportType: "attendance",
  },
  courses: {
    title: "Course Catalog",
    description: "Manage active course catalog, assignments, and completion progression metrics.",
    primaryHref: "/admin/courses",
    secondaryHref: "/admin/reports",
    reportType: "course-effectiveness",
  },
  certificates: {
    title: "Certificates",
    description: "Track issuance, validate completion eligibility, and export certification records.",
    primaryHref: "/admin/certificates",
    secondaryHref: "/admin/reports",
    reportType: "performance",
  },
  reports: {
    title: "Reports Workspace",
    description: "Generate operational, attendance, and performance reports in secure formats.",
    primaryHref: "/admin/reports",
    secondaryHref: "/admin/security",
    reportType: "executive-pack",
  },
  security: {
    title: "Security & Audit",
    description: "Review audit trails, snapshot controls, and restoration approvals for system integrity.",
    primaryHref: "/admin/security",
    secondaryHref: "/admin/settings",
    reportType: "executive-pack",
  },
  settings: {
    title: "Settings",
    description: "Control platform behavior, biometric strict-mode, and backup/restore operations.",
    primaryHref: "/admin/settings",
    secondaryHref: "/admin/security",
    reportType: "executive-pack",
  },
};

const DONUT_COLORS = ["#4f7ba8", "#74a1ca", "#7f5334", "#d3ab74"];

const COMPLETION_BARS = [
  { label: "Recidivism\nCourse", parts: [16, 18, 22] },
  { label: "Basic\nCourses", parts: [14, 24, 18] },
  { label: "Artisan Skills\nProgress", parts: [10, 30, 18] },
  { label: "Certificate\nSections", parts: [19, 26, 10], tag: "55%" },
  { label: "Certificate\nIssuance", parts: [20, 22, 8], tag: "72%" },
];

const PROGRESS_TREND = [36, 41, 47, 53, 52, 54, 61, 66, 72];
const MONTHLY_REGISTRATIONS = [40, 55, 48, 53, 45, 52, 58];
const MONTHLY_LINE = [8, 14, 23, 27, 24, 31, 38];
const ENROLLMENT_TREND = [230, 340, 315, 370, 245, 210, 380, 285];
const FORECAST_TREND = [1220, 1460, 1690, 1870, 2110, 2260, 2410];

const DISTRIBUTION = [
  { label: "Recidivism Course", value: 23 },
  { label: "Basic Computer Skills", value: 27 },
  { label: "Certificate Issuance", value: 21 },
  { label: "Others Issuance", value: 29 },
];

const COURSE_ROWS = [
  { id: "GP-001", name: "Recidivism Course", lessons: 35, enrolled: 375, completion: 49 },
  { id: "GP-002", name: "Basic Computer Skills", lessons: 40, enrolled: 560, completion: 55 },
  { id: "GP-003", name: "Artisan Skills Training", lessons: 45, enrolled: 480, completion: 66 },
  { id: "GP-004", name: "Certificate Issuance", lessons: 25, enrolled: 565, completion: 77 },
];

const ENROLLED_ROWS = [
  { id: "GP-10234", name: "John Mensah", lessons: 6, enrolled: 4, completion: 72 },
  { id: "GP-10213", name: "Aminah Salmann", lessons: 5, enrolled: 3, completion: 65 },
  { id: "GP-10215", name: "Isaac Owusu", lessons: 8, enrolled: 5, completion: 80 },
  { id: "GP-10218", name: "Peter Owusu", lessons: 4, enrolled: 2, completion: 58 },
];

const TRACKING_ROWS = [
  { id: "TR-001", name: "Module Completion", lessons: 12, enrolled: 8, completion: 71 },
  { id: "TR-002", name: "Weekly Attendance", lessons: 10, enrolled: 7, completion: 63 },
  { id: "TR-003", name: "Assignment Score", lessons: 9, enrolled: 6, completion: 68 },
  { id: "TR-004", name: "Certification Pace", lessons: 7, enrolled: 5, completion: 74 },
];

const LECTURER_ROWS = [
  { id: "GP-L100", name: "Samuel Appiah", course: "Recidivism Course" },
  { id: "GP-L101", name: "Adwoa Sefia", course: "Basic Computer Skills" },
  { id: "GP-L102", name: "Isaac Mensah", course: "Artisan Skills Training" },
  { id: "GP-L103", name: "Peter Owusu", course: "Recidivism Course" },
  { id: "GP-L104", name: "Joseph Opoku", course: "Certificate Issuance" },
];

const SECONDARY_ROWS: Record<SecondaryTabKey, Array<{ id: string; name: string; course: string; actionHref: string }>> = {
  courses: [
    { id: "GP-L100", name: "Samuel Appiah", course: "Recidivism Course", actionHref: "/admin/lecturers" },
    { id: "GP-L101", name: "Adwoa Sefia", course: "Basic Computer Skills", actionHref: "/admin/lecturers" },
    { id: "GP-L102", name: "Isaac Mensah", course: "Artisan Skills Training", actionHref: "/admin/lecturers" },
  ],
  inmates: [
    { id: "GP-10234", name: "John Mensah", course: "Active: 4 Courses", actionHref: "/admin/inmates" },
    { id: "GP-10213", name: "Aminah Salmann", course: "Active: 3 Courses", actionHref: "/admin/inmates" },
    { id: "GP-10215", name: "Isaac Owusu", course: "Active: 5 Courses", actionHref: "/admin/inmates" },
  ],
  lecturers: [
    { id: "GP-L100", name: "Samuel Appiah", course: "Recidivism Course", actionHref: "/admin/lecturers" },
    { id: "GP-L101", name: "Adwoa Sefia", course: "Basic Computer Skills", actionHref: "/admin/lecturers" },
    { id: "GP-L102", name: "Isaac Mensah", course: "Artisan Skills Training", actionHref: "/admin/lecturers" },
  ],
};

function toPercent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
}

function polyline(values: number[], baseline: number, scale: number, step: number): string {
  return values.map((value, index) => `${index * step + 10},${baseline - value * scale}`).join(" ");
}

export default function AdminDashboardPage() {
  const [search, setSearch] = useState("");
  const [attendanceEvents, setAttendanceEvents] = useState(getAttendanceEventsState);
  const [clockinSessions, setClockinSessions] = useState<ClockinSessionRecord[]>([]);
  const [biometricRecords, setBiometricRecords] = useState<BiometricVerificationRecord[]>([]);
  const [localBiometricRecords] = useState<BiometricVerificationRecord[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("gps-local-biometric-events");
      if (!raw) return [];
      const parsed = JSON.parse(raw) as BiometricVerificationRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [activeSection, setActiveSection] = useState<AdminSectionKey>("dashboard");
  const [primaryTab, setPrimaryTab] = useState<PrimaryTabKey>("courses");
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTabKey>("courses");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [attendanceResponse, sessionsResponse, biometricResponse] = await Promise.all([
          fetchApi<{ attendance: AttendanceEvent[] }>("/api/v1/attendance"),
          fetchApi<{ sessions: ClockinSessionRecord[] }>("/api/v1/access/sessions?status=active"),
          fetchApi<{ verifications: BiometricVerificationRecord[] }>("/api/v1/biometric/verifications?limit=120"),
        ]);
        if (!mounted) return;
        setAttendanceEvents(attendanceResponse.attendance);
        setClockinSessions(sessionsResponse.sessions);
        setBiometricRecords(biometricResponse.verifications);
      } catch {
        // Use seeded local state when API unavailable.
      }
    }

    void loadData();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function onDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".admin-board-menu")) {
        setOpenMenuId(null);
      }
    }

    document.addEventListener("click", onDocumentClick);
    return () => {
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  const mergedBiometricRecords = useMemo(() => {
    const byId = new Map<string, BiometricVerificationRecord>();
    for (const record of [...biometricRecords, ...localBiometricRecords]) {
      byId.set(record.id, record);
    }
    return [...byId.values()].sort((left, right) => (left.verifiedAt < right.verifiedAt ? 1 : -1));
  }, [biometricRecords, localBiometricRecords]);

  const stats = useMemo(() => {
    const entries = attendanceEvents.filter((item) => item.type === "entry");
    const exits = attendanceEvents.filter((item) => item.type === "exit");
    return {
      totalInmatesRegistered: 1250,
      totalCourses: 36,
      totalLessons: 145,
      currentEnrollment: 1980,
      certificatesIssued: 540,
      newRegistrations: 58,
      attendanceRate: Math.max(72, toPercent(Math.min(entries.length, exits.length), entries.length)),
      activeClockingSessions: clockinSessions.length,
      fingerprintEvents: mergedBiometricRecords.filter((record) => record.result === "success" && record.method === "fingerprint").length,
      faceEvents: mergedBiometricRecords.filter((record) => record.result === "success" && record.method === "face").length,
    };
  }, [attendanceEvents, clockinSessions.length, mergedBiometricRecords]);

  const distributionTotal = DISTRIBUTION.reduce((sum, item) => sum + item.value, 0);

  const donutGradient = useMemo(() => {
    const built = DISTRIBUTION.reduce(
      (acc, item, index) => {
        const end = acc.cursor + (item.value / distributionTotal) * 360;
        const token = `${DONUT_COLORS[index]} ${acc.cursor}deg ${end}deg`;
        return { cursor: end, segments: [...acc.segments, token] };
      },
      { cursor: 0, segments: [] as string[] },
    );

    return `conic-gradient(${built.segments.join(", ")})`;
  }, [distributionTotal]);

  const primaryRows = useMemo(() => {
    const tabRows: Record<PrimaryTabKey, typeof COURSE_ROWS> = {
      courses: COURSE_ROWS,
      enrolled: ENROLLED_ROWS,
      tracking: TRACKING_ROWS,
    };
    const rows = tabRows[primaryTab];
    if (!search.trim()) return rows;
    const value = search.toLowerCase();
    return rows.filter((row) => row.id.toLowerCase().includes(value) || row.name.toLowerCase().includes(value));
  }, [primaryTab, search]);

  const secondaryRows = useMemo(() => SECONDARY_ROWS[secondaryTab], [secondaryTab]);
  const recentEvents = attendanceEvents.slice(0, 3);
  const recentBiometricEvents = mergedBiometricRecords.slice(0, 5);

  async function downloadReport(reportType: ReportType, format: ReportFormat) {
    try {
      setExportNotice(`Preparing ${format.toUpperCase()} export...`);
      const data = await fetchApi<ReportGenerateResponse>("/api/v1/reports/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportType, format }),
      });
      window.location.assign(data.downloadUrl);
      setExportNotice(`${format.toUpperCase()} export generated successfully.`);
    } catch (error) {
      setExportNotice(error instanceof Error ? error.message : "Failed to generate report export.");
    }
  }

  function buildCardMenu(reportType: ReportType, primaryHref: string, secondaryHref: string): CardMenuAction[] {
    return [
      {
        label: "Quick Links",
        children: [
          { label: "Open Section", href: primaryHref },
          { label: "Open Related Module", href: secondaryHref },
          { label: "Open Reports Workspace", href: "/admin/reports" },
          { label: "Open Security Center", href: "/admin/security" },
        ],
      },
      {
        label: "Downloads",
        children: [
          { label: "Download PDF", onSelect: () => void downloadReport(reportType, "pdf") },
          { label: "Download Excel", onSelect: () => void downloadReport(reportType, "xlsx") },
          { label: "Download CSV", onSelect: () => void downloadReport(reportType, "csv") },
          {
            label: "Print Dashboard",
            onSelect: () => {
              setExportNotice("Opening print dialog...");
              window.print();
            },
          },
        ],
      },
      { label: "Go to Reports", href: "/admin/reports" },
    ];
  }

  const primaryTabItems: Array<{ key: PrimaryTabKey; label: string }> = [
    { key: "courses", label: "All Courses" },
    { key: "enrolled", label: "Enrolled Inmates" },
    { key: "tracking", label: "Course Tracking" },
  ];

  const secondaryTabItems: Array<{ key: SecondaryTabKey; label: string }> = [
    { key: "courses", label: "All Courses" },
    { key: "inmates", label: "Enrolled Inmates" },
    { key: "lecturers", label: "Lecturers" },
  ];

  const activeSectionConfig = activeSection === "dashboard" ? null : SECTION_CONFIG[activeSection];

  return (
    <RoleShell title={appMeta.name} subtitle="Admin Workspace" userName="Admin Officer" hideNav hideFlowPanel>
      <div className="board-page admin-board-page admin-board-page-embedded">
        <section className="board-content admin-board-content admin-board-content-embedded">
          <section className="admin-board-pill-row" aria-label="Admin dashboard sections">
            {DASHBOARD_SECTION_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={activeSection === tab.key ? "is-active" : undefined}
                onClick={() => {
                  setActiveSection(tab.key);
                  setOpenMenuId(null);
                }}
              >
                {tab.label}
              </button>
            ))}
          </section>

          <section className="board-heading-row admin-board-heading-row">
            <h1>{activeSection === "dashboard" ? "Management Board" : activeSectionConfig?.title ?? "Management Board"}</h1>
            {exportNotice ? <p className="status-neutral admin-board-export-note">{exportNotice}</p> : null}
          </section>

          {activeSection !== "dashboard" && activeSectionConfig ? (
            <section className="board-panel board-panel-soft admin-board-card admin-board-section-panel">
              <div className="admin-board-card-head">
                <span>{activeSectionConfig.title}</span>
                <CardMenu
                  menuId={`section-${activeSection}`}
                  openMenuId={openMenuId}
                  setOpenMenuId={setOpenMenuId}
                  actions={buildCardMenu(activeSectionConfig.reportType, activeSectionConfig.primaryHref, activeSectionConfig.secondaryHref)}
                />
              </div>
              <div className="admin-board-card-body">
                <p className="quick-info">{activeSectionConfig.description}</p>
                <div className="admin-board-section-grid">
                  <article className="admin-board-section-stat">
                    <p>Registered Inmates</p>
                    <strong>{stats.totalInmatesRegistered.toLocaleString()}</strong>
                  </article>
                  <article className="admin-board-section-stat">
                    <p>Active Sessions</p>
                    <strong>{stats.activeClockingSessions}</strong>
                  </article>
                  <article className="admin-board-section-stat">
                    <p>Attendance Rate</p>
                    <strong>{stats.attendanceRate}%</strong>
                  </article>
                </div>
                <div className="admin-board-section-actions">
                  <Link href={activeSectionConfig.primaryHref} className="button-primary">
                    Open {activeSectionConfig.title}
                  </Link>
                  <Link href={activeSectionConfig.secondaryHref} className="button-soft">
                    Open Related Module
                  </Link>
                  <button type="button" className="button-soft" onClick={() => void downloadReport(activeSectionConfig.reportType, "pdf")}>Download PDF</button>
                  <button type="button" className="button-soft" onClick={() => void downloadReport(activeSectionConfig.reportType, "xlsx")}>Download Excel</button>
                  <button type="button" className="button-soft" onClick={() => void downloadReport(activeSectionConfig.reportType, "csv")}>Download CSV</button>
                </div>
              </div>
            </section>
          ) : null}

          {activeSection === "dashboard" ? (
            <>
              <section className="admin-board-top-grid">
                <article className="board-panel board-panel-soft admin-board-card">
                  <div className="admin-board-card-head">
                    <span>Inmate Progress &amp; Performance</span>
                    <CardMenu
                      menuId="menu-progress"
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      actions={buildCardMenu("performance", "/admin/inmates", "/admin/courses")}
                    />
                  </div>
                  <div className="admin-board-card-body">
                    <h3>Course Completion Rates</h3>
                    <div className="admin-board-completion-chart">
                      {COMPLETION_BARS.map((bar) => (
                        <div key={bar.label} className="admin-board-completion-col">
                          <div className="admin-board-stack-bar">
                            {bar.parts.map((piece, index) => (
                              <span key={`${bar.label}-${index}`} className={`tone-${index + 1}`} style={{ height: `${piece}%` }} />
                            ))}
                            {bar.tag ? <em>{bar.tag}</em> : null}
                          </div>
                          <p>{bar.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="admin-board-legend-row">
                      <span>
                        <i className="tone-1" /> Recidivism Course
                      </span>
                      <span>
                        <i className="tone-2" /> Artisan Progress
                      </span>
                      <span>
                        <i className="tone-3" /> Certificate Issuance
                      </span>
                    </div>

                    <h3>Overall Inmate Progress</h3>
                    <svg viewBox="0 0 420 84" className="board-sparkline admin-board-sparkline" role="img" aria-label="Overall inmate progress trend">
                      <polyline points={polyline(PROGRESS_TREND, 78, 0.85, 50)} />
                      {PROGRESS_TREND.map((value, index) => (
                        <circle key={`pt-${index}`} cx={index * 50 + 10} cy={78 - value * 0.85} r="2.8" />
                      ))}
                    </svg>
                  </div>
                </article>

                <article className="board-panel board-panel-soft admin-board-card">
                  <div className="admin-board-card-head">
                    <span>Course Statistics</span>
                    <CardMenu
                      menuId="menu-courses"
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      actions={buildCardMenu("course-effectiveness", "/admin/courses", "/admin/reports")}
                    />
                  </div>
                  <div className="admin-board-card-body">
                    <div className="admin-board-stat-split">
                      <div>
                        <h3>Course Enrollment Distribution</h3>
                        <div className="admin-board-donut-row">
                          <div className="board-donut admin-board-donut" style={{ background: donutGradient }}>
                            <div className="board-donut-hole" />
                          </div>
                          <ul className="board-legend-list admin-board-legend-list">
                            {DISTRIBUTION.map((item, index) => (
                              <li key={item.label}>
                                <span style={{ background: DONUT_COLORS[index] }} />
                                {item.label}
                                <strong>{item.value}%</strong>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="admin-board-side-stats">
                        <p>
                          Total Courses: <strong>{stats.totalCourses}</strong>
                        </p>
                        <p>
                          Total Lessons: <strong>{stats.totalLessons}</strong>
                        </p>
                        <p>
                          Current Enrollment: <strong>{stats.currentEnrollment.toLocaleString()}</strong>
                        </p>
                        <p>
                          Certificate Issued: <strong>{stats.certificatesIssued.toLocaleString()}</strong>
                        </p>
                      </div>
                    </div>

                    <h3>Course Enrollment Stats</h3>
                    <div className="board-mini-bars admin-board-mini-bars">
                      {ENROLLMENT_TREND.map((value, index) => (
                        <span key={`enr-${index}`} style={{ height: `${Math.max(24, value / 5)}px` }} />
                      ))}
                    </div>
                  </div>
                </article>

                <aside className="board-panel board-panel-soft admin-board-card admin-board-side-card">
                  <div className="admin-board-card-head">
                    <span>Registration &amp; Attendance</span>
                    <CardMenu
                      menuId="menu-attendance"
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      actions={buildCardMenu("attendance", "/admin/attendance", "/admin/reports")}
                    />
                  </div>
                  <div className="admin-board-card-body">
                    <div className="admin-board-stat-box">
                      <p>Total Registered Inmates:</p>
                      <strong>{stats.totalInmatesRegistered.toLocaleString()}</strong>
                    </div>
                    <div className="admin-board-stat-box">
                      <p>New Registrations</p>
                      <strong>{stats.newRegistrations}</strong>
                    </div>
                    <div className="admin-board-stat-box">
                      <p>Avg. Attendance Rate:</p>
                      <strong>{stats.attendanceRate}%</strong>
                    </div>
                    <div className="admin-board-stat-box">
                      <p>Fingerprint Verifications</p>
                      <strong>{stats.fingerprintEvents}</strong>
                    </div>
                    <div className="admin-board-stat-box">
                      <p>Facial Verifications</p>
                      <strong>{stats.faceEvents}</strong>
                    </div>

                    <h3>Monthly New Registrations</h3>
                    <svg viewBox="0 0 320 126" className="admin-board-monthly-svg" role="img" aria-label="Monthly new registrations">
                      {MONTHLY_REGISTRATIONS.map((value, index) => (
                        <rect key={`bar-${index}`} x={index * 44 + 12} y={106 - value} width="24" height={value} rx="2" />
                      ))}
                      <polyline points={polyline(MONTHLY_LINE, 112, 2, 44)} />
                      {MONTHLY_LINE.map((value, index) => (
                        <circle key={`line-${index}`} cx={index * 44 + 10} cy={112 - value * 2} r="3" />
                      ))}
                    </svg>

                    <ul className="admin-board-check-list">
                      <li>Predicting a 13% trend in new inmate registrations over the next months.</li>
                      <li>Projected to reach 1,480 inmates registered by the end of projections.</li>
                    </ul>

                    <Link href="/admin/reports" className="button-primary admin-board-report-btn">
                      Generate Report
                    </Link>
                  </div>
                </aside>
              </section>

              <section className="admin-board-bottom-grid">
                <div className="admin-board-left-stack">
                  <article className="board-panel board-panel-soft admin-board-card">
                    <div className="admin-board-tabs">
                      {primaryTabItems.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          className={primaryTab === tab.key ? "is-active" : undefined}
                          onClick={() => setPrimaryTab(tab.key)}
                        >
                          {tab.label}
                        </button>
                      ))}
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="input"
                        placeholder="Search"
                        data-testid="admin-search"
                      />
                    </div>

                    <div className="table-shell admin-board-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Course ID</th>
                            <th>Course Name</th>
                            <th>Lessons</th>
                            <th>Enrolled</th>
                            <th>Completion Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {primaryRows.map((row) => (
                            <tr key={row.id}>
                              <td>{row.id}</td>
                              <td>{row.name}</td>
                              <td>{row.lessons}</td>
                              <td>{row.enrolled}</td>
                              <td>
                                <div className="admin-board-progress-cell">
                                  <div className="board-progress-mini">
                                    <span style={{ width: `${row.completion}%` }} />
                                  </div>
                                  <strong>{row.completion}%</strong>
                                </div>
                              </td>
                              <td>
                                <Link href="/admin/courses" className="button-soft admin-board-view-btn">
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>

                  <article className="board-panel board-panel-soft admin-board-card">
                    <div className="admin-board-tabs admin-board-tabs-secondary">
                      {secondaryTabItems.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          className={secondaryTab === tab.key ? "is-active" : undefined}
                          onClick={() => setSecondaryTab(tab.key)}
                        >
                          {tab.label}
                        </button>
                      ))}
                      <input className="input" placeholder="Search" />
                    </div>
                    <div className="table-shell admin-board-table admin-board-small-table">
                      <table>
                        <thead>
                          <tr>
                            <th>Lecturer ID</th>
                            <th>Lecturer Name</th>
                            <th>Course Teaching</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {secondaryRows.map((row) => (
                            <tr key={`${secondaryTab}-${row.id}`}>
                              <td>{row.id}</td>
                              <td>{row.name}</td>
                              <td>{row.course}</td>
                              <td>
                                <Link href={row.actionHref} className="button-soft admin-board-view-btn">
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </article>
                </div>

                <article className="board-panel board-panel-soft admin-board-card">
                  <div className="admin-board-card-head">
                    <span>Lecturers</span>
                    <CardMenu
                      menuId="menu-lecturers"
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      actions={buildCardMenu("course-effectiveness", "/admin/lecturers", "/admin/courses")}
                    />
                  </div>
                  <div className="admin-board-card-body">
                    <div className="table-shell admin-board-table">
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Lecturer Name</th>
                            <th>Course Teaching</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {LECTURER_ROWS.map((lecturer) => (
                            <tr key={lecturer.id}>
                              <td>{lecturer.id}</td>
                              <td>
                                <div className="admin-board-lecturer-cell">
                                  <Image src="/assets/education/sample-face-avatar.svg" alt="" width={28} height={28} />
                                  <span>{lecturer.name}</span>
                                </div>
                              </td>
                              <td>{lecturer.course}</td>
                              <td>
                                <Link href="/admin/lecturers" className="button-soft admin-board-view-btn">
                                  View
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </article>

                <aside className="board-panel board-panel-soft admin-board-card admin-board-side-card">
                  <div className="admin-board-card-head">
                    <span>AI Predictive Analysis</span>
                    <CardMenu
                      menuId="menu-ai"
                      openMenuId={openMenuId}
                      setOpenMenuId={setOpenMenuId}
                      actions={buildCardMenu("executive-pack", "/admin/reports", "/clockin/sessions")}
                    />
                  </div>
                  <div className="admin-board-card-body">
                    <h3>Ghana Prison AI</h3>
                    <p className="quick-info">Analyzing trend signals to forecast inmate registration outcomes.</p>

                    <h3>Inmate Registration Forecast</h3>
                    <svg viewBox="0 0 320 78" className="board-sparkline" role="img" aria-label="Inmate registration forecast">
                      <polyline points={polyline(FORECAST_TREND, 74, 0.026, 48)} />
                      {FORECAST_TREND.map((value, index) => (
                        <circle key={`forecast-${index}`} cx={index * 48 + 10} cy={74 - value * 0.026} r="2.8" />
                      ))}
                    </svg>

                    <ul className="admin-board-check-list">
                      <li>Predicting a 13% increase in new inmate registrations over future months.</li>
                      <li>Projected to reach 1,480 inmates registered by end of current forecast cycle.</li>
                    </ul>

                    <h3>Live Clock-In Data</h3>
                    <p className="quick-info">Active Sessions: {stats.activeClockingSessions}</p>
                    <div className="board-list admin-board-log-list">
                      {recentEvents.map((event) => (
                        <div key={`${event.studentId}-${event.timestamp}`} className="board-list-item">
                          <div>
                            <strong>{event.studentId}</strong>
                            <p>
                              {event.type.toUpperCase()} via {event.verifiedBy}
                            </p>
                          </div>
                          <span className="quick-info">{formatDateTime(event.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                    <h3>Biometric Verification Logs</h3>
                    <div className="board-list admin-board-log-list">
                      {recentBiometricEvents.map((record) => (
                        <div key={record.id} className="board-list-item">
                          <div>
                            <strong>{record.studentId}</strong>
                            <p>
                              {record.method} via {record.proof}
                            </p>
                          </div>
                          <span className={record.result === "success" ? "status-ok" : "status-bad"}>{record.result}</span>
                        </div>
                      ))}
                      {recentBiometricEvents.length === 0 ? <p className="quick-info">No biometric logs yet.</p> : null}
                    </div>
                  </div>
                </aside>
              </section>
            </>
          ) : null}
        </section>

        <footer className="board-footer admin-board-footer">Last Sync: 2 mins ago • Local Secure Server</footer>
      </div>
    </RoleShell>
  );
}
