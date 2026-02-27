import { toPercent } from "@/lib/format";

interface ProgressDonutProps {
  value: number;
  label: string;
  size?: number;
}

export function ProgressDonut({ value, label, size = 180 }: ProgressDonutProps) {
  const percent = Math.min(100, Math.max(0, value));

  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <div
        className="donut-ring"
        style={{ background: `conic-gradient(var(--copper-500) ${percent * 3.6}deg, #efe5db 0)` }}
      >
        <div className="donut-inner">
          <strong>{toPercent(percent)}</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}
