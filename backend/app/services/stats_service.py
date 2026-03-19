"""
Stats Service — Contagem de tickets por status via SQL direto.
Substitui o `computeStats()` do frontend que só contava 50 tickets.

Princípio CQRS: leitura direta do MySQL GLPI (read-only).
"""

from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

# Mapeamento departamento SIS → group_id
DEPARTMENT_GROUP_MAP = {"manutencao": 22, "conservacao": 21}


async def get_core_stats(
    db: AsyncSession,
    group_ids: Optional[List[int]] = None,
    department: Optional[str] = None,
) -> dict:
    """
    Contagem real de tickets por status, alinhada com escopo do Kanban.

    Escopo: tickets ABERTOS + SOLUCIONADOS (exclui Fechados/status=6).
    Solucionados: total histórico + recentes (30 dias) para contexto.
    Em Atendimento: status 2 (Atribuído) + 3 (Planejado), como no Kanban.

    - Sem filtros: retorna o total global do contexto (DB).
    - group_ids: filtra por grupos técnicos (ex: [17] para DTIC).
    - department: atalho para SIS ('manutencao' → 22, 'conservacao' → 21).
    """
    # Resolver department → group_ids
    if department and not group_ids:
        gid = DEPARTMENT_GROUP_MAP.get(department)
        if gid:
            group_ids = [gid]

    params: dict = {}
    join_sql = ""

    # JOIN com groups_tickets se filtrar por grupo
    if group_ids:
        join_sql = "JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2"
        placeholders = ", ".join(f":g_{i}" for i in range(len(group_ids)))
        group_filter = f"AND gt.groups_id IN ({placeholders})"
        for i, gid in enumerate(group_ids):
            params[f"g_{i}"] = gid
    else:
        group_filter = ""

    sql = text(f"""
        SELECT
            COUNT(CASE WHEN t.status = 1 THEN 1 END) AS novos,
            COUNT(CASE WHEN t.status IN (2, 3) THEN 1 END) AS em_atendimento,
            COUNT(CASE WHEN t.status = 4 THEN 1 END) AS pendentes,
            COUNT(CASE WHEN t.status = 5 THEN 1 END) AS solucionados,
            COUNT(CASE WHEN t.status = 5 AND t.solvedate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) AS solucionados_recentes,
            COUNT(CASE WHEN t.status IN (1,2,3,4) THEN 1 END) AS total_abertos,
            COUNT(CASE WHEN t.status IN (1,2,3,4,5) THEN 1 END) AS total
        FROM glpi_tickets t
        {join_sql}
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND t.status IN (1, 2, 3, 4, 5)
          {group_filter}
    """)

    result = await db.execute(sql, params)
    row = result.fetchone()

    return {
        "novos": int(row[0] or 0),
        "em_atendimento": int(row[1] or 0),
        "pendentes": int(row[2] or 0),
        "solucionados": int(row[3] or 0),
        "solucionados_recentes": int(row[4] or 0),
        "total_abertos": int(row[5] or 0),
        "total": int(row[6] or 0),
    }
