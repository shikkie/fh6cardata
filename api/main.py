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

    q = request.args.get("q", "").strip().lower()
    manufacturer = request.args.get("manufacturer", "").strip().lower()
    car_class = request.args.get("class", "").strip().upper()
    car_type = request.args.get("type", "").strip().lower()
    rarity = request.args.get("rarity", "").strip().lower()

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
    if car_class:
        results = [c for c in results if c["class"].upper() == car_class]
    if car_type:
        results = [c for c in results if car_type in c["type"].lower()]
    if rarity:
        results = [c for c in results if c["rarity"].lower() == rarity]

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
    class_order = ["D", "C", "B", "A", "S1", "S2", "X"]
    return jsonify({
        "manufacturers": sorted({c["manufacturer"] for c in cars}),
        "classes": sorted(
            {c["class"] for c in cars},
            key=lambda x: class_order.index(x) if x in class_order else 99,
        ),
        "types": sorted({c["type"] for c in cars}),
        "rarities": sorted({c["rarity"] for c in cars}),
    })


if __name__ == "__main__":
    port = int(os.environ.get("FH6_API_PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)  # noqa: S104
