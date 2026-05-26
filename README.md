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

## Roadmap

See [GitHub Issues](https://github.com/shikkie/fh6cardata/issues) for planned work items, including:
- Tuning parts data and stat ranges
- Car detail/compare view
- Offline PWA mode
- Auto-refresh from wiki

## License

MIT
