import { CourseCard } from "@/components/course-card";
import { ProgressBar } from "@/components/progress-bar";
import { ProgressDonut } from "@/components/progress-donut";
import { RoleShell } from "@/components/role-shell";
import { ChartCard } from "@/components/chart-card";
import {
  appMeta,
  enrollments,
  inmateGoals,
  progressSnapshots,
  topRatedCourses,
} from "@/lib/seed-data";

export default function InmateDashboardPage() {
  const snapshot = progressSnapshots[0];
  const activeCourses = enrollments
    .filter((item) => item.studentId === snapshot.studentId)
    .map((item) => {
      const course = topRatedCourses.find((entry) => entry.id === item.courseId);
      return {
        id: item.courseId,
        title: course?.title ?? item.courseId,
        subtitle: course?.category ?? "General",
        progress: item.progressPercent,
      };
    });

  return (
    <RoleShell title={appMeta.name} subtitle="Inmate Dashboard" userName="John Mensah">
      <section className="panel grid-2">
        <div>
          <h1 style={{ marginBottom: 6 }}>Welcome Back, John Mensah</h1>
          <p className="quick-info">Student ID: {snapshot.studentId}</p>
          <div className="grid-3" style={{ marginTop: 14 }}>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Active Courses</p>
              <h3>{snapshot.activeCourses}</h3>
            </article>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Lessons Completed</p>
              <h3>{snapshot.completedLessons}</h3>
            </article>
            <article className="panel" style={{ padding: 12 }}>
              <p className="quick-info">Certificates Earned</p>
              <h3>{snapshot.certificatesEarned}</h3>
            </article>
          </div>
        </div>
        <div className="panel" style={{ padding: 12 }}>
          <h3 style={{ marginBottom: 10 }}>My Progress</h3>
          <ProgressDonut value={snapshot.completionPercent} label="Course Completion" size={190} />
        </div>
      </section>

      <section className="panel">
        <div className="inline-row" style={{ marginBottom: 12 }}>
          <h2 className="section-title" style={{ marginBottom: 0 }}>
            Continue Learning
          </h2>
        </div>
        <div className="grid-4">
          {activeCourses.map((course) => (
            <CourseCard key={course.id} title={course.title} subtitle={course.subtitle} progress={course.progress} />
          ))}
        </div>
      </section>

      <section className="grid-2">
        <ChartCard title="Weekly Learning Activity">
          <div className="mini-bars" style={{ minHeight: 130 }}>
            {snapshot.weeklyActivity.map((point, idx) => (
              <span key={idx} style={{ height: `${point * 16}px` }} />
            ))}
          </div>
          <div className="legend">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>
        </ChartCard>

        <ChartCard title="Goals & Achievements">
          {inmateGoals.map((goal) => (
            <ProgressBar key={goal.label} label={goal.label} current={goal.current} total={goal.total} />
          ))}
        </ChartCard>
      </section>
    </RoleShell>
  );
}
