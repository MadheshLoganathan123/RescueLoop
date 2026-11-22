import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy.pool import NullPool
from sqlalchemy import event
from backend.app.config import settings

logger = logging.getLogger("rescueloop.database")

is_sqlite = "sqlite" in settings.DATABASE_URL

if is_sqlite:
    engine_kwargs = {
        "echo": False,
        "connect_args": {"check_same_thread": False}
    }
else:
    # High-efficiency PostgreSQL pool configuration:
    # NullPool ensures clean connection lifecycle per request/session,
    # preventing cross-event-loop socket corruption and stale cloud socket disconnects.
    engine_kwargs = {
        "echo": False,
        "poolclass": NullPool,
    }

engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)

if is_sqlite:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
