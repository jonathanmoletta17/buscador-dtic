"""
Ticket List Service — Listagem paginada de tickets com JOINs.
Substitui o `fetchTicketsByGroup()` que usava Search API limitada a 50 itens.

Princípio CQRS: leitura direta do MySQL GLPI (read-only).
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging
import html as html_module
from app.core.datetime_contract import serialize_datetime

logger = logging.getLogger(__name__)

# Mapeamento departamento SIS → group_id
DEPARTMENT_GROUP_MAP = {"manutencao": 22, "conservacao": 21}

STATUS_MAP = {1: "Novo", 2: "Em Atendimento", 3: "Planejado", 4: "Pendente", 5: "Solucionado", 6: "Fechado"}
URGENCY_MAP = {1: "Muito Baixa", 2: "Baixa", 3: "Média", 4: "Alta", 5: "Muito Alta"}


def _clean_html(raw: str) -> str:
    """Remove tags HTML e decodifica entidades."""
    if not raw:
        return ""
    import re
    clean = html_module.unescape(raw)
    clean = re.sub(r"<[^>]*>", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:500]  # Truncar para performance


async def list_tickets(
    db: AsyncSession,
    group_ids: Optional[List[int]] = None,
    department: Optional[str] = None,
    status_filter: Optional[List[int]] = None,
    requester_id: Optional[int] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """
    Listagem de tickets com requester, technician e category via JOINs.

    - group_ids: filtra por grupo técnico atribuído.
    - department: atalho SIS ('manutencao' → 22, 'conservacao' → 21).
    - status_filter: lista de statusId para filtrar (ex: [1,2,3,4] para abertos).
    - limit/offset: paginação real.
    """
    # Resolver department → group_ids
    if department and not group_ids:
        gid = DEPARTMENT_GROUP_MAP.get(department)
        if gid:
            group_ids = [gid]

    params: dict = {"lim": limit, "off": offset}
    joins = []
    wheres = ["t.is_deleted = 0", "t.entities_id != 0"]

    # JOIN grupo
    if group_ids:
        joins.append("JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2")
        placeholders = ", ".join(f":g_{i}" for i in range(len(group_ids)))
        wheres.append(f"gt.groups_id IN ({placeholders})")
        for i, gid in enumerate(group_ids):
            params[f"g_{i}"] = gid

    # Filtro de status
    if status_filter:
        placeholders = ", ".join(f":s_{i}" for i in range(len(status_filter)))
        wheres.append(f"t.status IN ({placeholders})")
        for i, s in enumerate(status_filter):
            params[f"s_{i}"] = s

    # Filtro de Solicitante (Requester)
    if requester_id:
        joins.append("JOIN glpi_tickets_users rtu ON rtu.tickets_id = t.id AND rtu.type = 1")
        wheres.append("rtu.users_id = :req_id")
        params["req_id"] = requester_id

    # Filtro temporal opcional (sem filtro por padrão)
    if date_from:
        wheres.append("DATE(t.date) >= :date_from")
        params["date_from"] = date_from
    if date_to:
        wheres.append("DATE(t.date) <= :date_to")
        params["date_to"] = date_to

    # JOINs para requester e technician (subqueries para evitar duplicação)
    joins.append("""
        LEFT JOIN (
            SELECT tu.tickets_id, MIN(u.id) as user_id,
                   MIN(CONCAT_WS(' ', NULLIF(u.firstname,''), NULLIF(u.realname,''))) as full_name
            FROM glpi_tickets_users tu
            JOIN glpi_users u ON tu.users_id = u.id
            WHERE tu.type = 1
            GROUP BY tu.tickets_id
        ) req ON req.tickets_id = t.id
    """)
    joins.append("""
        LEFT JOIN (
            SELECT tu.tickets_id, MIN(u.id) as user_id,
                   MIN(CONCAT_WS(' ', NULLIF(u.firstname,''), NULLIF(u.realname,''))) as full_name
            FROM glpi_tickets_users tu
            JOIN glpi_users u ON tu.users_id = u.id
            WHERE tu.type = 2
            GROUP BY tu.tickets_id
        ) tech ON tech.tickets_id = t.id
    """)

    # JOIN category
    joins.append("LEFT JOIN glpi_itilcategories cat ON t.itilcategories_id = cat.id")

    joins_sql = "\n".join(joins)
    where_sql = " AND ".join(wheres)

    # Count total
    count_sql = text(f"""
        SELECT COUNT(DISTINCT t.id)
        FROM glpi_tickets t
        {joins_sql}
        WHERE {where_sql}
    """)
    count_result = await db.execute(count_sql, params)
    total_count = count_result.scalar() or 0

    # Main query
    sql = text(f"""
        SELECT DISTINCT
            t.id, t.name, t.content, t.status, t.urgency, t.priority,
            t.date, t.date_mod, t.solvedate, t.closedate,
            COALESCE(req.full_name, 'N/A') AS requester,
            COALESCE(tech.full_name, 'N/A') AS technician,
            COALESCE(cat.completename, 'Sem categoria') AS category
        FROM glpi_tickets t
        {joins_sql}
        WHERE {where_sql}
        ORDER BY t.date DESC
        LIMIT :lim OFFSET :off
    """)

    result = await db.execute(sql, params)
    rows = result.fetchall()

    tickets = []
    for r in rows:
        tickets.append({
            "id": r[0],
            "title": _clean_html(r[1] or "Sem título"),
            "content": _clean_html(r[2] or ""),
            "statusId": r[3],
            "status": STATUS_MAP.get(r[3], f"Status {r[3]}"),
            "urgencyId": r[4],
            "urgency": URGENCY_MAP.get(r[4], f"Urgência {r[4]}"),
            "priority": r[5],
            "dateCreated": serialize_datetime(r[6]) or "",
            "dateModified": serialize_datetime(r[7]) or "",
            "solveDate": serialize_datetime(r[8]),
            "closeDate": serialize_datetime(r[9]),
            "requester": r[10],
            "technician": r[11],
            "category": r[12],
        })

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "data": tickets,
    }
