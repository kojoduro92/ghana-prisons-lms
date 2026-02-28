type StatCardTone = "azure" | "teal" | "violet" | "orange";

interface StatCardProps {
  label: string;
  value: string | number;
  helper?: string;
  tone?: StatCardTone;
}

const toneScale: StatCardTone[] = ["azure", "teal", "violet", "orange"];

function hashLabelToTone(label: string): StatCardTone {
  const hash = label
    .toLowerCase()
    .split("")
    .reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  return toneScale[hash % toneScale.length];
}

function resolveIconName(label: string): "users" | "book" | "shield" | "chart" | "clock" | "award" {
  const normalized = label.toLowerCase();
  if (normalized.includes("certificate") || normalized.includes("award")) return "award";
  if (normalized.includes("course") || normalized.includes("catalog")) return "book";
  if (
    normalized.includes("audit") ||
    normalized.includes("security") ||
    normalized.includes("login") ||
    normalized.includes("biometric")
  ) {
    return "shield";
  }
  if (normalized.includes("rate") || normalized.includes("score") || normalized.includes("completion")) return "chart";
  if (normalized.includes("entry") || normalized.includes("exit") || normalized.includes("session")) return "clock";
  return "users";
}

function StatIcon({ name }: { name: ReturnType<typeof resolveIconName> }) {
  if (name === "book") {
    return (
      <svg className="stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21V5.5Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 18h15" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg className="stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3 5 6v6c0 4.4 2.8 7.7 7 9 4.2-1.3 7-4.6 7-9V6l-7-3Z" stroke="currentColor" strokeWidth="1.8" />
        <path d="m9.3 12 2 2 3.6-4.1" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg className="stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 19h16" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 16.5 10 12l3 2.3 5-6.3" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="6" cy="16.5" r="1.2" fill="currentColor" />
        <circle cx="10" cy="12" r="1.2" fill="currentColor" />
        <circle cx="13" cy="14.3" r="1.2" fill="currentColor" />
        <circle cx="18" cy="8" r="1.2" fill="currentColor" />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg className="stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 7.6v4.9l3.4 1.8" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  if (name === "award") {
    return (
      <svg className="stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="9" r="4.4" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9.3 13.3 8.2 20l3.8-2.4 3.8 2.4-1.1-6.7" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }

  return (
    <svg className="stat-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="8" cy="9" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16.2" cy="10.2" r="2.7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M3.8 19.2c.8-2.9 2.8-4.5 6-4.5s5.2 1.6 6 4.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13.4 18.8c.6-1.9 2.1-3 4.4-3 1.7 0 3.1.7 4 2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export function StatCard({ label, value, helper, tone }: StatCardProps) {
  const resolvedTone = tone ?? hashLabelToTone(label);
  const iconName = resolveIconName(label);

  return (
    <article className={`stat-card stat-card-${resolvedTone}`} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="stat-card-head">
        <span className="stat-icon-badge">
          <StatIcon name={iconName} />
        </span>
        <span className="stat-card-menu" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {helper ? <p className="stat-helper">{helper}</p> : null}
      <span className="stat-watermark" aria-hidden>
        <span />
        <span />
      </span>
    </article>
  );
}
