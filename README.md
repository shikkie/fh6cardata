# FH6 Car Data — Auction House Companion

A mobile-responsive PWA to quickly look up **Forza Horizon 6** car base values, stats, and telemetry ordinals — usable alongside the game without quitting the auction house.

## Features

- 🔍 **Search** by make, model, keyword, or ordinal ID
- 🏷️ **Filter** by class, rarity, manufacturer, availability, ordinal status, garage, wishlist
- 💰 **Base value + estimated auction range** displayed prominently
- 📡 **Telemetry ordinal mapping** — assign Data Out ordinal IDs to cars via quick-assign or manual edit
  - Companion telemetry bridge: [forza-telemetry-fh6](https://github.com/shikkie/forza-telemetry-fh6)
- 🚗 **Garage** tracking (localStorage + server-side JSON)
- ⭐ **Wishlist** tracking
- 📱 Mobile-first dark UI, installable as PWA

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 + Vite 5, Bootstrap 5 |
| API | Python 3.11 + Flask 3 |
| Data | `data/cars.json` (scraped from Forza Fandom wiki, ordinals added manually) |

## Quick Start

```bash
# Start both API (port 5002) and frontend (port 3002)
./run-dev.sh

# Other commands
./run-dev.sh restart    # restart running processes
./run-dev.sh stop       # stop all
./run-dev.sh status     # show PID / port info
```

Or start individually:

```bash
# API only
pip install -r requirements.txt
python -m api.main          # http://localhost:5002

# Frontend only
cd frontend && npm install && npm run dev   # http://localhost:3002
```

## Data

### Refreshing from the Fandom wiki

The scraper fetches the car list via the MediaWiki API and **merges** it into the existing `data/cars.json` — it only appends genuinely new cars and never overwrites existing data (preserving ordinal mappings, image URLs, etc.).

```bash
# Preview what's new without writing anything
python scripts/scrape_wiki.py --dry-run

# Merge new cars into data/cars.json
python scripts/scrape_wiki.py

# Full overwrite (destructive — loses ordinals/image_urls — use with care)
python scripts/scrape_wiki.py --overwrite
```

Dependencies for the scraper: `pip install requests` (already in `requirements.txt`).

### Pushing ordinal updates

After assigning telemetry ordinals to cars in the UI, use the helper script to commit and push just `data/cars.json`:

```bash
./push-cars.sh                          # auto commit message with timestamp
./push-cars.sh "map ordinals 141, 2007" # custom message
```

## Development

```bash
# Run all checks (lint + tests + frontend build)
./run-tests.sh              # everything
./run-tests.sh python       # Python only
./run-tests.sh frontend     # frontend only

# Python lint
ruff check . && ruff format --check .

# Python tests
python3 -m pytest tests/ -q

# Frontend lint + build
cd frontend && npm run lint && npm run build
```

## Deployment

### Making updates visible to installed iOS PWA users

iOS home-screen installs can cache the app shell for a long time.  This project uses four complementary mechanisms to ensure users always receive updates:

1. **Service worker update polling** — the SW registration calls `registration.update()` every 5 minutes.
2. **In-app update banner** — when a new SW is waiting, a sticky banner appears with a "Refresh Now" button.
3. **Version polling** — `/version.json` (generated at build time) is polled every 5 minutes via `useAppVersion` and served `NetworkOnly` so it is never cached.
4. **NetworkFirst for HTML navigation** — the app shell is re-fetched from the network on every navigation (3 s timeout).

### Deploying a new version

```bash
# 1. Build the frontend
cd frontend && npm run build

# 2. Export build version so Flask /api/version reflects it
export FH6_BUILD_VERSION="$(date +%Y%m%d%H%M)"
export FH6_BUILD_TIME="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# 3. Restart Flask
./run-dev.sh restart
```

Users will see the "App update available" banner within 5 minutes and can tap **Refresh Now** to apply it instantly.

## License

MIT

