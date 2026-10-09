import { school } from '@/config/school';

const TZ = school.locale.timeZone;

export function formatDate(d: Date | string, locale: string, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-BO', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  }).format(new Date(d));
}

export function formatDateTime(d: Date | string, locale: string) {
  return formatDate(d, locale, { hour: '2-digit', minute: '2-digit' });
}

export function formatTime(d: Date | string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'es-BO', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(d));
}

export function formatSlot(start: Date | string, end: Date | string, locale: string) {
  const day = formatDate(start, locale, { weekday: 'long', day: 'numeric', month: 'long', year: undefined });
  return `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${formatTime(start, locale)}–${formatTime(end, locale)}`;
}

/**
 * Build a Date for a wall-clock time in La Paz (UTC−4, no DST).
 * `date` is YYYY-MM-DD, `time` is HH:mm.
 */
export function laPazDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00-04:00`);
}

/** YYYY-MM-DD for "today" in La Paz. */
export function laPazToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now);
}

export function monthsBetween(a: Date, b: Date) {
  return Math.abs((b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
}

export function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86_400_000);
}
