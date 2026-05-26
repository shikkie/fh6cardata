#!/usr/bin/env python3
"""
Scrape car data from the Forza Horizon 6 Fandom wiki via the MediaWiki API
(no Cloudflare challenge) and write to data/cars.json.

Usage:
    python scripts/scrape_wiki.py            # fetch live + write cars.json
    python scripts/scrape_wiki.py --dry-run  # fetch and print summary only

The wiki page uses {{CarListStatsFH6}} templates. Positional parameters:
  0  page_name     — wiki page title (may include race number prefix)
  1  display_name  — short display name (empty = same as page_name)
  2  year
  3  rarity code   — c|r|e|l|fe|barn|treasure|'' (unreleased)
  4  base_value    — CR value, may be empty
  5  unlock code   — see UNLOCK_MAP
  6  speed
  7  handling
  8  acceleration
  9  launch
  10 braking
  11 offroad
  12 PI
  13 country code  — see COUNTRY_MAP
  14+ named params — band=, barn=<location>, treasure=<location>, cat=, points=, location=
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import requests

API_URL = "https://forza.fandom.com/api.php"
OUTPUT = Path(__file__).parent.parent / "data" / "cars.json"

RARITY_MAP = {
    "c": "Common",
    "r": "Rare",
    "e": "Epic",
    "l": "Legendary",
    "fe": "Forza Edition",
    "barn": "Barn Find",
    "treasure": "Treasure Car",
    "": "Unreleased",
}

# Codes that contain 'a' or start with 'awh'/'auto'/'af' indicate Autoshow
# Full human-readable mapping for the primary availability field
UNLOCK_MAP: dict[str, str] = {
    "awh": "Autoshow",
    "auto": "Autoshow",
    "awhaf": "Autoshow / Aftermarket",
    "awhafj": "Autoshow / Aftermarket / Promo",
    "awhj": "Autoshow / Promo",
    "awhl": "Autoshow / Legacy",
    "awhs": "Autoshow / Series",
    "awhy": "Autoshow / Year-round",
    "af": "Aftermarket",
    "aafj": "Aftermarket / Promo",
    "as": "Autoshow / Series",
    "ay": "Autoshow / Year-round",
    "htf": "Hard-to-Find",
    "w": "Wheelspin",
    "wh": "Wheelspin",
    "whj": "Wheelspin / Promo",
    "whw": "Wheelspin",
    "wp": "Wheelspin / Plus",
    "wtac": "World Time Attack",
    "barn": "Barn Find",
    "treasure": "Treasure Car",
    "pass": "Car Pass",
    "vip": "VIP",
    "preorder": "Pre-order",
    "cm": "Car Mastery",
    "j": "Horizon Promo",
    "aj": "Autoshow / Promo",
    "apromo": "Aftermarket Promo",
    "un": "Unknown",
    "ita": "Unknown",  # seen on some unreleased cars
}

COUNTRY_MAP: dict[str, str] = {
    "ita": "Italy",
    "usa": "USA",
    "uk": "UK",
    "ger": "Germany",
    "jpn": "Japan",
    "fra": "France",
    "swe": "Sweden",
    "kor": "South Korea",
    "aus": "Australia",
    "cze": "Czech Republic",
    "rum": "Romania",
    "pol": "Poland",
    "spa": "Spain",
    "nor": "Norway",
    "can": "Canada",
    "bra": "Brazil",
}


def fetch_wikitext(page: str = "Forza_Horizon_6/Cars") -> str:
    """Fetch raw wikitext via the MediaWiki API — no Cloudflare challenge."""
    resp = requests.get(
        API_URL,
        params={
            "action": "parse",
            "page": page,
            "prop": "wikitext",
            "format": "json",
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        print(f"API error: {data['error']}", file=sys.stderr)
        sys.exit(1)
    return data["parse"]["wikitext"]["*"]


def parse_template(raw: str) -> dict[str, str]:
    """
    Parse a CarListStatsFH6 template body into positional + named params.
    Returns dict with keys: pos_0 … pos_N and any named keys.
    """
    named: dict[str, str] = {}
    positional: list[str] = []

    # Split on | but respect nested {{ }} (not present here, but be safe)
    parts = raw.split("|")
    for part in parts:
        part = part.strip()
        if "=" in part:
            key, _, val = part.partition("=")
            named[key.strip().lower()] = val.strip()
        else:
            positional.append(part)

    result = {f"pos_{i}": v for i, v in enumerate(positional)}
    result.update(named)
    return result


def clean_int(s: str) -> int | None:
    """Strip commas/spaces and convert to int; return None if empty/invalid."""
    cleaned = re.sub(r"[^\d]", "", s or "")
    return int(cleaned) if cleaned else None


def clean_float(s: str) -> float | None:
    s = (s or "").strip()
    try:
        return float(s)
    except ValueError:
        return None


def build_display_name(p: dict[str, str], manufacturer: str) -> str:
    """
    The display name is pos_1 if non-empty, else pos_0 (page name).
    Strip leading race-number prefix (e.g. '#23 Pennzoil NISMO').
    """
    raw = p.get("pos_1") or p.get("pos_0", "")
    # Remove race number prefix: '#N ' or 'N '
    raw = re.sub(r"^#?\d+\s+", "", raw).strip()
    # If name doesn't start with manufacturer, prepend it
    if manufacturer and not raw.startswith(manufacturer):
        return f"{manufacturer} {raw}"
    return raw


def parse_cars(wikitext: str) -> list[dict]:
    cars: list[dict] = []
    current_manufacturer = "Unknown"
    idx = 1

    # Scan line by line to track manufacturer comments and templates
    # Templates may span multiple lines — join them first
    # Flatten multiline templates: replace \n inside {{ }} with space
    flat = re.sub(
        r"\{\{CarListStatsFH6(.*?)\}\}",
        lambda m: "{{CarListStatsFH6" + m.group(1).replace("\n", " ") + "}}",
        wikitext,
        flags=re.DOTALL,
    )

    for line in flat.split("\n"):
        # Track manufacturer from HTML comments
        m = re.match(r"<!--\s*(.+?)\s*-->", line.strip())
        if m:
            current_manufacturer = m.group(1).strip()
            continue

        # Match template
        tm = re.search(r"\{\{CarListStatsFH6\|(.*?)\}\}", line)
        if not tm:
            continue

        p = parse_template(tm.group(1))

        page_name   = p.get("pos_0", "").strip()
        year        = clean_int(p.get("pos_2", ""))
        rarity_code = p.get("pos_3", "").strip()
        value_raw   = p.get("pos_4", "").strip()
        unlock_code = p.get("pos_5", "").strip()
        pi_raw      = p.get("pos_12", "").strip()
        country_code = p.get("pos_13", "").strip()

        # Stats (may be empty for unreleased cars)
        speed  = clean_float(p.get("pos_6", ""))
        handling = clean_float(p.get("pos_7", ""))
        accel  = clean_float(p.get("pos_8", ""))
        launch = clean_float(p.get("pos_9", ""))
        braking = clean_float(p.get("pos_10", ""))
        offroad = clean_float(p.get("pos_11", ""))

        # Named extras
        barn_location     = p.get("barn", "")
        treasure_location = p.get("treasure", "")
        cat               = p.get("cat", "")
        points            = clean_int(p.get("points", ""))

        rarity  = RARITY_MAP.get(rarity_code, rarity_code or "Unreleased")
        availability = UNLOCK_MAP.get(unlock_code, unlock_code or "Unknown")
        country = COUNTRY_MAP.get(country_code, country_code or "")
        base_value = clean_int(value_raw)
        pi = clean_int(pi_raw)

        # Build model name: strip manufacturer prefix from page_name
        model = page_name
        if model.startswith(current_manufacturer + " "):
            model = model[len(current_manufacturer) + 1:]
        # Strip ONLY race-number prefix that starts with '#' (e.g. '#23 Pennzoil NISMO…')
        model = re.sub(r"^#\d+\s+", "", model).strip()
        # Strip " Forza Edition" suffix from model
        model = re.sub(r"\s+Forza Edition$", "", model).strip()
        # Strip trailing " (YYYY)" year disambiguator — year field already has it
        model = re.sub(r"\s+\(\d{4}\)$", "", model).strip()

        # Build full display name (year + manufacturer + model)
        if year:
            full_name = f"{year} {current_manufacturer} {model}"
        else:
            full_name = f"{current_manufacturer} {model}"

        # Remove FE suffix from full_name too — rarity field handles it
        full_name = re.sub(r"\s+Forza Edition$", "", full_name).strip()

        # Derived PI class (FH6 uses R instead of X at the top)
        pi_class: str | None = None
        if pi is not None:
            if pi <= 500:
                pi_class = "D"
            elif pi <= 600:
                pi_class = "C"
            elif pi <= 700:
                pi_class = "B"
            elif pi <= 800:
                pi_class = "A"
            elif pi <= 900:
                pi_class = "S1"
            elif pi <= 997:
                pi_class = "S2"
            else:
                pi_class = "R"

        # Auctionable: barn finds, FE, treasure cars, unreleased are not
        auctionable = rarity_code in ("c", "r", "e", "l", "")

        car: dict = {
            "id": idx,
            "year": year,
            "manufacturer": current_manufacturer,
            "model": model,
            "full_name": full_name,
            "rarity": rarity,
            "pi_class": pi_class,
            "pi": pi,
            "availability": availability,
            "country": country,
            "base_value": base_value,
            "auctionable": auctionable,
            "stats": {
                "speed": speed,
                "handling": handling,
                "acceleration": accel,
                "launch": launch,
                "braking": braking,
                "offroad": offroad,
            },
        }

        if barn_location:
            car["barn_location"] = barn_location
        if treasure_location:
            car["treasure_location"] = treasure_location
        if cat:
            car["unlock_category"] = cat
        if points is not None:
            car["unlock_points"] = points

        cars.append(car)
        idx += 1

    return cars


def main() -> None:
    parser = argparse.ArgumentParser(description="Scrape FH6 car data from Fandom wiki")
    parser.add_argument(
        "--dry-run", action="store_true", help="Print summary only, don't write file"
    )
    parser.add_argument("--output", default=str(OUTPUT), help="Output JSON path")
    args = parser.parse_args()

    print("Fetching wikitext via MediaWiki API…")
    wikitext = fetch_wikitext()
    print(f"Wikitext length: {len(wikitext):,} chars")

    cars = parse_cars(wikitext)
    print(f"Parsed {len(cars)} cars.")

    # Summary by rarity
    from collections import Counter
    rarity_counts = Counter(c["rarity"] for c in cars)
    for rarity, count in sorted(rarity_counts.items(), key=lambda x: -x[1]):
        print(f"  {rarity:18s} {count:3d}")

    if args.dry_run:
        print("\n-- Sample (first 3) --")
        for c in cars[:3]:
            print(json.dumps(c, indent=2))
        print("\n(dry-run: no file written)")
        return

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w") as f:
        json.dump(cars, f, indent=2)

    print(f"\n✅ Written {len(cars)} cars → {out_path}")


if __name__ == "__main__":
    main()
