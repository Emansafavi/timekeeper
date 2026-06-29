import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

const defaultDatabasePath = path.resolve(process.cwd(), 'data', 'timekeeper.sqlite');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  const databasePath = process.env.DATABASE_PATH || defaultDatabasePath;
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  return db;
}

export function setDatabaseForTests(database: Database.Database | null): void {
  db = database;
}

export function migrate(database = getDatabase()): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    database.prepare('SELECT version FROM schema_migrations').all().map((row: any) => row.version as number)
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    const run = database.transaction(() => {
      database.exec(migration.sql);
      database
        .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
        .run(migration.version, new Date().toISOString());
    });
    run();
  }

  seedDefaults(database);
}

export function seedDefaults(database = getDatabase()): void {
  const profileCount = database.prepare('SELECT COUNT(*) AS count FROM profiles').get() as { count: number };
  if (profileCount.count === 0) {
    const insert = database.prepare(`
      INSERT INTO profiles (name, color, category, archived, created_at, updated_at)
      VALUES (@name, @color, @category, 0, @now, @now)
    `);
    const now = new Date().toISOString();
    [
      { name: 'Work', color: '#2563eb', category: null },
      { name: 'Study', color: '#0f766e', category: null },
      { name: 'Personal', color: '#c2410c', category: null }
    ].forEach((profile) => insert.run({ ...profile, now }));
  }

  const setDefault = database.prepare(`
    INSERT INTO settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO NOTHING
  `);
  const now = new Date().toISOString();
  setDefault.run('reminderTime', JSON.stringify('20:00'), now);
  setDefault.run('notificationsEnabled', JSON.stringify(false), now);
  setDefault.run('allowOverlaps', JSON.stringify(false), now);
  setDefault.run('timezone', JSON.stringify(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'), now);
  setDefault.run('firstRunComplete', JSON.stringify(false), now);
}

export function closeDatabase(): void {
  if (!db) return;
  db.close();
  db = null;
}

const migrations = [
  {
    version: 1,
    sql: `
      CREATE TABLE profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#007aff',
        category TEXT,
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE time_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_id INTEGER NOT NULL REFERENCES profiles(id),
        start_at TEXT NOT NULL,
        end_at TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL CHECK(duration_seconds > 0),
        note TEXT NOT NULL,
        tags_json TEXT NOT NULL DEFAULT '[]',
        source TEXT NOT NULL CHECK(source IN ('manual', 'timer')),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        CHECK (end_at > start_at)
      );

      CREATE INDEX idx_time_entries_range ON time_entries(start_at, end_at) WHERE deleted_at IS NULL;
      CREATE INDEX idx_time_entries_profile ON time_entries(profile_id) WHERE deleted_at IS NULL;

      CREATE TABLE active_timer (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        profile_id INTEGER NOT NULL REFERENCES profiles(id),
        status TEXT NOT NULL CHECK(status IN ('running', 'paused')),
        started_at TEXT NOT NULL,
        paused_at TEXT,
        accumulated_seconds INTEGER NOT NULL DEFAULT 0 CHECK(accumulated_seconds >= 0),
        tags_json TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value_json TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `
  }
];
