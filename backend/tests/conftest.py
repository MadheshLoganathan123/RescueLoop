import os
import sys
from pathlib import Path
import asyncio
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

# Ensure repository root is in sys.path
repo_root = Path(__file__).resolve().parent.parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

# Set test environment
TEST_DB_FILE = Path(__file__).resolve().parent / "test_rescueloop.db"
if TEST_DB_FILE.exists():
    try:
        TEST_DB_FILE.unlink()
    except Exception:
        pass

os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_FILE}"
os.environ["ENVIRONMENT"] = "test"
os.environ["JWT_SECRET"] = "rescueloop_super_secure_jwt_secret_key_production_2026_0123456789"

import backend.app.database as db_mod
from backend.app.database import Base
from backend.app.services.seed_data import init_seed_data

# Rebind database engine and sessionmaker to isolated test database
test_engine = create_async_engine(
    f"sqlite+aiosqlite:///{TEST_DB_FILE}",
    echo=False,
    connect_args={"check_same_thread": False}
)
test_session_factory = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False
)
db_mod.engine = test_engine
db_mod.AsyncSessionLocal = test_session_factory

from backend.app.main import app

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_database():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with test_session_factory() as session:
        await init_seed_data(session)
    
    yield

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await test_engine.dispose()
    if TEST_DB_FILE.exists():
        try:
            TEST_DB_FILE.unlink()
        except Exception:
            pass

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
