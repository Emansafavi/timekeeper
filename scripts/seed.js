import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '..', 'data', 'timekeeper.sqlite');
const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

const profile = db.prepare("SELECT id FROM profiles WHERE name = 'Work'").get();
if (!profile) {
  console.error('Run the app once before seeding so migrations create the schema.');
  process.exit(1);
}

const insert = db.prepare(`
  INSERT INTO time_entries (profile_id, start_at, end_at, duration_seconds, note, tags_json, source, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, 'manual', ?, ?)
`);

const now = new Date().toISOString();
const demo = [
  [profile.id, '2026-06-24T08:30:00.000Z', '2026-06-24T10:00:00.000Z', 5400, 'Planned the week', JSON.stringify(['planning'])],
  [profile.id, '2026-06-25T12:00:00.000Z', '2026-06-25T14:15:00.000Z', 8100, 'Focused project work', JSON.stringify(['focus'])],
  [2, '2026-06-26T15:00:00.000Z', '2026-06-26T17:30:00.000Z', 9000, 'Learning session', JSON.stringify(['learning'])]
];

const tx = db.transaction(() => {
  for (const row of demo) insert.run(...row, now, now);
});

tx();
db.close();
console.log(`Seeded demo entries in ${dbPath}`);
