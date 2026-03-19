"""
Search Service — Busca direta no banco MySQL GLPI.

Abordagem:
  - Query numérica → busca exata por ID
  - Query textual → LIKE em name, content, requester name, category name
  - JOINs: entidade, categoria, requester, technician, grupo
  - Consistente com ticket_list_service.py (mesmos maps, mesma _clean_html)

Nota: FULLTEXT MATCH AGAINST é ideal mas requer índice pré-criado.
      Usamos LIKE como fallback seguro que funciona sem setup.
      Quando o índice FULLTEXT for criado, basta trocar a cláusula WHERE.
"""

import re
import html as html_module
import logging
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.core.datetime_contract import serialize_datetime

logger = logging.getLogger(__name__)

# ─── Constantes (compartilhadas com ticket_list_service) ──────────────────
DEPARTMENT_GROUP_MAP = {"manutencao": 22, "conservacao": 21}
STATUS_MAP = {1: "Novo", 2: "Em Atendimento", 3: "Planejado", 4: "Pendente", 5: "Solucionado", 6: "Fechado"}
URGENCY_MAP = {1: "Muito Baixa", 2: "Baixa", 3: "Média", 4: "Alta", 5: "Muito Alta"}


def _clean_html(raw: str) -> str:
    """Remove tags HTML e decodifica entidades."""
    if not raw:
        return ""
    clean = html_module.unescape(raw)
    clean = re.sub(r"<[^>]*>", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:500]


async def search_tickets(
    db: AsyncSession,
    query: str,
    department: Optional[str] = None,
    status_filter: Optional[List[int]] = None,
    limit: int = 50,
) -> dict:
    """
    Busca tickets no banco MySQL GLPI.

    - query numérica pura: busca exata por ticket ID
    - query textual: LIKE em título, conteúdo e nome do solicitante
    - department: filtra por grupo técnico (manutencao=22, conservacao=21)
    - status_filter: lista de status para filtrar
    """
    query = query.strip()
    if not query:
        return {"total": 0, "query": "", "data": []}

    is_numeric = query.isdigit()
    params: dict = {"lim": limit}
    wheres = ["t.is_deleted = 0", "t.entities_id != 0"]
    joins = []

    # ─── Cláusula de busca ────────────────────────────────────────────
    if is_numeric:
        wheres.append("t.id = :q_id")
        params["q_id"] = int(query)
    else:
        # Tokeniza por espaço, AND entre termos
        terms = query.strip().split()
        for i, term in enumerate(terms):
            wheres.append(f"""(
                t.name LIKE :q_like_{i}
                OR t.content LIKE :q_like_{i}
                OR CAST(t.id AS CHAR) LIKE :q_like_{i}
            )""")
            params[f"q_like_{i}"] = f"%{term}%"

    # ─── Filtro por departamento (grupo técnico) ──────────────────────
    if department:
        gid = DEPARTMENT_GROUP_MAP.get(department.lower())
        if gid:
            joins.append("JOIN glpi_groups_tickets gt_dept ON gt_dept.tickets_id = t.id AND gt_dept.type = 2")
            wheres.append("gt_dept.groups_id = :dept_gid")
            params["dept_gid"] = gid

    # ─── Filtro de status ─────────────────────────────────────────────
    if status_filter:
        placeholders = ", ".join(f":s_{i}" for i in range(len(status_filter)))
        wheres.append(f"t.status IN ({placeholders})")
        for i, s in enumerate(status_filter):
            params[f"s_{i}"] = s

    # ─── JOINs para dados relacionados ────────────────────────────────
    # Requester (type=1) — subquery para evitar duplicação
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

    # Technician (type=2) — subquery para evitar duplicação
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

    # Categoria, Entidade, Grupo
    joins.append("LEFT JOIN glpi_itilcategories cat ON t.itilcategories_id = cat.id")
    joins.append("LEFT JOIN glpi_entities ent ON t.entities_id = ent.id")
    joins.append("""
        LEFT JOIN (
            SELECT gt.tickets_id, MIN(g.name) as group_name
            FROM glpi_groups_tickets gt
            JOIN glpi_groups g ON gt.groups_id = g.id
            WHERE gt.type = 2
            GROUP BY gt.tickets_id
        ) grp ON grp.tickets_id = t.id
    """)

    joins_sql = "\n".join(joins)
    where_sql = " AND ".join(wheres)

    # ─── Count ────────────────────────────────────────────────────────
    count_sql = text(f"""
        SELECT COUNT(DISTINCT t.id)
        FROM glpi_tickets t
        {joins_sql}
        WHERE {where_sql}
    """)
    count_result = await db.execute(count_sql, params)
    total = count_result.scalar() or 0

    # ─── Main query ──────────────────────────────────────────────────
    sql = text(f"""
        SELECT DISTINCT
            t.id, t.name, t.content, t.status, t.urgency, t.priority,
            t.date, t.date_mod, t.solvedate, t.closedate,
            COALESCE(req.full_name, 'N/A') AS requester,
            COALESCE(tech.full_name, 'N/A') AS technician,
            COALESCE(cat.completename, 'Sem categoria') AS category,
            COALESCE(ent.name, '') AS entity,
            COALESCE(grp.group_name, '') AS group_name
        FROM glpi_tickets t
        {joins_sql}
        WHERE {where_sql}
        ORDER BY t.date_mod DESC, t.id DESC
        LIMIT :lim
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
            "entity": r[13],
            "group": r[14],
            "relevance": 1.0 if is_numeric else 0.0,
        })

    return {
        "total": total,
        "query": query,
        "data": tickets,
    }
