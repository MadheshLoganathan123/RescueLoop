import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_ops_network_stats(client: AsyncClient, ops_token: str):
    headers = {"Authorization": f"Bearer {ops_token}"}
    resp = await client.get("/api/v1/ops/network-stats", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "active_missions" in data
    assert "active_fleet_couriers" in data

@pytest.mark.asyncio
async def test_ops_telemetry_map_nodes(client: AsyncClient, ops_token: str):
    headers = {"Authorization": f"Bearer {ops_token}"}
    resp = await client.get("/api/v1/ops/telemetry/map", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert any(n["type"] == "donor" for n in data)
    assert any(n["type"] == "volunteer" for n in data)
    assert any(n["type"] == "ngo" for n in data)

@pytest.mark.asyncio
async def test_ops_mission_control_queue(client: AsyncClient, ops_token: str):
    headers = {"Authorization": f"Bearer {ops_token}"}
    resp = await client.get("/api/v1/ops/missions", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0

@pytest.mark.asyncio
async def test_ops_exceptions_feed(client: AsyncClient, ops_token: str):
    headers = {"Authorization": f"Bearer {ops_token}"}
    resp = await client.get("/api/v1/ops/exceptions", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)

@pytest.mark.asyncio
async def test_ops_audit_trail_ledger(client: AsyncClient, ops_token: str):
    headers = {"Authorization": f"Bearer {ops_token}"}
    resp = await client.get("/api/v1/ops/audit-trail", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
