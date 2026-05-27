# FH6 Car Data — Auction House Companion

A mobile-responsive web app to quickly look up **Forza Horizon 6** car base values and stats while sitting in the auction house — no need to quit the auction to check a car's price.

## Features

- 🔍 **Search** by make, model, or keyword
- 🏷️ **Filter** by class (D/C/B/A/S1/S2/X), type, rarity, and manufacturer
- 💰 **Base value** displayed prominently — see if a bid or buyout is a deal
- 🚫 Barn Finds and Forza Edition cars flagged as non-auctionable
- 📱 Mobile-first, dark UI optimised for use alongside the game

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite 5, Bootstrap 5 |
| API | Python 3.11 + Flask 3 |
| Data | JSON (scraped from Forza Fandom wiki) |

## Quick Start

### API
```bash
pip install -r requirements.txt
python -m api.main
# API runs on http://localhost:5000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Dev server on http://localhost:5173 (proxies /api → :5000)
```

## Data

Seed data is in `data/cars.json`. To refresh from the wiki:
```bash
pip install -r requirements-dev.txt
python scripts/scrape_wiki.py
```

> The wiki may be behind Cloudflare; run the scraper from a browser environment or a residential IP if needed.

## Development

```bash
# Python tests
pip install -r requirements-dev.txt
pytest

# Python lint
ruff check .
ruff format .

# Frontend lint
cd frontend && npm run lint
```

## Deployment

### Making updates visible to installed iOS PWA users

iOS home-screen installs can cache the app shell for a long time.  This project uses four complementary mechanisms to ensure users always receive updates:

1. **Service worker update polling** — the SW registration calls `registration.update()` every 5 minutes, forcing iOS Safari to check whether the SW file has changed.
2. **In-app update banner** — when a new SW is waiting, a sticky banner appears with a "Refresh Now" button that reloads the app with the new code.
3. **Version polling** — a `/version.json` file (generated at build time) is polled every 5 minutes via `useAppVersion`.  Because the SW serves it `NetworkOnly`, it is never cached and always reflects the latest build.
4. **NetworkFirst for HTML navigation** — the app shell is re-fetched from the network on every navigation (with a 3 s timeout), so new JS/CSS bundles load immediately when online.

### Deploying a new version

```bash
# 1. Build the frontend (generates a new version.json automatically)
cd frontend && npm run build

# 2. Export the build version so Flask /api/version reflects it
export FH6_BUILD_VERSION="$(date +%Y%m%d%H%M)"
export FH6_BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 3. Restart Flask
systemctl restart fh6-api   # or however you manage it
```

Users will see the "App update available" banner within 5 minutes of the next time they open the app.  Tapping **Refresh Now** applies the update instantly.

## Roadmap

See [GitHub Issues](https://github.com/shikkie/fh6cardata/issues) for planned work items, including:
- Tuning parts data and stat ranges
- Car detail/compare view
- Offline PWA mode
- Auto-refresh from wiki

## License

MIT
