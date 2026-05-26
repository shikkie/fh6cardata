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
    assert all(c["class"] == "S1" for c in cars)


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
    assert "types" in data
    assert "rarities" in data


def test_car_has_required_fields(client):
    resp = client.get("/api/cars")
    cars = json.loads(resp.data)
    required = {
        "id", "full_name", "manufacturer", "model",
        "class", "pi", "type", "rarity", "base_value",
    }
    for car in cars:
        missing = required - car.keys()
        assert not missing, f"Car {car.get('id')} missing fields: {missing}"
