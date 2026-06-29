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

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfLocalWeek(date = new Date()): Date {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return startOfLocalDay(addDays(date, diff));
}

export function startOfLocalMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
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
