import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import { getAppDbConfig } from "./config";
import { getDbPool } from "./db";
import {
  cleanHtml,
  serializeDateTime,
  statusLabelFromId,
  urgencyLabelFromId,
} from "./serialization";

interface TicketStatsFilters {
  groupIds?: number[];
  department?: string;
}

interface ListTicketsFilters extends TicketStatsFilters {
  statusFilter?: number[];
  requesterId?: number;
  dateFrom?: string;
  dateTo?: string;
  limit: number;
  offset: number;
}

interface SearchTicketsFilters {
  query: string;
  department?: string;
  statusFilter?: number[];
  limit: number;
}

type SqlParam = string | number;

interface TicketResultRow extends RowDataPacket {
  id: number;
  name: string | null;
  content: string | null;
  status: number;
  urgency: number;
  priority: number;
  date: string | null;
  date_mod: string | null;
  solvedate: string | null;
  closedate: string | null;
  requester: string | null;
  technician: string | null;
  category: string | null;
  entity: string | null;
  group_name: string | null;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface StatsRow extends RowDataPacket {
  novos: number;
  em_atendimento: number;
  pendentes: number;
  solucionados: number;
  solucionados_recentes: number;
  total_abertos: number;
  total: number;
}

const DEPARTMENT_GROUP_MAP: Record<string, number> = {
  manutencao: 22,
  conservacao: 21,
};

const REQUESTER_SUBQUERY = `
LEFT JOIN (
  SELECT
    tu.tickets_id,
    MIN(CONCAT_WS(' ', NULLIF(u.firstname, ''), NULLIF(u.realname, ''))) AS full_name
  FROM glpi_tickets_users tu
  JOIN glpi_users u
    ON u.id = tu.users_id
  WHERE tu.type = 1
  GROUP BY tu.tickets_id
) req ON req.tickets_id = t.id
`;

const TECHNICIAN_SUBQUERY = `
LEFT JOIN (
  SELECT
    tu.tickets_id,
    MIN(CONCAT_WS(' ', NULLIF(u.firstname, ''), NULLIF(u.realname, ''))) AS full_name
  FROM glpi_tickets_users tu
  JOIN glpi_users u
    ON u.id = tu.users_id
  WHERE tu.type = 2
  GROUP BY tu.tickets_id
) tech ON tech.tickets_id = t.id
`;

const GROUP_SUBQUERY = `
LEFT JOIN (
  SELECT
    gt.tickets_id,
    MIN(COALESCE(g.completename, g.name)) AS group_name
  FROM glpi_groups_tickets gt
  JOIN glpi_groups g
    ON g.id = gt.groups_id
  WHERE gt.type = 2
  GROUP BY gt.tickets_id
) grp ON grp.tickets_id = t.id
`;

function placeholders(values: readonly unknown[]): string {
  return values.map(() => "?").join(", ");
}

function resolveScopedGroupIds(groupIds?: number[], department?: string): number[] | undefined {
  if (groupIds?.length) return groupIds;
  if (!department || getAppDbConfig().categoryFilter) return undefined;

  const mapped = DEPARTMENT_GROUP_MAP[department.trim().toLowerCase()];
  return mapped ? [mapped] : undefined;
}

function buildScopeSql(filters: {
  groupIds?: number[];
  department?: string;
  statusFilter?: number[];
  requesterId?: number;
  dateFrom?: string;
  dateTo?: string;
}): { joins: string; where: string; params: SqlParam[] } {
  const joins: string[] = [
    "LEFT JOIN glpi_itilcategories cat ON t.itilcategories_id = cat.id",
  ];
  const where: string[] = ["t.is_deleted = 0", "t.entities_id != 0"];
  const params: SqlParam[] = [];

  const appDbConfig = getAppDbConfig();

  if (appDbConfig.categoryFilter) {
    where.push("cat.completename LIKE ?");
    params.push(`%${appDbConfig.categoryFilter}%`);
  }

  const scopedGroupIds = resolveScopedGroupIds(filters.groupIds, filters.department);
  if (scopedGroupIds?.length) {
    joins.push("JOIN glpi_groups_tickets gt_filter ON gt_filter.tickets_id = t.id AND gt_filter.type = 2");
    where.push(`gt_filter.groups_id IN (${placeholders(scopedGroupIds)})`);
    params.push(...scopedGroupIds);
  }

  if (filters.statusFilter?.length) {
    where.push(`t.status IN (${placeholders(filters.statusFilter)})`);
    params.push(...filters.statusFilter);
  }

  if (filters.requesterId) {
    joins.push("JOIN glpi_tickets_users rtu ON rtu.tickets_id = t.id AND rtu.type = 1");
    where.push("rtu.users_id = ?");
    params.push(filters.requesterId);
  }

  if (filters.dateFrom) {
    where.push("DATE(t.date) >= ?");
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    where.push("DATE(t.date) <= ?");
    params.push(filters.dateTo);
  }

  return {
    joins: joins.join("\n"),
    where: where.join(" AND "),
    params,
  };
}

function mapTicketRow(row: TicketResultRow) {
  const statusId = Number(row.status || 0);
  const urgencyId = Number(row.urgency || 0);

  return {
    id: Number(row.id),
    title: cleanHtml(row.name || "Sem titulo"),
    content: cleanHtml(row.content || ""),
    statusId,
    status: statusLabelFromId(statusId),
    urgencyId,
    urgency: urgencyLabelFromId(urgencyId),
    priority: Number(row.priority || 0),
    dateCreated: serializeDateTime(row.date) ?? "",
    dateModified: serializeDateTime(row.date_mod) ?? "",
    solveDate: serializeDateTime(row.solvedate),
    closeDate: serializeDateTime(row.closedate),
    requester: row.requester || "N/A",
    technician: row.technician || "N/A",
    category: row.category || "Sem categoria",
    entity: row.entity || "",
    group: row.group_name || "",
  };
}

export async function getTicketStats(filters: TicketStatsFilters) {
  const pool = getDbPool();
  const scope = buildScopeSql(filters);

  const statsSql = `
    SELECT
      COUNT(CASE WHEN t.status = 1 THEN 1 END) AS novos,
      COUNT(CASE WHEN t.status IN (2, 3) THEN 1 END) AS em_atendimento,
      COUNT(CASE WHEN t.status = 4 THEN 1 END) AS pendentes,
      COUNT(CASE WHEN t.status = 5 THEN 1 END) AS solucionados,
      COUNT(CASE WHEN t.status = 5 AND t.solvedate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN 1 END) AS solucionados_recentes,
      COUNT(CASE WHEN t.status IN (1, 2, 3, 4) THEN 1 END) AS total_abertos,
      COUNT(CASE WHEN t.status IN (1, 2, 3, 4, 5) THEN 1 END) AS total
    FROM glpi_tickets t
    ${scope.joins}
    WHERE ${scope.where}
      AND t.status IN (1, 2, 3, 4, 5)
  `;

  const [rows] = await pool.execute<StatsRow[]>(statsSql, scope.params);
  const row = rows[0];

  return {
    novos: Number(row?.novos || 0),
    em_atendimento: Number(row?.em_atendimento || 0),
    pendentes: Number(row?.pendentes || 0),
    solucionados: Number(row?.solucionados || 0),
    solucionados_recentes: Number(row?.solucionados_recentes || 0),
    total_abertos: Number(row?.total_abertos || 0),
    total: Number(row?.total || 0),
  };
}

export async function listTickets(filters: ListTicketsFilters) {
  const pool = getDbPool();
  const scope = buildScopeSql(filters);

  const countSql = `
    SELECT COUNT(DISTINCT t.id) AS total
    FROM glpi_tickets t
    ${scope.joins}
    WHERE ${scope.where}
  `;

  const dataSql = `
    SELECT DISTINCT
      t.id,
      t.name,
      t.content,
      t.status,
      t.urgency,
      t.priority,
      t.date,
      t.date_mod,
      t.solvedate,
      t.closedate,
      COALESCE(req.full_name, 'N/A') AS requester,
      COALESCE(tech.full_name, 'N/A') AS technician,
      COALESCE(cat.completename, 'Sem categoria') AS category,
      COALESCE(ent.completename, ent.name, '') AS entity,
      COALESCE(grp.group_name, '') AS group_name
    FROM glpi_tickets t
    ${scope.joins}
    ${REQUESTER_SUBQUERY}
    ${TECHNICIAN_SUBQUERY}
    LEFT JOIN glpi_entities ent ON ent.id = t.entities_id
    ${GROUP_SUBQUERY}
    WHERE ${scope.where}
    ORDER BY t.date DESC, t.id DESC
    LIMIT ? OFFSET ?
  `;

  const [countRows, dataRows] = await Promise.all([
    pool.execute<CountRow[]>(countSql, scope.params),
    pool.execute<TicketResultRow[]>(dataSql, [...scope.params, filters.limit, filters.offset]),
  ]);

  const total = Number(countRows[0][0]?.total || 0);
  const data = dataRows[0].map((row) => mapTicketRow(row));

  return {
    total,
    limit: filters.limit,
    offset: filters.offset,
    data,
  };
}

export async function searchTickets(filters: SearchTicketsFilters) {
  const pool = getDbPool();
  const scope = buildScopeSql({
    department: filters.department,
    statusFilter: filters.statusFilter,
  });

  const whereConditions = [scope.where];
  const params: SqlParam[] = [...scope.params];

  if (/^\d+$/.test(filters.query)) {
    whereConditions.push("t.id = ?");
    params.push(Number(filters.query));
  } else {
    const terms = filters.query
      .split(" ")
      .map((term) => term.trim())
      .filter(Boolean);

    for (const term of terms) {
      whereConditions.push("(t.name LIKE ? OR t.content LIKE ? OR CAST(t.id AS CHAR) LIKE ?)");
      const wildcard = `%${term}%`;
      params.push(wildcard, wildcard, wildcard);
    }
  }

  const whereSql = whereConditions.join(" AND ");

  const countSql = `
    SELECT COUNT(DISTINCT t.id) AS total
    FROM glpi_tickets t
    ${scope.joins}
    WHERE ${whereSql}
  `;

  const dataSql = `
    SELECT DISTINCT
      t.id,
      t.name,
      t.content,
      t.status,
      t.urgency,
      t.priority,
      t.date,
      t.date_mod,
      t.solvedate,
      t.closedate,
      COALESCE(req.full_name, 'N/A') AS requester,
      COALESCE(tech.full_name, 'N/A') AS technician,
      COALESCE(cat.completename, 'Sem categoria') AS category,
      COALESCE(ent.completename, ent.name, '') AS entity,
      COALESCE(grp.group_name, '') AS group_name
    FROM glpi_tickets t
    ${scope.joins}
    ${REQUESTER_SUBQUERY}
    ${TECHNICIAN_SUBQUERY}
    LEFT JOIN glpi_entities ent ON ent.id = t.entities_id
    ${GROUP_SUBQUERY}
    WHERE ${whereSql}
    ORDER BY t.date_mod DESC, t.id DESC
    LIMIT ?
  `;

  const [countRows, dataRows] = await Promise.all([
    pool.execute<CountRow[]>(countSql, params),
    pool.execute<TicketResultRow[]>(dataSql, [...params, filters.limit]),
  ]);

  const total = Number(countRows[0][0]?.total || 0);
  const isNumericQuery = /^\d+$/.test(filters.query);
  const data = dataRows[0].map((row) => ({
    ...mapTicketRow(row),
    relevance: isNumericQuery ? 1 : 0,
  }));

  return {
    total,
    query: filters.query,
    data,
  };
}
