"""FH6 Car Data — Flask API."""
from __future__ import annotations

import json
import os
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

DATA_PATH  = Path(__file__).parent.parent / "data" / "cars.json"
PARTS_PATH = Path(__file__).parent.parent / "data" / "parts.json"

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

_cars:  list[dict] | None = None
_parts: list[dict] | None = None

CLASS_ORDER = ["D", "C", "B", "A", "S1", "S2", "R"]

# Auction bid range multipliers per rarity (min_bid, fair_buyout, max_buyout)
# Based on FH6 auction house observed pricing patterns
AUCTION_TIERS: dict[str, dict] = {
    "Common":    {"min": 0.50, "fair": 1.00, "max": 1.50},
    "Rare":      {"min": 0.60, "fair": 1.20, "max": 1.80},
    "Epic":      {"min": 0.70, "fair": 1.40, "max": 2.00},
    "Legendary": {"min": 0.80, "fair": 1.60, "max": 2.50},
}

CR_ROUND = 1_000  # round to nearest 1000 CR


def _round_cr(val: float) -> int:
    return round(val / CR_ROUND) * CR_ROUND


def load_cars() -> list[dict]:
    global _cars
    if _cars is None:
        with DATA_PATH.open() as f:
            _cars = json.load(f)
    return _cars


def load_parts() -> list[dict]:
    global _parts
    if _parts is None:
        with PARTS_PATH.open() as f:
            _parts = json.load(f)
    return _parts


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "cars": len(load_cars())})


@app.get("/api/cars")
def list_cars():
    cars = load_cars()

    q            = request.args.get("q", "").strip().lower()
    manufacturer = request.args.get("manufacturer", "").strip().lower()
    pi_class     = request.args.get("class", "").strip().upper()
    rarity       = request.args.get("rarity", "").strip().lower()
    availability = request.args.get("availability", "").strip().lower()
    auctionable  = request.args.get("auctionable", "").strip().lower()

    results = cars

    if q:
        results = [
            c for c in results
            if q in c["full_name"].lower()
            or q in c["manufacturer"].lower()
            or q in c["model"].lower()
        ]
    if manufacturer:
        results = [c for c in results if c["manufacturer"].lower() == manufacturer]
    if pi_class:
        results = [c for c in results if (c.get("pi_class") or "").upper() == pi_class]
    if rarity:
        results = [c for c in results if c["rarity"].lower() == rarity]
    if availability:
        results = [c for c in results if availability in c.get("availability", "").lower()]
    if auctionable in ("true", "1", "yes"):
        results = [c for c in results if c.get("auctionable")]
    elif auctionable in ("false", "0", "no"):
        results = [c for c in results if not c.get("auctionable")]

    return jsonify(results)


@app.get("/api/cars/<int:car_id>")
def get_car(car_id: int):
    cars = load_cars()
    car = next((c for c in cars if c["id"] == car_id), None)
    if car is None:
        return jsonify({"error": "Car not found"}), 404
    return jsonify(car)


@app.get("/api/cars/<int:car_id>/auction")
def car_auction(car_id: int):
    """Return estimated auction bid/buyout range for a car."""
    cars = load_cars()
    car = next((c for c in cars if c["id"] == car_id), None)
    if car is None:
        return jsonify({"error": "Car not found"}), 404
    if not car.get("auctionable"):
        return jsonify({"error": "Car is not auctionable", "auctionable": False}), 200
    base = car.get("base_value")
    if not base:
        return jsonify({"error": "No base value available", "auctionable": True}), 200
    tier = AUCTION_TIERS.get(car["rarity"], AUCTION_TIERS["Rare"])
    return jsonify({
        "car_id": car_id,
        "rarity": car["rarity"],
        "base_value": base,
        "min_bid":      _round_cr(base * tier["min"]),
        "fair_buyout":  _round_cr(base * tier["fair"]),
        "max_buyout":   _round_cr(base * tier["max"]),
        "auctionable":  True,
    })


@app.get("/api/filters")
def list_filters():
    """Return distinct values for all filterable fields."""
    cars = load_cars()
    return jsonify({
        "manufacturers": sorted({c["manufacturer"] for c in cars}),
        "classes": [
            c for c in CLASS_ORDER
            if any(car.get("pi_class") == c for car in cars)
        ],
        "rarities": sorted({c["rarity"] for c in cars}),
        "availabilities": sorted({c.get("availability", "") for c in cars} - {""}),
    })


@app.get("/api/parts")
def list_parts():
    """Return tuning parts, optionally filtered by class and/or category."""
    parts = load_parts()
    pi_class = request.args.get("class", "").strip().upper()
    category = request.args.get("category", "").strip()
    results = parts
    if pi_class:
        results = [p for p in results if pi_class in p.get("applies_to_classes", [])]
    if category:
        results = [p for p in results if p["category"].lower() == category.lower()]
    return jsonify(results)


@app.get("/api/parts/categories")
def list_part_categories():
    parts = load_parts()
    cats: dict[str, list[str]] = {}
    for p in parts:
        cat = p["category"]
        sub = p["subcategory"]
        cats.setdefault(cat, [])
        if sub not in cats[cat]:
            cats[cat].append(sub)
    return jsonify(cats)


@app.get("/api/parts/<string:part_id>")
def get_part(part_id: str):
    parts = load_parts()
    part = next((p for p in parts if p["id"] == part_id), None)
    if part is None:
        return jsonify({"error": "Part not found"}), 404
    return jsonify(part)


if __name__ == "__main__":
    port = int(os.environ.get("FH6_API_PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)  # noqa: S104
