"""Tests for FH6 Car Data Flask API."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))
from api.main import app


@pytest.fixture()
def client():
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c


def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["status"] == "ok"
    assert data["cars"] > 0


def test_list_cars_returns_all(client):
    resp = client.get("/api/cars")
    assert resp.status_code == 200
    cars = json.loads(resp.data)
    assert isinstance(cars, list)
    assert len(cars) > 0


def test_filter_by_class(client):
    resp = client.get("/api/cars?class=S1")
    assert resp.status_code == 200
    cars = json.loads(resp.data)
    assert all(c["pi_class"] == "S1" for c in cars)


def test_filter_by_r_class(client):
    resp = client.get("/api/cars?class=R")
    assert resp.status_code == 200
    cars = json.loads(resp.data)
    assert len(cars) > 0, "R class should have cars"
    assert all(c["pi_class"] == "R" for c in cars)


def test_filters_includes_r_class(client):
    resp = client.get("/api/filters")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert "R" in data["classes"], "R class should appear in filter options"


def test_filter_by_rarity(client):
    resp = client.get("/api/cars?rarity=Epic")
    assert resp.status_code == 200
    cars = json.loads(resp.data)
    assert all(c["rarity"] == "Epic" for c in cars)


def test_filter_by_manufacturer(client):
    resp = client.get("/api/cars?manufacturer=Ford")
    assert resp.status_code == 200
    cars = json.loads(resp.data)
    assert all(c["manufacturer"] == "Ford" for c in cars)


def test_search_query(client):
    resp = client.get("/api/cars?q=mustang")
    assert resp.status_code == 200
    cars = json.loads(resp.data)
    assert any("Mustang" in c["full_name"] for c in cars)


def test_filter_auctionable(client):
    resp = client.get("/api/cars?auctionable=true")
    assert resp.status_code == 200
    cars = json.loads(resp.data)
    assert all(c["auctionable"] for c in cars)


def test_get_car_by_id(client):
    resp = client.get("/api/cars/1")
    assert resp.status_code == 200
    car = json.loads(resp.data)
    assert car["id"] == 1


def test_get_car_not_found(client):
    resp = client.get("/api/cars/99999")
    assert resp.status_code == 404


def test_filters_endpoint(client):
    resp = client.get("/api/filters")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert "manufacturers" in data
    assert "classes" in data
    assert "rarities" in data
    assert "availabilities" in data


def test_car_has_required_fields(client):
    resp = client.get("/api/cars")
    cars = json.loads(resp.data)
    required = {
        "id",
        "full_name",
        "manufacturer",
        "model",
        "pi_class",
        "pi",
        "rarity",
        "base_value",
        "auctionable",
    }
    for car in cars:
        missing = required - car.keys()
        assert not missing, f"Car {car.get('id')} missing fields: {missing}"


def test_auction_endpoint_auctionable(client):
    # Find first auctionable car with a base value
    import json as _json

    cars = _json.loads(client.get("/api/cars?auctionable=true").data)
    car = next((c for c in cars if c.get("base_value")), None)
    assert car is not None
    resp = client.get(f"/api/cars/{car['id']}/auction")
    assert resp.status_code == 200
    data = _json.loads(resp.data)
    assert data["auctionable"] is True
    assert data["min_bid"] > 0
    assert data["fair_buyout"] >= data["min_bid"]
    assert data["max_buyout"] >= data["fair_buyout"]


def test_auction_endpoint_not_auctionable(client):
    import json as _json

    cars = _json.loads(client.get("/api/cars?auctionable=false").data)
    assert cars
    resp = client.get(f"/api/cars/{cars[0]['id']}/auction")
    assert resp.status_code == 200
    data = _json.loads(resp.data)
    assert data["auctionable"] is False


def test_auction_endpoint_not_found(client):
    resp = client.get("/api/cars/99999/auction")
    assert resp.status_code == 404


def test_parts_list(client):
    resp = client.get("/api/parts")
    assert resp.status_code == 200
    parts = json.loads(resp.data)
    assert len(parts) > 0
    assert all("id" in p and "category" in p and "tier" in p for p in parts)


def test_parts_filter_by_class(client):
    resp = client.get("/api/parts?class=D")
    assert resp.status_code == 200
    parts = json.loads(resp.data)
    assert all("D" in p["applies_to_classes"] for p in parts)


def test_parts_filter_by_category(client):
    resp = client.get("/api/parts?category=Engine")
    assert resp.status_code == 200
    parts = json.loads(resp.data)
    assert all(p["category"] == "Engine" for p in parts)


def test_parts_categories(client):
    resp = client.get("/api/parts/categories")
    assert resp.status_code == 200
    cats = json.loads(resp.data)
    assert "Engine" in cats
    assert "Drivetrain" in cats


def test_parts_get_by_id(client):
    resp = client.get("/api/parts/engine_exhaust_race")
    assert resp.status_code == 200
    part = json.loads(resp.data)
    assert part["id"] == "engine_exhaust_race"


def test_parts_not_found(client):
    resp = client.get("/api/parts/nonexistent_part")
    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# carordinalid — PATCH and by-ordinal lookup
# ---------------------------------------------------------------------------


@pytest.fixture()
def first_car_id(client):
    """Return the id of the first car in the catalogue."""
    cars = json.loads(client.get("/api/cars").data)
    return cars[0]["id"]


def test_patch_car_set_ordinal(client, first_car_id):
    """Setting a valid carordinalid persists and is returned in the response."""
    with patch("api.main._save_cars"):
        resp = client.patch(
            f"/api/cars/{first_car_id}",
            json={"carordinalid": 999999},
        )
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["carordinalid"] == 999999
    # Clean up in-memory state
    with patch("api.main._save_cars"):
        client.patch(f"/api/cars/{first_car_id}", json={"carordinalid": None})


def test_patch_car_clear_ordinal(client, first_car_id):
    """Sending null clears the carordinalid."""
    with patch("api.main._save_cars"):
        client.patch(f"/api/cars/{first_car_id}", json={"carordinalid": 888888})
        resp = client.patch(f"/api/cars/{first_car_id}", json={"carordinalid": None})
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["carordinalid"] is None


def test_patch_car_invalid_ordinal(client, first_car_id):
    """A negative or non-integer ordinal is rejected with 422."""
    with patch("api.main._save_cars"):
        resp = client.patch(f"/api/cars/{first_car_id}", json={"carordinalid": -1})
    assert resp.status_code == 422


def test_patch_car_not_found(client):
    resp = client.patch("/api/cars/99999", json={"carordinalid": 1})
    assert resp.status_code == 404


def test_patch_car_duplicate_ordinal(client):
    """Assigning an ordinal already owned by another car returns 409."""
    cars = json.loads(client.get("/api/cars").data)
    car_a, car_b = cars[0]["id"], cars[1]["id"]
    with patch("api.main._save_cars"):
        client.patch(f"/api/cars/{car_a}", json={"carordinalid": 777777})
        resp = client.patch(f"/api/cars/{car_b}", json={"carordinalid": 777777})
        assert resp.status_code == 409
        # Clean up
        client.patch(f"/api/cars/{car_a}", json={"carordinalid": None})


def test_by_ordinal_found(client, first_car_id):
    with patch("api.main._save_cars"):
        client.patch(f"/api/cars/{first_car_id}", json={"carordinalid": 555555})
        with patch("api.main._save_garage"):
            resp = client.get("/api/cars/by-ordinal/555555")
            assert resp.status_code == 200
            data = json.loads(resp.data)
            assert data["id"] == first_car_id
            assert data["carordinalid"] == 555555
        # Clean up
        client.patch(f"/api/cars/{first_car_id}", json={"carordinalid": None})


def test_by_ordinal_not_found(client):
    resp = client.get("/api/cars/by-ordinal/1")
    assert resp.status_code == 404


def test_search_by_ordinal(client, first_car_id):
    """Text search with a numeric string matches carordinalid."""
    with patch("api.main._save_cars"):
        client.patch(f"/api/cars/{first_car_id}", json={"carordinalid": 424242})
        resp = client.get("/api/cars?q=424242")
        assert resp.status_code == 200
        cars = json.loads(resp.data)
        assert any(c["id"] == first_car_id for c in cars)
        # Clean up
        client.patch(f"/api/cars/{first_car_id}", json={"carordinalid": None})


# ---------------------------------------------------------------------------
# Garage — owned car persistence
# ---------------------------------------------------------------------------


@pytest.fixture()
def garage_client(client):
    """Client with an empty in-memory garage; _save_garage writes are mocked."""
    import api.main as mod

    original = mod._garage
    mod._garage = []
    with patch("api.main._save_garage"):
        yield client
    mod._garage = original


def test_garage_empty(garage_client):
    resp = garage_client.get("/api/garage")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["owned_car_ids"] == []
    assert data["entries"] == []


def test_garage_add(garage_client):
    resp = garage_client.post("/api/garage/1")
    assert resp.status_code == 201
    entry = json.loads(resp.data)
    assert entry["car_id"] == 1
    assert entry["source"] == "manual"
    assert "added_at" in entry


def test_garage_add_idempotent(garage_client):
    """Adding the same car twice returns the existing entry, not a duplicate."""
    garage_client.post("/api/garage/1")
    resp = garage_client.post("/api/garage/1")
    assert resp.status_code == 200  # already present
    data = json.loads(garage_client.get("/api/garage").data)
    assert data["owned_car_ids"].count(1) == 1


def test_garage_add_not_found(garage_client):
    resp = garage_client.post("/api/garage/99999")
    assert resp.status_code == 404


def test_garage_remove(garage_client):
    garage_client.post("/api/garage/1")
    resp = garage_client.delete("/api/garage/1")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["removed"] is True
    garage_data = json.loads(garage_client.get("/api/garage").data)
    assert 1 not in garage_data["owned_car_ids"]


def test_garage_remove_not_in_garage(garage_client):
    resp = garage_client.delete("/api/garage/1")
    assert resp.status_code == 404


def test_garage_sync_merges(garage_client):
    """Sync uploads local IDs and merges with server state."""
    garage_client.post("/api/garage/1")  # already on server
    resp = garage_client.post("/api/garage/sync", json={"car_ids": [1, 2, 3]})
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert set(data["owned_car_ids"]) == {1, 2, 3}
    assert data["added"] == 2  # 2 and 3 were new


def test_garage_sync_empty_ids(garage_client):
    resp = garage_client.post("/api/garage/sync", json={"car_ids": []})
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert data["owned_car_ids"] == []
    assert data["added"] == 0


def test_garage_sync_bad_body(garage_client):
    resp = garage_client.post("/api/garage/sync", json={"wrong": "field"})
    assert resp.status_code == 400


def test_by_ordinal_implicit_garage(garage_client, first_car_id):
    """A by-ordinal hit auto-adds the car to the garage with source=telemetry."""
    # Map the ordinal first
    with patch("api.main._save_cars"):
        garage_client.patch(f"/api/cars/{first_car_id}", json={"carordinalid": 131313})
        resp = garage_client.get("/api/cars/by-ordinal/131313")
        assert resp.status_code == 200
        data = json.loads(resp.data)
        assert data["garage_updated"] is True
        # Second hit — already in garage
        resp2 = garage_client.get("/api/cars/by-ordinal/131313")
        data2 = json.loads(resp2.data)
        assert data2["garage_updated"] is False
        # Verify source=telemetry in garage entries
        garage_data = json.loads(garage_client.get("/api/garage").data)
        entry = next(e for e in garage_data["entries"] if e["car_id"] == first_car_id)
        assert entry["source"] == "telemetry"
        # Clean up ordinal
        garage_client.patch(f"/api/cars/{first_car_id}", json={"carordinalid": None})
