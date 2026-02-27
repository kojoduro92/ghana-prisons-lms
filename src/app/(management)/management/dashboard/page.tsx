import { ChartCard } from "@/components/chart-card";
import { RoleShell } from "@/components/role-shell";
import { StatCard } from "@/components/stat-card";
import { appMeta, managementSnapshot } from "@/lib/seed-data";

export default function ManagementDashboardPage() {
  return (
    <RoleShell title={appMeta.name} subtitle="Management Analytics Portal" userName="Command Staff">
      <section className="grid-3">
        <StatCard label="Enrollment Growth" value="+14%" helper="Quarter over quarter" />
        <StatCard label="Completion Rate" value="63%" helper="Current operational average" />
        <StatCard label="Forecast Confidence" value="84%" helper="Predictive AI panel" />
      </section>

      <section className="grid-2">
        <ChartCard title="Enrollment Trend">
          <div className="mini-bars">
            {managementSnapshot.enrollmentTrend.map((point, idx) => (
              <span key={idx} style={{ height: `${Math.round(point / 5)}px` }} />
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Course Popularity">
          <div style={{ display: "grid", gap: 10 }}>
            {managementSnapshot.coursePopularity.map((item) => (
              <div key={item.label}>
                <div className="progress-row-head">
                  <span>{item.label}</span>
                  <span>{item.value}%</span>
                </div>
                <div className="progress-track">
                  <span className="progress-fill" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </section>

      <section className="panel">
        <h2 className="section-title">Predictive AI Insights</h2>
        <div className="grid-3">
          {managementSnapshot.aiForecasts.map((forecast) => (
            <article key={forecast.label} className="panel" style={{ padding: 12 }}>
              <h3 style={{ fontSize: "1rem", marginBottom: 8 }}>{forecast.label}</h3>
              <p style={{ margin: "0 0 6px" }}>{forecast.value}</p>
              <p className="quick-info" style={{ margin: 0 }}>
                Confidence: {forecast.confidence}
              </p>
            </article>
          ))}
        </div>
      </section>
    </RoleShell>
  );
}
