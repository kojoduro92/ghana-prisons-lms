interface SecurityBadgeProps {
  label: string;
}

export function SecurityBadge({ label }: SecurityBadgeProps) {
  return <span className="security-badge">{label}</span>;
}
