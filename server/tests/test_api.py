def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json["status"] == "ok"


def test_list_plans(client):
    response = client.get("/api/plans")
    assert response.status_code == 200
    assert response.json["data"][0]["title"] == "Want to go"


def test_create_plan_requires_title(client):
    response = client.post("/api/plans", json={"description": "missing title"})
    assert response.status_code == 422


def test_create_plan(client):
    response = client.post("/api/plans", json={"title": "Weekend"})
    assert response.status_code == 201
    assert response.json["data"]["title"] == "Weekend"
