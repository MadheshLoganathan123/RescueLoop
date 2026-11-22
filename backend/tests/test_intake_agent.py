import json

import httpx
import pytest

from backend.app.agents import intake_agent
from backend.app.agents.intake_agent import IntakeAgent
from backend.app.config import settings


def install_mock_transport(monkeypatch, handler):
    client_type = httpx.AsyncClient
    transport = httpx.MockTransport(handler)

    def client_factory(*args, **kwargs):
        return client_type(*args, transport=transport, **kwargs)

    monkeypatch.setattr(intake_agent.httpx, "AsyncClient", client_factory)
    monkeypatch.setattr(settings, "AGENT_ROUTER_API_KEY", "local-test-key")
    monkeypatch.setattr(settings, "AGENT_ROUTER_BASE_URL", "https://router.example/api/agentic-api")
    monkeypatch.setattr(settings, "AGENT_ROUTER_MODEL", "test/live-model")


@pytest.mark.asyncio
async def test_intake_uses_documented_agent_router_contract(monkeypatch):
    response_data = {
        "title": "75 Vegetable Biryani Portions",
        "food_category": "Prepared Cooked Meals",
        "quantity_meals": 75,
        "packaging_type": "Sealed trays",
        "storage_temp": "Hot-held",
        "allergens": "Not specified",
        "handling_notes": "Prepared at 12:30 PM",
        "estimated_shelf_life_hours": 3,
        "needs_clarification": False,
        "clarifying_questions": [],
    }

    def handler(request):
        assert request.method == "POST"
        assert request.url.path == "/api/agentic-api/domains/models/capabilities/chat-complete/execute"
        assert request.headers["Authorization"] == "Bearer local-test-key"
        body = json.loads(request.content)
        assert body["model"] == "test/live-model"
        assert body["messages"][1]["content"] == "75 vegetable biryani portions"
        return httpx.Response(
            200,
            json={"success": True, "completionText": json.dumps(response_data)},
        )

    install_mock_transport(monkeypatch, handler)

    result = await IntakeAgent.extract_details("75 vegetable biryani portions")

    assert result.quantity_meals == 75
    assert result.food_category == "Prepared Cooked Meals"
    assert result.storage_temp == "Hot-held"


@pytest.mark.asyncio
async def test_malformed_agent_router_response_uses_fallback(monkeypatch):
    def handler(_request):
        return httpx.Response(200, json={"success": True, "completionText": "not JSON"})

    install_mock_transport(monkeypatch, handler)

    result = await IntakeAgent.extract_details("vegetable biryani prepared at 12:30 PM")

    assert result.quantity_meals is None
    assert result.needs_clarification is True
    assert any("How many" in question for question in result.clarifying_questions)


@pytest.mark.asyncio
@pytest.mark.parametrize("status_code", [401, 403, 429, 503])
async def test_agent_router_http_failures_use_deterministic_fallback(monkeypatch, status_code):
    def handler(_request):
        return httpx.Response(status_code, json={"success": False})

    install_mock_transport(monkeypatch, handler)

    result = await IntakeAgent.extract_details("20 bread loaves in paper wraps")

    assert result.quantity_meals == 20
    assert result.food_category == "Baked Goods & Breads"
    assert result.needs_clarification is True
