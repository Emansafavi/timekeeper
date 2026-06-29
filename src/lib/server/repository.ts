import type Database from 'better-sqlite3';
import type { ActiveTimer, DashboardStats, Profile, Settings, TimeEntry } from '$lib/types';
import {
  addDays,
  localDateKey,
  normalizeTags,
  nowIso,
  secondsBetween,
  startOfLocalDay,
  startOfLocalMonth,
  startOfLocalWeek,
  timerElapsedSeconds
} from './time';
import { getDatabase } from './db';

type Row = Record<string, any>;
type TimerRow = Row & {
  status: 'running' | 'paused';
  started_at: string;
  paused_at: string | null;
  accumulated_seconds: number;
};

export class AppError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function jsonResponseValue(value: unknown): string {
  return JSON.stringify(value);
}

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function mapProfile(row: Row): Profile {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    category: row.category,
    archived: Boolean(row.archived),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEntry(row: Row): TimeEntry {
  return {
    id: row.id,
    profileId: row.profile_id,
    profileName: row.profile_name,
    profileColor: row.profile_color,
    startAt: row.start_at,
    endAt: row.end_at,
    durationSeconds: row.duration_seconds,
    note: row.note,
    tags: parseTags(row.tags_json),
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapTimer(row: Row | undefined, at = new Date()): ActiveTimer | null {
  if (!row) return null;
  return {
    id: row.id,
    profileId: row.profile_id,
    profileName: row.profile_name,
    profileColor: row.profile_color,
    status: row.status,
    startedAt: row.started_at,
    pausedAt: row.paused_at,
    accumulatedSeconds: row.accumulated_seconds,
    tags: parseTags(row.tags_json),
    elapsedSeconds: timerElapsedSeconds(row as TimerRow, at)
  };
}

function assertProfileUsable(db: Database.Database, profileId: number): void {
  const profile = db.prepare('SELECT id, archived FROM profiles WHERE id = ?').get(profileId) as Row | undefined;
  if (!profile) throw new AppError('Choose an existing profile.', 404);
  if (profile.archived) throw new AppError('This profile is archived. Unarchive it before adding new work.');
}

function assertValidEntryInput(input: { profileId: number; startAt: string; endAt: string; note: string }): number {
  if (!Number.isInteger(input.profileId)) throw new AppError('Choose a profile.');
  if (!input.note?.trim()) throw new AppError('Add a short note about what you did.');
  const duration = secondsBetween(input.startAt, input.endAt);
  if (duration > 60 * 60 * 24) throw new AppError('Entries longer than 24 hours need to be split.');
  return duration;
}

function assertNoDuplicate(
  db: Database.Database,
  input: { profileId: number; startAt: string; endAt: string },
  excludeId?: number
): void {
  const duplicate = db
    .prepare(`
      SELECT id FROM time_entries
      WHERE deleted_at IS NULL
        AND profile_id = ?
        AND start_at = ?
        AND end_at = ?
        AND (? IS NULL OR id != ?)
      LIMIT 1
    `)
    .get(input.profileId, input.startAt, input.endAt, excludeId ?? null, excludeId ?? null);
  if (duplicate) throw new AppError('This looks like a duplicate entry.');
}

function assertNoOverlap(
  db: Database.Database,
  input: { startAt: string; endAt: string },
  allowOverlap: boolean,
  excludeId?: number
): void {
  if (allowOverlap) return;
  const overlap = db
    .prepare(`
      SELECT id FROM time_entries
      WHERE deleted_at IS NULL
        AND start_at < ?
        AND end_at > ?
        AND (? IS NULL OR id != ?)
      LIMIT 1
    `)
    .get(input.endAt, input.startAt, excludeId ?? null, excludeId ?? null);
  if (overlap) throw new AppError('That overlaps an existing entry. Enable overlaps in Settings if this is intentional.');
}

export function listProfiles(db = getDatabase()): Profile[] {
  const rows = db
    .prepare('SELECT * FROM profiles ORDER BY archived ASC, name COLLATE NOCASE ASC')
    .all() as Row[];
  return rows.map(mapProfile);
}

export function createProfile(input: { name: string; color?: string; category?: string | null }, db = getDatabase()): Profile {
  const name = input.name?.trim();
  if (!name) throw new AppError('Profile name is required.');
  const now = nowIso();
  const result = db
    .prepare(`
      INSERT INTO profiles (name, color, category, archived, created_at, updated_at)
      VALUES (?, ?, ?, 0, ?, ?)
    `)
    .run(name, input.color || '#007aff', input.category?.trim() || null, now, now);
  return mapProfile(db.prepare('SELECT * FROM profiles WHERE id = ?').get(result.lastInsertRowid) as Row);
}

export function updateProfile(
  id: number,
  input: Partial<{ name: string; color: string; category: string | null; archived: boolean }>,
  db = getDatabase()
): Profile {
  const existing = db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as Row | undefined;
  if (!existing) throw new AppError('Profile not found.', 404);
  const now = nowIso();
  db.prepare(`
    UPDATE profiles
    SET name = ?, color = ?, category = ?, archived = ?, updated_at = ?
    WHERE id = ?
  `).run(
    input.name?.trim() || existing.name,
    input.color || existing.color,
    input.category === undefined ? existing.category : input.category || null,
    input.archived === undefined ? existing.archived : input.archived ? 1 : 0,
    now,
    id
  );
  return mapProfile(db.prepare('SELECT * FROM profiles WHERE id = ?').get(id) as Row);
}

export function getSettings(db = getDatabase()): Settings {
  const rows = db.prepare('SELECT key, value_json FROM settings').all() as Row[];
  const values = Object.fromEntries(rows.map((row) => [row.key, JSON.parse(row.value_json)]));
  return {
    reminderTime: values.reminderTime ?? '20:00',
    notificationsEnabled: Boolean(values.notificationsEnabled),
    allowOverlaps: Boolean(values.allowOverlaps),
    timezone: values.timezone ?? 'UTC',
    firstRunComplete: Boolean(values.firstRunComplete)
  };
}

export function updateSettings(input: Partial<Settings>, db = getDatabase()): Settings {
  const allowed = ['reminderTime', 'notificationsEnabled', 'allowOverlaps', 'timezone', 'firstRunComplete'] as const;
  const now = nowIso();
  const upsert = db.prepare(`
    INSERT INTO settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `);
  const tx = db.transaction(() => {
    for (const key of allowed) {
      if (input[key] !== undefined) upsert.run(key, jsonResponseValue(input[key]), now);
    }
  });
  tx();
  return getSettings(db);
}

export function getActiveTimer(db = getDatabase(), at = new Date()): ActiveTimer | null {
  const row = db
    .prepare(`
      SELECT active_timer.*, profiles.name AS profile_name, profiles.color AS profile_color
      FROM active_timer
      JOIN profiles ON profiles.id = active_timer.profile_id
      WHERE active_timer.id = 1
    `)
    .get() as Row | undefined;
  return mapTimer(row, at);
}

export function startTimer(
  input: { profileId: number; tags?: unknown; allowOverlap?: boolean },
  db = getDatabase()
): ActiveTimer {
  const tx = db.transaction(() => {
    assertProfileUsable(db, input.profileId);
    const existing = db.prepare('SELECT id FROM active_timer WHERE id = 1').get();
    if (existing && !input.allowOverlap) {
      throw new AppError('A timer is already active. Pause or stop it first.');
    }
    if (existing) db.prepare('DELETE FROM active_timer WHERE id = 1').run();
    const now = nowIso();
    db.prepare(`
      INSERT INTO active_timer (id, profile_id, status, started_at, paused_at, accumulated_seconds, tags_json, created_at, updated_at)
      VALUES (1, ?, 'running', ?, NULL, 0, ?, ?, ?)
    `).run(input.profileId, now, jsonResponseValue(normalizeTags(input.tags)), now, now);
    return getActiveTimer(db);
  });
  return tx()!;
}

export function pauseTimer(db = getDatabase()): ActiveTimer {
  const tx = db.transaction(() => {
    const row = db.prepare('SELECT * FROM active_timer WHERE id = 1').get() as Row | undefined;
    if (!row) throw new AppError('No active timer to pause.', 404);
    if (row.status === 'paused') return getActiveTimer(db)!;
    const now = new Date();
    const elapsed = timerElapsedSeconds(row as TimerRow, now);
    db.prepare(`
      UPDATE active_timer
      SET status = 'paused', paused_at = ?, accumulated_seconds = ?, updated_at = ?
      WHERE id = 1
    `).run(now.toISOString(), elapsed, now.toISOString());
    return getActiveTimer(db, now)!;
  });
  return tx();
}

export function resumeTimer(db = getDatabase()): ActiveTimer {
  const tx = db.transaction(() => {
    const row = db.prepare('SELECT * FROM active_timer WHERE id = 1').get() as Row | undefined;
    if (!row) throw new AppError('No active timer to resume.', 404);
    if (row.status === 'running') return getActiveTimer(db)!;
    const now = nowIso();
    db.prepare(`
      UPDATE active_timer
      SET status = 'running', started_at = ?, paused_at = NULL, updated_at = ?
      WHERE id = 1
    `).run(now, now);
    return getActiveTimer(db)!;
  });
  return tx();
}

export function stopTimer(input: { note: string; allowOverlap?: boolean }, db = getDatabase()): TimeEntry {
  const tx = db.transaction(() => {
    const row = db
      .prepare(`
        SELECT active_timer.*, profiles.name AS profile_name, profiles.color AS profile_color
        FROM active_timer
        JOIN profiles ON profiles.id = active_timer.profile_id
        WHERE active_timer.id = 1
      `)
      .get() as Row | undefined;
    if (!row) throw new AppError('No active timer to stop.', 404);
    if (!input.note?.trim()) throw new AppError('Add a short note before stopping.');

    const now = new Date();
    const duration = timerElapsedSeconds(row as TimerRow, now);
    if (duration < 60) throw new AppError('Timer is under one minute. Keep going a little longer or discard it.');

    const startAt = row.created_at;
    const endAt = now.toISOString();
    assertNoDuplicate(db, { profileId: row.profile_id, startAt, endAt });
    assertNoOverlap(db, { startAt, endAt }, Boolean(input.allowOverlap));

    const result = db
      .prepare(`
        INSERT INTO time_entries (profile_id, start_at, end_at, duration_seconds, note, tags_json, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'timer', ?, ?)
      `)
      .run(row.profile_id, startAt, endAt, duration, input.note.trim(), row.tags_json, endAt, endAt);
    db.prepare('DELETE FROM active_timer WHERE id = 1').run();
    return getEntry(Number(result.lastInsertRowid), db)!;
  });
  return tx();
}

export function discardTimer(db = getDatabase()): void {
  db.prepare('DELETE FROM active_timer WHERE id = 1').run();
}

export function getEntry(id: number, db = getDatabase()): TimeEntry | null {
  const row = db
    .prepare(`
      SELECT time_entries.*, profiles.name AS profile_name, profiles.color AS profile_color
      FROM time_entries
      JOIN profiles ON profiles.id = time_entries.profile_id
      WHERE time_entries.id = ? AND time_entries.deleted_at IS NULL
    `)
    .get(id) as Row | undefined;
  return row ? mapEntry(row) : null;
}

export function listEntries(
  filters: { from?: string | null; to?: string | null; profileId?: number | null; tag?: string | null; limit?: number } = {},
  db = getDatabase()
): TimeEntry[] {
  const where = ['time_entries.deleted_at IS NULL'];
  const params: unknown[] = [];
  if (filters.from) {
    where.push('time_entries.end_at >= ?');
    params.push(filters.from);
  }
  if (filters.to) {
    where.push('time_entries.start_at <= ?');
    params.push(filters.to);
  }
  if (filters.profileId) {
    where.push('time_entries.profile_id = ?');
    params.push(filters.profileId);
  }
  if (filters.tag) {
    where.push('time_entries.tags_json LIKE ?');
    params.push(`%"${filters.tag}"%`);
  }
  const limit = Math.min(Math.max(filters.limit ?? 250, 1), 1000);
  const rows = db
    .prepare(`
      SELECT time_entries.*, profiles.name AS profile_name, profiles.color AS profile_color
      FROM time_entries
      JOIN profiles ON profiles.id = time_entries.profile_id
      WHERE ${where.join(' AND ')}
      ORDER BY time_entries.start_at DESC
      LIMIT ${limit}
    `)
    .all(...params) as Row[];
  return rows.map(mapEntry);
}

export function createEntry(
  input: { profileId: number; startAt: string; endAt: string; note: string; tags?: unknown; allowOverlap?: boolean; source?: 'manual' | 'timer' },
  db = getDatabase()
): TimeEntry {
  const tx = db.transaction(() => {
    assertProfileUsable(db, input.profileId);
    const duration = assertValidEntryInput(input);
    assertNoDuplicate(db, input);
    assertNoOverlap(db, input, Boolean(input.allowOverlap));
    const now = nowIso();
    const result = db
      .prepare(`
        INSERT INTO time_entries (profile_id, start_at, end_at, duration_seconds, note, tags_json, source, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.profileId,
        input.startAt,
        input.endAt,
        duration,
        input.note.trim(),
        jsonResponseValue(normalizeTags(input.tags)),
        input.source ?? 'manual',
        now,
        now
      );
    return getEntry(Number(result.lastInsertRowid), db)!;
  });
  return tx();
}

export function updateEntry(
  id: number,
  input: { profileId: number; startAt: string; endAt: string; note: string; tags?: unknown; allowOverlap?: boolean },
  db = getDatabase()
): TimeEntry {
  const tx = db.transaction(() => {
    const existing = getEntry(id, db);
    if (!existing) throw new AppError('Entry not found.', 404);
    assertProfileUsable(db, input.profileId);
    const duration = assertValidEntryInput(input);
    assertNoDuplicate(db, input, id);
    assertNoOverlap(db, input, Boolean(input.allowOverlap), id);
    const now = nowIso();
    db.prepare(`
      UPDATE time_entries
      SET profile_id = ?, start_at = ?, end_at = ?, duration_seconds = ?, note = ?, tags_json = ?, updated_at = ?
      WHERE id = ? AND deleted_at IS NULL
    `).run(
      input.profileId,
      input.startAt,
      input.endAt,
      duration,
      input.note.trim(),
      jsonResponseValue(normalizeTags(input.tags)),
      now,
      id
    );
    return getEntry(id, db)!;
  });
  return tx();
}

export function deleteEntry(id: number, db = getDatabase()): void {
  const now = nowIso();
  const result = db.prepare('UPDATE time_entries SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
  if (result.changes === 0) throw new AppError('Entry not found.', 404);
}

export function getDashboardStats(db = getDatabase(), now = new Date()): DashboardStats {
  const today = startOfLocalDay(now);
  const week = startOfLocalWeek(now);
  const month = startOfLocalMonth(now);
  const tomorrow = addDays(today, 1);

  const sumBetween = (from: Date, to?: Date) => {
    const row = db
      .prepare(`
        SELECT COALESCE(SUM(duration_seconds), 0) AS seconds
        FROM time_entries
        WHERE deleted_at IS NULL
          AND end_at >= ?
          ${to ? 'AND start_at < ?' : ''}
      `)
      .get(...(to ? [from.toISOString(), to.toISOString()] : [from.toISOString()])) as Row;
    return row.seconds as number;
  };

  const byProfile = db
    .prepare(`
      SELECT profiles.id AS profile_id, profiles.name AS profile_name, profiles.color AS profile_color,
        COALESCE(SUM(time_entries.duration_seconds), 0) AS seconds
      FROM time_entries
      JOIN profiles ON profiles.id = time_entries.profile_id
      WHERE time_entries.deleted_at IS NULL AND time_entries.end_at >= ?
      GROUP BY profiles.id
      ORDER BY seconds DESC
    `)
    .all(week.toISOString()) as Row[];

  const calendar: DashboardStats['calendar'] = [];
  for (let i = 27; i >= 0; i -= 1) {
    const day = addDays(today, -i);
    const next = addDays(day, 1);
    calendar.push({ date: localDateKey(day), seconds: sumBetween(day, next) });
  }

  return {
    todaySeconds: sumBetween(today, tomorrow),
    weekSeconds: sumBetween(week),
    monthSeconds: sumBetween(month),
    byProfile: byProfile.map((row) => ({
      profileId: row.profile_id,
      profileName: row.profile_name,
      profileColor: row.profile_color,
      seconds: row.seconds
    })),
    calendar,
    hasTodayEntry: sumBetween(today, tomorrow) > 0
  };
}

export function getAllTags(db = getDatabase()): string[] {
  const tags = new Set<string>();
  const rows = db.prepare('SELECT tags_json FROM time_entries WHERE deleted_at IS NULL').all() as Row[];
  for (const row of rows) parseTags(row.tags_json).forEach((tag) => tags.add(tag));
  return [...tags].sort((a, b) => a.localeCompare(b));
}
