# Timekeeper

A self-hosted, iPhone-friendly Progressive Web App for tracking work time across local profiles.

Timekeeper is designed for a Raspberry Pi on a private Tailscale network. It uses a single SQLite database file, a small Node/SvelteKit server, Docker Compose, and no public cloud services.

## Stack Choice

Recommended and implemented stack:

- **SvelteKit + adapter-node**: one compact full-stack app with server endpoints, responsive UI, and a production Node build. SvelteKit's Node adapter creates a standalone server that runs with `node build`.
- **SQLite + better-sqlite3**: low-maintenance local database, WAL mode, transactions, simple file backups, and good Raspberry Pi performance.
- **Docker Compose**: repeatable Pi deployment with a bind-mounted `data/` folder.
- **Plain Svelte/CSS UI**: no heavy component framework; fast, touch-friendly, dark/light mode, bottom navigation on mobile.
- **Service worker + manifest**: installable Safari PWA with cached app shell. API writes still require network access to the Pi.
- **CSV + minimal XLSX writer**: Excel/Google Sheets compatible exports without a large spreadsheet parser dependency.

Tradeoffs:

- SvelteKit is lighter than a separate Next.js + Fastify split and easier to deploy as one service.
- SQLite is the simplest reliable persistence choice for one trusted user or a small private network. PostgreSQL would add maintenance without much benefit here.
- Local browser notifications are implemented while the PWA/tab is alive. Reliable background push on iOS/Android normally uses Web Push infrastructure and platform push services, which does not fit a purely local-only Tailscale app.
- Multi-user auth is intentionally not included. Put the app behind Tailscale and add auth later only if you expose it beyond trusted devices.

Useful upstream docs:

- SvelteKit Node adapter: https://svelte.dev/docs/kit/adapter-node
- SvelteKit service workers: https://svelte.dev/docs/kit/service-workers
- better-sqlite3: https://github.com/WiseLibs/better-sqlite3

## Features

- Start, pause, resume, discard, and stop timers.
- Required stop note: “What did you do?”
- Persistent active timer state across refreshes and server restarts.
- Manual entries with date/time range, duration validation, profile, tags, and note.
- Edit and delete entries.
- Duplicate and overlap protection, with configurable overlap allowance.
- Profiles with color, category, and archive/unarchive.
- Dashboard totals for today, this week, and this month.
- Weekly profile summaries, 28-day calendar overview, and daily journal.
- Filters by date range, profile, and tag.
- CSV and XLSX exports.
- Browser/PWA reminders plus an in-app reminder banner.
- SQLite migrations and neutral starter profiles.
- Tests for time math, overlaps, exports, and timer persistence.

## Local Development

```bash
cd time-traker
npm install
npm run dev
```

Open http://localhost:5173.

Run verification:

```bash
npm run check
npm test
npm run build
```

## Raspberry Pi Deployment

Install Docker and Compose on the Pi, then copy or clone this folder.

```bash
cd time-tracker
cp .env.example .env
docker compose up -d --build
```

Open:

```text
http://RASPBERRY_PI_TAILSCALE_NAME:3000
```

or:

```text
http://RASPBERRY_PI_TAILSCALE_IP:3000
```

In Safari on iPhone, open the Tailscale URL, tap Share, then “Add to Home Screen”.

## Tailscale Notes

This app is intended to stay private:

1. Install and authenticate Tailscale on the Raspberry Pi.
2. Install and authenticate Tailscale on your iPhone, tablet, and laptop.
3. Keep `docker-compose.yml` bound to port `3000`.
4. Access the app via the Pi’s MagicDNS name or Tailscale IP.

No public reverse proxy is required.

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port inside the container |
| `HOST` | `0.0.0.0` | Listen address |
| `DATABASE_PATH` | `/app/data/timekeeper.sqlite` | SQLite file path |
| `PUBLIC_APP_NAME` | `Timekeeper` | Public app name |

## Data and Backups

Docker Compose stores the database in:

```text
./data/timekeeper.sqlite
```

Cold backup:

```bash
docker compose stop
mkdir -p backups
cp data/timekeeper.sqlite backups/timekeeper-$(date +%F).sqlite
docker compose up -d
```

Hot backup while running:

```bash
mkdir -p backups
cp data/timekeeper.sqlite* backups/
```

When the app is running in WAL mode, copy `timekeeper.sqlite`, `timekeeper.sqlite-wal`, and `timekeeper.sqlite-shm` together.

Restore:

```bash
docker compose stop
cp backups/timekeeper-YYYY-MM-DD.sqlite data/timekeeper.sqlite
docker compose up -d
```

## Updates

```bash
git pull
docker compose up -d --build
```

Migrations run automatically when the server starts.

## Seed Demo Data

Start the app once so migrations create the schema, then:

```bash
npm run seed
```

For Docker:

```bash
docker compose exec timekeeper node scripts/seed.js
```

## Database Schema

Core tables:

- `schema_migrations`: applied migration versions.
- `profiles`: profile/project names, color, category, archived state.
- `time_entries`: immutable-ish work logs with soft delete, timestamps, duration, tags, profile, note, and source.
- `active_timer`: one active timer row with status, original creation time, active segment start, accumulated active seconds, and tags.
- `settings`: JSON values for reminders, overlap behavior, timezone, and onboarding state.

All writes that affect timers and entries use SQLite transactions.

## Git Data Boundary

The repository is meant to hold the barebones app, not user input. Local SQLite files under `data/`, exported backups, tags, categories, profiles, timers, and time entries are ignored by Git. The committed `data/.gitkeep` file only preserves the folder for first run.

## Notifications

Settings lets you choose a daily reminder time and request browser notification permission. The reminder is scheduled in the browser while the PWA/tab is active. If the device or browser suspends the app, notification delivery is not guaranteed.

The dashboard always shows an in-app reminder banner when today has no entry and no timer is running.

## Security

Timekeeper assumes a trusted private network. Recommended baseline:

- Keep it behind Tailscale.
- Do not expose port `3000` publicly.
- Keep the Pi updated.
- Back up `data/timekeeper.sqlite`.

Future auth options: local password, Tailscale identity headers behind a reverse proxy, or OAuth if exposed beyond Tailscale.

## Future Mobile Path

For App Store or Play Store release, the simplest path is a Capacitor wrapper around the SvelteKit frontend plus a sync/auth backend. You would need:

- Native notification scheduling.
- Local encrypted storage.
- User accounts and sync conflict handling.
- App store icons/screenshots/privacy disclosures.
- A hosted backend or explicit LAN-only mobile mode.

React Native would only be worth it if the UI needed deep native integrations that a PWA/Capacitor shell cannot provide.

## Maintenance Notes

`npm audit --omit=dev` currently reports a low-severity advisory through SvelteKit's `cookie` dependency. The suggested forced fix downgrades SvelteKit to an unusable pre-release, so this should be resolved by normal framework updates rather than `npm audit fix --force`.

## Contributing

This project is GitHub-ready:

1. Keep changes small and covered by focused tests.
2. Run `npm run check`, `npm test`, and `npm run build`.
3. Avoid adding dependencies unless they reduce real maintenance or reliability risk.

Suggested license: MIT, included in `LICENSE`.
