# Timekeeper

Timekeeper is a local-first, self-hosted time tracking app. It runs on your own computer or server, stores your data in a local SQLite database, and gives you a mobile-friendly web app for logging work from a browser or installed PWA.

It is designed for personal use, small private teams, and home-lab setups where the data should stay on hardware you control.

## What It Does

- Start, pause, resume, discard, and stop timers.
- Add manual time entries when the timer was not running.
- Require a short note for saved work.
- Track work by profile/project.
- Add tags to timers and manual entries.
- Edit entries and soft-delete entries.
- Archive profiles without deleting their historical data.
- Block overlapping entries by default, with an option to allow them.
- Show dashboard totals for today, this week, and this month.
- Show a weekly profile summary, 28-day activity view, and recent journal.
- Filter reports by date range, profile, and tag.
- Export reports as CSV or XLSX.
- Install to a phone home screen as a PWA.

## How Data Is Stored

Timekeeper stores app data in a local SQLite database:

```text
data/timekeeper.sqlite
```

When SQLite uses WAL mode, you may also see:

```text
data/timekeeper.sqlite-wal
data/timekeeper.sqlite-shm
```

Keep these files together when backing up a running app. The `data/` folder is ignored by Git so your entries, tags, categories, profiles, settings, and backups are not pushed to GitHub.

## Install On A Server With Docker

This is the recommended setup for a Raspberry Pi, Linux server, home server, or NAS that supports Docker.

Requirements:

- Git
- Docker
- Docker Compose

Install:

```bash
git clone YOUR_REPOSITORY_URL timekeeper
cd timekeeper
docker compose up -d --build
```

Open:

```text
http://SERVER_IP:3000
```

Useful commands:

```bash
docker compose ps
docker compose logs -f timekeeper
docker compose restart
docker compose down
```

Optional configuration:

```bash
cp .env.example .env
```

Then edit `.env` if you want to change the port, host, database path, or app name.

## Raspberry Pi 5

On a Raspberry Pi 5, install Docker and Docker Compose, then use the same Docker setup:

```bash
git clone YOUR_REPOSITORY_URL timekeeper
cd timekeeper
docker compose up -d --build
```

The app stores its database on the Pi in:

```text
./data/timekeeper.sqlite
```

If you use [Tailscale](https://tailscale.com/), you can keep Timekeeper private while still reaching it from your phone, laptop, or tablet. This fits the local-first goal: the app and database stay on your own device, while Tailscale provides private network access between your devices.

## Install On macOS

Requirements:

- Node.js 22 or newer
- Git

Run:

```bash
git clone YOUR_REPOSITORY_URL timekeeper
cd timekeeper
npm ci
npm run doctor
npm run dev
```

Open:

```text
http://localhost:5173
```

If `better-sqlite3` fails to load because of an architecture mismatch, rebuild dependencies with the same Node architecture you use to run the app:

```bash
node -p "process.arch"
rm -rf node_modules
npm ci
```

On Apple Silicon with native arm64 Node:

```bash
arch -arm64 npm ci
```

## Install On Linux

For production use, prefer Docker.

For local development:

```bash
git clone YOUR_REPOSITORY_URL timekeeper
cd timekeeper
npm ci
npm run doctor
npm run dev
```

Open:

```text
http://localhost:5173
```

## Install On Windows

Recommended options:

- Use Docker Desktop and the Docker setup above.
- Or use WSL2 with Ubuntu, then follow the Linux instructions.

With WSL2:

```bash
git clone YOUR_REPOSITORY_URL timekeeper
cd timekeeper
npm ci
npm run doctor
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

## Install On A Phone

Timekeeper is a Progressive Web App.

On iPhone:

1. Open Timekeeper in Safari.
2. Tap Share.
3. Tap Add to Home Screen.

On Android:

1. Open Timekeeper in Chrome.
2. Tap the menu.
3. Tap Install app or Add to Home screen.

## Backups

Cold backup:

```bash
docker compose stop
mkdir -p backups
cp data/timekeeper.sqlite backups/timekeeper-$(date +%F).sqlite
docker compose up -d
```

Hot backup while the app is running:

```bash
mkdir -p backups
cp data/timekeeper.sqlite* backups/
```

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

Database migrations run automatically when the server starts.

## Development Checks

```bash
npm run doctor
npm run check
npm test
npm run build
```

## Security Note

Timekeeper currently assumes a trusted private network. Do not expose it directly to the public internet without adding authentication and HTTPS.

Recommended private setup:

- Run it on your own server or Raspberry Pi.
- Keep the service behind your LAN or [Tailscale](https://tailscale.com/).
- Back up the `data/` folder.
- Do not commit SQLite database files.

## License

MIT. See `LICENSE`.
