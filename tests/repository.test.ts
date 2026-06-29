import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { toCsv, toXlsx } from '../src/lib/server/export';
import { migrate } from '../src/lib/server/db';
import {
  createEntry,
  entryFiltersFromSearchParams,
  getActiveTimer,
  getDashboardStats,
  listEntries,
  startTimer,
  stopTimer,
  updateSettings
} from '../src/lib/server/repository';

let databases: Database.Database[] = [];

function memoryDb() {
  const db = new Database(':memory:');
  databases.push(db);
  migrate(db);
  return db;
}

afterEach(() => {
  for (const db of databases) db.close();
  databases = [];
});

describe('entries', () => {
  it('rejects overlapping entries unless explicitly allowed', () => {
    const db = memoryDb();
    createEntry(
      {
        profileId: 1,
        startAt: '2026-06-29T08:00:00.000Z',
        endAt: '2026-06-29T09:00:00.000Z',
        note: 'Focused work'
      },
      db
    );

    expect(() =>
      createEntry(
        {
          profileId: 1,
          startAt: '2026-06-29T08:30:00.000Z',
          endAt: '2026-06-29T09:30:00.000Z',
          note: 'Overlap'
        },
        db
      )
    ).toThrow(/overlaps/);
  });

  it('exports transparent CSV and XLSX data', () => {
    const db = memoryDb();
    createEntry(
      {
        profileId: 1,
        startAt: '2026-06-29T08:00:00.000Z',
        endAt: '2026-06-29T09:30:00.000Z',
        note: 'Prepared seminar',
        tags: 'teaching, prep'
      },
      db
    );
    const entries = listEntries({}, db);
    const csv = toCsv(entries);
    const xlsx = toXlsx(entries);

    expect(csv).toContain('date,start_time,end_time,duration_hours,duration_seconds,profile,tags,note');
    expect(csv).toContain('Prepared seminar');
    expect(Buffer.isBuffer(xlsx)).toBe(true);
    expect(xlsx.length).toBeGreaterThan(1000);
  });

  it('uses the configured timezone for dashboard day totals', () => {
    const db = memoryDb();
    createEntry(
      {
        profileId: 1,
        startAt: '2026-06-29T22:30:00.000Z',
        endAt: '2026-06-29T23:30:00.000Z',
        note: 'Late local work'
      },
      db
    );

    const berlinStats = getDashboardStats(db, new Date('2026-06-30T12:00:00.000Z'), 'Europe/Berlin');
    const utcStats = getDashboardStats(db, new Date('2026-06-30T12:00:00.000Z'), 'UTC');

    expect(berlinStats.todaySeconds).toBe(3600);
    expect(utcStats.todaySeconds).toBe(0);
  });

  it('expands report date filters in the configured timezone', () => {
    const db = memoryDb();
    createEntry(
      {
        profileId: 1,
        startAt: '2026-06-29T22:30:00.000Z',
        endAt: '2026-06-29T23:30:00.000Z',
        note: 'Late local work'
      },
      db
    );
    const params = new URLSearchParams({ fromDate: '2026-06-30', toDate: '2026-06-30' });

    updateSettings({ timezone: 'Europe/Berlin' }, db);
    expect(listEntries(entryFiltersFromSearchParams(params, 250, db), db)).toHaveLength(1);

    updateSettings({ timezone: 'UTC' }, db);
    expect(listEntries(entryFiltersFromSearchParams(params, 250, db), db)).toHaveLength(0);
  });
});

describe('timer persistence', () => {
  it('loads an active timer after reopening the SQLite database', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'timekeeper-'));
    const file = path.join(dir, 'test.sqlite');
    const first = new Database(file);
    migrate(first);
    startTimer({ profileId: 1, tags: 'research' }, first);
    first.close();

    const second = new Database(file);
    databases.push(second);
    migrate(second);
    const timer = getActiveTimer(second);

    expect(timer?.profileName).toBe('Work');
    expect(timer?.tags).toEqual(['research']);
  });

  it('applies overlap protection when saving a timer', () => {
    const db = memoryDb();
    createEntry(
      {
        profileId: 1,
        startAt: '2026-06-29T08:00:00.000Z',
        endAt: '2026-06-29T09:00:00.000Z',
        note: 'Existing work'
      },
      db
    );
    db.prepare(`
      INSERT INTO active_timer (id, profile_id, status, started_at, paused_at, accumulated_seconds, tags_json, created_at, updated_at)
      VALUES (1, 1, 'paused', '2026-06-29T08:15:00.000Z', '2026-06-29T08:45:00.000Z', 1800, '[]', '2026-06-29T08:15:00.000Z', '2026-06-29T08:45:00.000Z')
    `).run();

    expect(() => stopTimer({ note: 'Overlapping timer' }, db)).toThrow(/overlaps/);
    expect(stopTimer({ note: 'Intentional overlap', allowOverlap: true }, db).durationSeconds).toBeGreaterThan(0);
  });
});
