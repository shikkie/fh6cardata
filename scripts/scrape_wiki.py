#!/usr/bin/env python3
"""
Scrape car data from https://forza.fandom.com/wiki/Forza_Horizon_6/Cars
and write to data/cars.json.

Usage:
    pip install requests beautifulsoup4 lxml
    python scripts/scrape_wiki.py
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup

WIKI_URL = "https://forza.fandom.com/wiki/Forza_Horizon_6/Cars"
OUTPUT = Path(__file__).parent.parent / "data" / "cars.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

CLASS_ORDER = ["D", "C", "B", "A", "S1", "S2", "X"]


def fetch_page(url: str) -> str:
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.text


def parse_cars(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table", {"class": re.compile(r"wikitable")})
    if not table:
        print("ERROR: Could not find wikitable — page structure may have changed.", file=sys.stderr)
        sys.exit(1)

    headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
    print(f"Detected columns: {headers}")

    cars: list[dict] = []
    for idx, row in enumerate(table.find_all("tr")[1:], start=1):
        cells = row.find_all(["td", "th"])
        if not cells:
            continue
        raw = [c.get_text(strip=True) for c in cells]
        if len(raw) < 4:
            continue

        # Best-effort column mapping — adapt indices to actual wiki columns
        # Capture raw in closure explicitly
        raw_row = raw

        def col(name: str, fallback: str = "", _r: list = raw_row) -> str:
            try:
                i = next(i for i, h in enumerate(headers) if name in h)
                return _r[i] if i < len(_r) else fallback
            except StopIteration:
                return fallback

        full_name = col("car") or raw[0]
        year_match = re.match(r"(\d{4})", full_name)
        year = int(year_match.group(1)) if year_match else None

        manufacturer = col("manufacturer") or col("make") or ""
        model = col("model") or ""
        if not manufacturer and full_name:
            parts = full_name.split()
            manufacturer = parts[1] if len(parts) > 1 else ""
            model = " ".join(parts[2:]) if len(parts) > 2 else ""

        raw_value = col("value") or col("price") or col("base") or "0"
        base_value = int(re.sub(r"[^\d]", "", raw_value) or "0")

        cars.append({
            "id": idx,
            "year": year,
            "manufacturer": manufacturer,
            "model": model,
            "full_name": full_name,
            "class": col("class"),
            "pi": int(re.sub(r"[^\d]", "", col("pi") or "0") or "0"),
            "type": col("type") or col("division") or col("category") or "",
            "rarity": col("rarity") or "Common",
            "base_value": base_value,
            "drivetrain": col("drivetrain") or col("drive") or "",
            "engine": col("engine") or "",
            "doors": int(re.sub(r"[^\d]", "", col("doors") or "0") or "0"),
        })

    return cars


def main() -> None:
    print(f"Fetching {WIKI_URL} …")
    html = fetch_page(WIKI_URL)
    time.sleep(1)

    cars = parse_cars(html)
    print(f"Parsed {len(cars)} cars.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w") as f:
        json.dump(cars, f, indent=2)

    print(f"Written to {OUTPUT}")


if __name__ == "__main__":
    main()
