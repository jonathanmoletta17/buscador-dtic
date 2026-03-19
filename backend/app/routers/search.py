"""
Router: Ticket Search (Standalone — SEM autenticação)
Busca de tickets diretamente no banco MySQL GLPI (read-only).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.search import SearchResponse
from app.services.search_service import search_tickets

# SEM dependencies=[Depends(verify_session)]
router = APIRouter(prefix="/api/v1/{context}", tags=["Search"])

VALID_CONTEXTS = {"dtic"}


def _validate_context(context: str) -> str:
    ctx = context.lower()
    if ctx not in VALID_CONTEXTS:
        raise HTTPException(status_code=404, detail=f"Contexto '{context}' invalido. Use 'dtic'.")
    return ctx


@router.get("/tickets/search", response_model=SearchResponse)
async def search(
    context: str,
    db: AsyncSession = Depends(get_db),
    q: str = Query(..., min_length=1, description="Texto de busca (ID, titulo, conteudo)"),
    department: Optional[str] = Query(None, description="Departamento SIS: manutencao ou conservacao"),
    status: Optional[str] = Query(None, description="Status separados por virgula: 1,2,3"),
    limit: int = Query(50, ge=1, le=200, description="Maximo de resultados"),
):
    ctx = _validate_context(context)

    status_filter = None
    if status:
        try:
            status_filter = [int(s.strip()) for s in status.split(",")]
        except ValueError as exc:
            raise HTTPException(
                status_code=400,
                detail="Status deve ser lista de inteiros separados por virgula.",
            ) from exc

    result = await search_tickets(
        db=db,
        query=q,
        department=department,
        status_filter=status_filter,
        limit=limit,
    )

    return {
        **result,
        "context": ctx,
        "department": department,
    }
