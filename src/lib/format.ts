const DISPLAY_LOCALE = "en-GH";
const DISPLAY_TIME_ZONE = "Africa/Accra";

function toDate(input: string | number | Date): Date | null {
  const value = input instanceof Date ? input : new Date(input);
  return Number.isFinite(value.getTime()) ? value : null;
}

export function formatDateTime(input: string | number | Date): string {
  const value = toDate(input);
  if (!value) return "-";
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function formatDate(input: string | number | Date): string {
  const value = toDate(input);
  if (!value) return "-";
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: DISPLAY_TIME_ZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(value);
}

export function formatTime(input: string | number | Date): string {
  const value = toDate(input);
  if (!value) return "-";
  return new Intl.DateTimeFormat(DISPLAY_LOCALE, {
    timeZone: DISPLAY_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export function toPercent(value: number): string {
  return `${Math.round(value)}%`;
}
