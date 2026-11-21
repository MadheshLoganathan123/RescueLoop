import pytest
import pytest_asyncio
import asyncio
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.database import engine, Base, AsyncSessionLocal
from backend.app.services.seed_data import init_seed_data

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        await init_seed_data(session)
    
    yield

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest_asyncio.fixture
async def donor_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/demo-login/donor")
    assert resp.status_code == 200
    return resp.json()["access_token"]

@pytest_asyncio.fixture
async def ngo_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/demo-login/ngo")
    assert resp.status_code == 200
    return resp.json()["access_token"]

@pytest_asyncio.fixture
async def volunteer_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/demo-login/volunteer")
    assert resp.status_code == 200
    return resp.json()["access_token"]

@pytest_asyncio.fixture
async def ops_token(client: AsyncClient):
    resp = await client.post("/api/v1/auth/demo-login/ops")
    assert resp.status_code == 200
    return resp.json()["access_token"]
