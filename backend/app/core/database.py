"""
Database — Single async engine pool for DTIC MySQL.
Standalone version: no context registry, no multi-context.
"""

from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.config import settings

# Single engine pool for DTIC
engine = create_async_engine(
    settings.db_dsn,
    pool_size=5,
    max_overflow=10,
    pool_recycle=3600,
    echo=False,
)

async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection: yields an AsyncSession for the DTIC database."""
    async with async_session_maker() as session:
        yield session


async def close_db():
    """Graceful shutdown of the connection pool."""
    await engine.dispose()
