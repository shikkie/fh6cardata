"""Tests for FH6 Car Data Flask API."""

from __future__ import annotations

import json
import sys
from pathlib import Path

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
