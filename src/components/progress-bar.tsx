interface ProgressBarProps {
  label: string;
  current: number;
  total: number;
}

export function ProgressBar({ label, current, total }: ProgressBarProps) {
  const percent = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="progress-row">
      <div className="progress-row-head">
        <span>{label}</span>
        <span>
          {current} / {total}
        </span>
      </div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <span className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
    </div>
  );
}
