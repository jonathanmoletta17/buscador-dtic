"""
Buscador DTIC — FastAPI Application (Standalone)
Backend mínimo contendo apenas os endpoints de busca.
Sem autenticação. Sem chargers. Sem knowledge. Sem admin.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.rate_limit import setup_rate_limiting
from app.core.database import close_db
from app.routers import health, db_read, search

# Logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup e shutdown do app."""
    logger.info("=" * 60)
    logger.info("Buscador DTIC Backend v1.0.0 iniciando...")
    logger.info("DB DSN: %s@%s:%s/%s",
                settings.db_user_dtic,
                settings.db_host_dtic,
                settings.db_port_dtic,
                settings.db_name_dtic)
    logger.info("=" * 60)
    yield
    logger.info("Encerrando conexões DB...")
    await close_db()
    logger.info("Buscador DTIC Backend finalizado.")


app = FastAPI(
    title="Buscador DTIC Backend",
    description="Backend standalone para o buscador de tickets GLPI da DTIC. Sem autenticação.",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate Limiting
setup_rate_limiting(app)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers (apenas os necessários para busca)
app.include_router(health.router)
app.include_router(db_read.router)     # /api/v1/{context}/db/stats, /db/tickets
app.include_router(search.router)      # /api/v1/{context}/tickets/search


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": "Buscador DTIC Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
        "endpoints": {
            "stats": "/api/v1/dtic/db/stats",
            "tickets": "/api/v1/dtic/db/tickets",
            "search": "/api/v1/dtic/tickets/search?q={query}",
        },
    }
