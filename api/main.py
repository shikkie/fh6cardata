"""FH6 Car Data — Flask API."""

from __future__ import annotations

import contextlib
import hashlib
import json
import os
import tempfile
import threading
from datetime import UTC, datetime
from pathlib import Path

from flask import Flask, jsonify, make_response, request
from flask_cors import CORS

DATA_PATH = Path(__file__).parent.parent / "data" / "cars.json"
PARTS_PATH = Path(__file__).parent.parent / "data" / "parts.json"
GARAGE_PATH = Path(__file__).parent.parent / "data" / "garage.json"
WISHLIST_PATH = Path(__file__).parent.parent / "data" / "wishlist.json"
LAST_ORDINAL_PATH = Path(__file__).parent.parent / "data" / "last_ordinal.json"

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

_cars: list[dict] | None = None
_parts: list[dict] | None = None
_garage: list[dict] | None = None
_wishlist: list[dict] | None = None
_data_lock = threading.Lock()
_garage_lock = threading.Lock()
_wishlist_lock = threading.Lock()


def _load_last_ordinal() -> int | None:
    """Read the persisted last-queried ordinal from disk (survives server restarts)."""
    with contextlib.suppress(Exception):
        if LAST_ORDINAL_PATH.exists():
            return json.load(LAST_ORDINAL_PATH.open()).get("ordinal_id")
    return None


def _persist_last_ordinal(ordinal_id: int) -> None:
    """Atomically write the last-queried ordinal to disk."""
    body = json.dumps({"ordinal_id": ordinal_id})
    tmp_fd, tmp_path = tempfile.mkstemp(dir=LAST_ORDINAL_PATH.parent, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w") as fh:
            fh.write(body)
        os.replace(tmp_path, LAST_ORDINAL_PATH)
    except Exception:
        with contextlib.suppress(OSError):
            os.unlink(tmp_path)


# Load persisted value at import time so it survives server restarts.
_last_queried_ordinal: int | None = _load_last_ordinal()

CLASS_ORDER = ["D", "C", "B", "A", "S1", "S2", "R"]

# Auction bid range multipliers per rarity (min_bid, fair_buyout, max_buyout)
# Based on FH6 auction house observed pricing patterns
AUCTION_TIERS: dict[str, dict] = {
    "Common": {"min": 0.50, "fair": 1.00, "max": 1.50},
    "Rare": {"min": 0.60, "fair": 1.20, "max": 1.80},
    "Epic": {"min": 0.70, "fair": 1.40, "max": 2.00},
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


def _save_cars(cars: list[dict]) -> None:
    """Atomically overwrite cars.json with the current in-memory list."""
    body = json.dumps(cars, indent=2, ensure_ascii=False)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=DATA_PATH.parent, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as fh:
            fh.write(body)
        os.replace(tmp_path, DATA_PATH)
    except Exception:
        with contextlib.suppress(OSError):
            os.unlink(tmp_path)
        raise


def load_garage() -> list[dict]:
    global _garage
    if _garage is None:
        if GARAGE_PATH.exists():
            with GARAGE_PATH.open() as f:
                _garage = json.load(f)
        else:
            _garage = []
    return _garage


def _save_garage(garage: list[dict]) -> None:
    """Atomically overwrite garage.json."""
    body = json.dumps(garage, indent=2, ensure_ascii=False)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=GARAGE_PATH.parent, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as fh:
            fh.write(body)
        os.replace(tmp_path, GARAGE_PATH)
    except Exception:
        with contextlib.suppress(OSError):
            os.unlink(tmp_path)
        raise


def load_wishlist() -> list[dict]:
    global _wishlist
    if _wishlist is None:
        if WISHLIST_PATH.exists():
            with WISHLIST_PATH.open() as f:
                _wishlist = json.load(f)
        else:
            _wishlist = []
    return _wishlist


def _save_wishlist(wishlist: list[dict]) -> None:
    """Atomically overwrite wishlist.json."""
    body = json.dumps(wishlist, indent=2, ensure_ascii=False)
    tmp_fd, tmp_path = tempfile.mkstemp(dir=WISHLIST_PATH.parent, suffix=".tmp")
    try:
        with os.fdopen(tmp_fd, "w", encoding="utf-8") as fh:
            fh.write(body)
        os.replace(tmp_path, WISHLIST_PATH)
    except Exception:
        with contextlib.suppress(OSError):
            os.unlink(tmp_path)
        raise


def _now_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _etag_response(data: list | dict):
    """Return a JSON response with an ETag header derived from content hash.

    Browsers and the Workbox StaleWhileRevalidate handler can use the ETag for
    conditional GETs (If-None-Match), reducing unnecessary data transfer.
    """
    body = json.dumps(data, separators=(",", ":"), sort_keys=False)
    etag = hashlib.md5(body.encode()).hexdigest()  # noqa: S324 — not crypto use
    resp = make_response(body, 200)
    resp.headers["Content-Type"] = "application/json"
    resp.headers["ETag"] = f'"{etag}"'
    resp.headers["Cache-Control"] = "no-cache"  # revalidate every time
    if request.headers.get("If-None-Match") == f'"{etag}"':
        return make_response("", 304)
    return resp


@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "cars": len(load_cars())})


@app.get("/api/version")
def api_version():
    """Return the current API / data build version.

    Cache-Control: no-store ensures this is never cached by Workbox or
    browser caches.  The frontend polls this endpoint every 5 minutes to
    detect new deployments independently of the PWA service worker update
    cycle (important on iOS home-screen installs).
    """
    resp = jsonify(
        {
            "version": os.environ.get("FH6_BUILD_VERSION", "dev"),
            "buildTime": os.environ.get("FH6_BUILD_TIME", "unknown"),
            "cars": len(load_cars()),
        }
    )
    resp.headers["Cache-Control"] = "no-store"
    return resp


@app.get("/api/cars")
def list_cars():
    cars = load_cars()

    q = request.args.get("q", "").strip().lower()
    manufacturer = request.args.get("manufacturer", "").strip().lower()
    pi_class = request.args.get("class", "").strip().upper()
    rarity = request.args.get("rarity", "").strip().lower()
    availability = request.args.get("availability", "").strip().lower()
    auctionable = request.args.get("auctionable", "").strip().lower()

    results = cars

    if q:
        # Also match by carordinalid when the query looks like a number
        q_is_int = q.isdigit()
        results = [
            c
            for c in results
            if q in c["full_name"].lower()
            or q in c["manufacturer"].lower()
            or q in c["model"].lower()
            or (q_is_int and str(c.get("carordinalid", "")) == q)
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

    return _etag_response(results)


@app.get("/api/cars/<int:car_id>")
def get_car(car_id: int):
    cars = load_cars()
    car = next((c for c in cars if c["id"] == car_id), None)
    if car is None:
        return jsonify({"error": "Car not found"}), 404
    return jsonify(car)


@app.patch("/api/cars/<int:car_id>")
def patch_car(car_id: int):
    """Update mutable fields on a car and persist to cars.json.

    Currently supported fields: ``carordinalid`` (int ≥ 0 or null to clear).
    """
    body = request.get_json(silent=True)
    if body is None:
        return jsonify({"error": "Request body must be JSON"}), 400

    with _data_lock:
        cars = load_cars()
        idx = next((i for i, c in enumerate(cars) if c["id"] == car_id), None)
        if idx is None:
            return jsonify({"error": "Car not found"}), 404

        if "carordinalid" in body:
            raw = body["carordinalid"]
            if raw is None:
                cars[idx]["carordinalid"] = None
            else:
                if not isinstance(raw, int) or raw < 0:
                    return (
                        jsonify({"error": "carordinalid must be a non-negative integer or null"}),
                        422,
                    )
                # Enforce uniqueness — reject if another car already owns this ordinal
                duplicate = next(
                    (c for c in cars if c.get("carordinalid") == raw and c["id"] != car_id),
                    None,
                )
                if duplicate:
                    return (
                        jsonify(
                            {
                                "error": "carordinalid already assigned",
                                "conflict_car_id": duplicate["id"],
                                "conflict_car": duplicate["full_name"],
                            }
                        ),
                        409,
                    )
                cars[idx]["carordinalid"] = raw

        _save_cars(cars)
        return jsonify(cars[idx])


@app.get("/api/cars/by-ordinal/<int:ordinal_id>")
def get_car_by_ordinal(ordinal_id: int):
    """Look up a car by its telemetry carordinalid.

    Driving a car in Forza implies ownership, so if the car isn't already in
    the garage it's added automatically with source="telemetry".  The response
    includes a ``garage_updated`` flag so the caller can tell when this happens.
    Only records the ordinal as the last-queried value on 404 (unmapped ordinals)
    so the Quick Assign UI always shows the most recent *unassigned* ordinal —
    mapped-car hits would otherwise overwrite a pending ordinal the user wants to assign.
    """
    cars = load_cars()
    car = next((c for c in cars if c.get("carordinalid") == ordinal_id), None)
    if car is None:
        # Only record unmapped ordinals — mapped ones don't need Quick Assign and
        # would overwrite a pending unmapped ordinal that the user still wants to assign.
        global _last_queried_ordinal
        _last_queried_ordinal = ordinal_id
        _persist_last_ordinal(ordinal_id)
        return jsonify({"error": "No car mapped to that ordinal ID"}), 404

    garage_updated = False
    with _garage_lock:
        garage = load_garage()
        if not any(e["car_id"] == car["id"] for e in garage):
            garage.append({"car_id": car["id"], "added_at": _now_iso(), "source": "telemetry"})
            _save_garage(garage)
            garage_updated = True

    return jsonify({**car, "garage_updated": garage_updated})


@app.get("/api/telemetry/last-ordinal")
def last_queried_ordinal():
    """Return the most recently queried telemetry ordinal ID.

    Used by the Quick Assign UI in CarDetail to offer one-click ordinal
    assignment without manual entry.  The response includes which car the
    ordinal is currently mapped to (if any) so the UI can disable the button
    when the ordinal is already taken by a different car.

    Returns ``{"ordinal_id": null}`` when no telemetry hit has been recorded
    since the server started.
    """
    ordinal_id = _last_queried_ordinal
    if ordinal_id is None:
        return jsonify({"ordinal_id": None})

    cars = load_cars()
    owner = next((c for c in cars if c.get("carordinalid") == ordinal_id), None)
    return jsonify(
        {
            "ordinal_id": ordinal_id,
            "assigned_to_car_id": owner["id"] if owner else None,
            "assigned_to_car_name": owner["full_name"] if owner else None,
        }
    )


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
    return jsonify(
        {
            "car_id": car_id,
            "rarity": car["rarity"],
            "base_value": base,
            "min_bid": _round_cr(base * tier["min"]),
            "fair_buyout": _round_cr(base * tier["fair"]),
            "max_buyout": _round_cr(base * tier["max"]),
            "auctionable": True,
        }
    )


@app.get("/api/filters")
def list_filters():
    """Return distinct values for all filterable fields."""
    cars = load_cars()
    return _etag_response(
        {
            "manufacturers": sorted({c["manufacturer"] for c in cars}),
            "classes": [c for c in CLASS_ORDER if any(car.get("pi_class") == c for car in cars)],
            "rarities": sorted({c["rarity"] for c in cars}),
            "availabilities": sorted({c.get("availability", "") for c in cars} - {""}),
        }
    )


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
    return _etag_response(results)


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


# ---------------------------------------------------------------------------
# Garage — owned car persistence
# ---------------------------------------------------------------------------


@app.get("/api/garage")
def get_garage():
    """Return the full garage with per-entry metadata."""
    garage = load_garage()
    owned_car_ids = [e["car_id"] for e in garage]
    return _etag_response({"entries": garage, "owned_car_ids": owned_car_ids})


@app.post("/api/garage/sync")
def sync_garage():
    """Merge a client-side list of owned car IDs into the server garage.

    Accepts ``{"car_ids": [1, 2, 3]}``.  New IDs are added with
    ``source="manual"``; existing entries are left untouched.  Returns the
    full merged ``owned_car_ids`` list so the client can update localStorage.

    Safe to call on every app load for offline→online sync.
    """
    body = request.get_json(silent=True)
    if body is None or not isinstance(body.get("car_ids"), list):
        return jsonify({"error": 'Request body must be {"car_ids": [int, ...]}'}), 400

    valid_ids = {c["id"] for c in load_cars()}
    # Silently ignore unknown/invalid IDs
    incoming = {int(i) for i in body["car_ids"] if isinstance(i, int) and i in valid_ids}

    with _garage_lock:
        garage = load_garage()
        existing_ids = {e["car_id"] for e in garage}
        new_ids = incoming - existing_ids
        if new_ids:
            now = _now_iso()
            for car_id in sorted(new_ids):
                garage.append({"car_id": car_id, "added_at": now, "source": "manual"})
            _save_garage(garage)
        owned_car_ids = [e["car_id"] for e in garage]

    return jsonify({"owned_car_ids": owned_car_ids, "added": len(new_ids)})


@app.post("/api/garage/<int:car_id>")
def add_to_garage(car_id: int):
    """Add a car to the garage (idempotent)."""
    cars = load_cars()
    if not any(c["id"] == car_id for c in cars):
        return jsonify({"error": "Car not found"}), 404

    with _garage_lock:
        garage = load_garage()
        existing = next((e for e in garage if e["car_id"] == car_id), None)
        if existing:
            return jsonify(existing), 200
        entry = {"car_id": car_id, "added_at": _now_iso(), "source": "manual"}
        garage.append(entry)
        _save_garage(garage)

    return jsonify(entry), 201


@app.delete("/api/garage/<int:car_id>")
def remove_from_garage(car_id: int):
    """Remove a car from the garage."""
    with _garage_lock:
        garage = load_garage()
        before = len(garage)
        garage[:] = [e for e in garage if e["car_id"] != car_id]
        if len(garage) == before:
            return jsonify({"error": "Car not in garage"}), 404
        _save_garage(garage)

    return jsonify({"removed": True, "car_id": car_id})


# ---------------------------------------------------------------------------
# Wishlist — cars the user wants but does not yet own
# ---------------------------------------------------------------------------


@app.get("/api/wishlist")
def get_wishlist():
    """Return the full wishlist with per-entry metadata."""
    wishlist = load_wishlist()
    car_ids = [e["car_id"] for e in wishlist]
    return _etag_response({"entries": wishlist, "car_ids": car_ids})


@app.post("/api/wishlist/sync")
def sync_wishlist():
    """Merge a client-side list of wishlisted car IDs into the server wishlist.

    Accepts ``{"car_ids": [1, 2, 3]}``.  New IDs are added; existing entries
    are left untouched.  Returns the full merged ``car_ids`` list.
    """
    body = request.get_json(silent=True)
    if body is None or not isinstance(body.get("car_ids"), list):
        return jsonify({"error": 'Request body must be {"car_ids": [int, ...]}'}), 400

    valid_ids = {c["id"] for c in load_cars()}
    incoming = {int(i) for i in body["car_ids"] if isinstance(i, int) and i in valid_ids}

    with _wishlist_lock:
        wishlist = load_wishlist()
        existing_ids = {e["car_id"] for e in wishlist}
        new_ids = incoming - existing_ids
        if new_ids:
            now = _now_iso()
            for car_id in sorted(new_ids):
                wishlist.append({"car_id": car_id, "added_at": now})
            _save_wishlist(wishlist)
        car_ids = [e["car_id"] for e in wishlist]

    return jsonify({"car_ids": car_ids, "added": len(new_ids)})


@app.post("/api/wishlist/<int:car_id>")
def add_to_wishlist(car_id: int):
    """Add a car to the wishlist (idempotent)."""
    cars = load_cars()
    if not any(c["id"] == car_id for c in cars):
        return jsonify({"error": "Car not found"}), 404

    with _wishlist_lock:
        wishlist = load_wishlist()
        existing = next((e for e in wishlist if e["car_id"] == car_id), None)
        if existing:
            return jsonify(existing), 200
        entry = {"car_id": car_id, "added_at": _now_iso()}
        wishlist.append(entry)
        _save_wishlist(wishlist)

    return jsonify(entry), 201


@app.delete("/api/wishlist/<int:car_id>")
def remove_from_wishlist(car_id: int):
    """Remove a car from the wishlist."""
    with _wishlist_lock:
        wishlist = load_wishlist()
        before = len(wishlist)
        wishlist[:] = [e for e in wishlist if e["car_id"] != car_id]
        if len(wishlist) == before:
            return jsonify({"error": "Car not in wishlist"}), 404
        _save_wishlist(wishlist)

    return jsonify({"removed": True, "car_id": car_id})


if __name__ == "__main__":
    port = int(os.environ.get("FH6_API_PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=False)  # noqa: S104
