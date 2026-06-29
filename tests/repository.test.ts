import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { toCsv, toXlsx } from '../src/lib/server/export';
import { migrate } from '../src/lib/server/db';
import { createEntry, getActiveTimer, listEntries, startTimer } from '../src/lib/server/repository';

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
});
