export function formatDateTime(input: string): string {
  return new Date(input).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function toPercent(value: number): string {
  return `${Math.round(value)}%`;
}
