"""FH6 Car Data — Flask API."""
from __future__ import annotations

import json
import os
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

DATA_PATH = Path(__file__).parent.parent / "data" / "cars.json"

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

_cars: list[dict] | None = None

CLASS_ORDER = ["D", "C", "B", "A", "S1", "S2", "R"]


def load_cars() -> list[dict]:
    global _cars
    if _cars is None:
        with DATA_PATH.open() as f:
            _cars = json.load(f)
    return _cars


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


if __name__ == "__main__":
    port = int(os.environ.get("FH6_API_PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)  # noqa: S104
