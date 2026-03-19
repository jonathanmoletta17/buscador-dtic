"""
Schemas: Search and Ticket Read Responses
Modelos Pydantic para endpoints de listagem/busca de tickets.
"""

from typing import Optional

from pydantic import BaseModel, Field

from app.core.datetime_contract import AwareDateTime


class _TicketReadItemBase(BaseModel):
    """Campos compartilhados entre listagem e busca de tickets."""

    id: int
    title: str
    content: str = ""
    status_id: int = Field(alias="statusId")
    status: str
    urgency_id: int = Field(alias="urgencyId")
    urgency: str
    priority: int
    date_created: AwareDateTime = Field(alias="dateCreated")
    date_modified: AwareDateTime = Field(alias="dateModified")
    solve_date: Optional[AwareDateTime] = Field(None, alias="solveDate")
    close_date: Optional[AwareDateTime] = Field(None, alias="closeDate")
    category: str = "Sem categoria"
    requester: str = "N/A"
    technician: str = "N/A"

    model_config = {"populate_by_name": True}


class TicketListItem(_TicketReadItemBase):
    """Ticket individual retornado por /db/tickets."""


class TicketListResponse(BaseModel):
    """Resposta padronizada do endpoint /db/tickets."""

    total: int
    limit: int
    offset: int
    context: str
    data: list[TicketListItem]


class TicketSearchItem(_TicketReadItemBase):
    """Ticket individual retornado pela busca."""

    entity: Optional[str] = None
    group: Optional[str] = None
    relevance: float = 0.0


class SearchResponse(BaseModel):
    """Resposta padronizada do endpoint de busca."""

    total: int
    query: str
    context: str
    department: Optional[str] = None
    data: list[TicketSearchItem]
