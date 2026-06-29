export const SECOND = 1000;
export const MINUTE = 60 * SECOND;

export function nowIso(date = new Date()): string {
  return date.toISOString();
}

export function secondsBetween(startIso: string, endIso: string): number {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error('Invalid timestamp');
  }
  const seconds = Math.round((end - start) / SECOND);
  if (seconds <= 0) {
    throw new Error('End time must be after start time');
  }
  return seconds;
}

export function timerElapsedSeconds(timer: {
  status: 'running' | 'paused';
  started_at: string;
  paused_at: string | null;
  accumulated_seconds: number;
}, at = new Date()): number {
  if (timer.status === 'paused') {
    return timer.accumulated_seconds;
  }
  return timer.accumulated_seconds + Math.max(0, Math.floor((at.getTime() - Date.parse(timer.started_at)) / SECOND));
}

type LocalParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function normalizeTimeZone(value: unknown): string {
  const fallback = systemTimeZone();
  if (typeof value !== 'string' || !value.trim()) return fallback;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format(new Date());
    return value;
  } catch {
    return fallback;
  }
}

function partsInTimeZone(date: Date, timeZone: string): LocalParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second)
  };
}

function offsetMsAt(date: Date, timeZone: string): number {
  const parts = partsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asUtc - date.getTime();
}

function zonedLocalToUtc(parts: Pick<LocalParts, 'year' | 'month' | 'day'>, timeZone: string): Date {
  const localAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0);
  let result = new Date(localAsUtc - offsetMsAt(new Date(localAsUtc), timeZone));
  const refined = new Date(localAsUtc - offsetMsAt(result, timeZone));
  if (refined.getTime() !== result.getTime()) result = refined;
  return result;
}

export function startOfLocalDate(dateKey: string, timeZone = systemTimeZone()): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) throw new Error('Invalid date');
  return zonedLocalToUtc(
    { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) },
    normalizeTimeZone(timeZone)
  );
}

export function localDateKey(date = new Date(), timeZone = systemTimeZone()): string {
  const parts = partsInTimeZone(date, normalizeTimeZone(timeZone));
  const year = parts.year;
  const month = `${parts.month}`.padStart(2, '0');
  const day = `${parts.day}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date = new Date(), timeZone = systemTimeZone()): Date {
  const zone = normalizeTimeZone(timeZone);
  return zonedLocalToUtc(partsInTimeZone(date, zone), zone);
}

export function addDays(date: Date, days: number, timeZone = systemTimeZone()): Date {
  const zone = normalizeTimeZone(timeZone);
  const parts = partsInTimeZone(date, zone);
  const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return zonedLocalToUtc(partsInTimeZone(shifted, 'UTC'), zone);
}

export function startOfLocalWeek(date = new Date(), timeZone = systemTimeZone()): Date {
  const zone = normalizeTimeZone(timeZone);
  const localDay = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short' }).format(date)
  );
  const weekDay = localDay < 0 ? 1 : localDay;
  const diff = weekDay === 0 ? -6 : 1 - weekDay;
  return addDays(startOfLocalDay(date, zone), diff, zone);
}

export function startOfLocalMonth(date = new Date(), timeZone = systemTimeZone()): Date {
  const zone = normalizeTimeZone(timeZone);
  const parts = partsInTimeZone(date, zone);
  return zonedLocalToUtc({ year: parts.year, month: parts.month, day: 1 }, zone);
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${`${minutes}`.padStart(2, '0')}m`;
}

export function normalizeTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String).map((tag) => tag.trim()).filter(Boolean).slice(0, 16);
  }
  if (typeof input === 'string') {
    return input.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 16);
  }
  return [];
}

export function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
