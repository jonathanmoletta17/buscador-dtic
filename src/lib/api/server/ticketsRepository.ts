import "server-only";

import type { RowDataPacket } from "mysql2/promise";

import type { TicketSearchDepth, TicketUniverse } from "@/lib/api/types";

import { getAppDbConfig } from "./config";
import { getDbPool } from "./db";
import {
  cleanHtml,
  serializeDateTime,
  statusLabelFromId,
  urgencyLabelFromId,
} from "./serialization";

interface TicketScopeFilters {
  groupIds?: number[];
  department?: string;
  universe?: TicketUniverse;
  statusFilter?: number[];
  requesterId?: number;
  technicianId?: number;
  requestTypeIds?: number[];
  entityIds?: number[];
  locationIds?: number[];
  categoryId?: number;
  dateFrom?: string;
  dateTo?: string;
}

type TicketStatsFilters = TicketScopeFilters;

interface ListTicketsFilters extends TicketScopeFilters {
  limit: number;
  offset: number;
}

interface SearchTicketsFilters extends TicketScopeFilters {
  query: string;
  depth?: TicketSearchDepth;
  limit: number;
}

interface TicketFilterOptionRow extends RowDataPacket {
  id: number | null;
  label: string | null;
  total: number;
}

type SqlParam = string | number;

interface CategoryTreeRow extends RowDataPacket {
  id: number;
}

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
  requester_id: number | null;
  technician: string | null;
  technician_id: number | null;
  category: string | null;
  category_id: number | null;
  entity: string | null;
  entity_id: number | null;
  group_name: string | null;
  group_id: number | null;
  request_type: string | null;
  requesttypes_id: number | null;
  location: string | null;
  location_id: number | null;
  title_match_text: string | null;
  content_match_text: string | null;
  followup_match_text: string | null;
  task_match_text: string | null;
  solution_match_text: string | null;
}

interface CountRow extends RowDataPacket {
  total: number;
}

interface StatsRow extends RowDataPacket {
  novos: number;
  em_atendimento: number;
  pendentes: number;
  solucionados: number;
  fechados: number;
  solucionados_recentes: number;
  total_abertos: number;
  total: number;
}

interface ScopeSql {
  joins: string;
  where: string;
  params: SqlParam[];
  universe: TicketUniverse;
}

const ACTIVE_UNIVERSE_STATUSES = [1, 2, 3, 4, 5] as const;
const DEPARTMENT_GROUP_MAP: Record<string, number> = {
  manutencao: 22,
  conservacao: 21,
};

const REQUESTER_SUBQUERY = `
LEFT JOIN (
  SELECT
    tu.tickets_id,
    MIN(u.id) AS requester_id,
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
    MIN(u.id) AS technician_id,
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
    MIN(gt.groups_id) AS group_id,
    MIN(COALESCE(g.completename, g.name)) AS group_name
  FROM glpi_groups_tickets gt
  JOIN glpi_groups g
    ON g.id = gt.groups_id
  WHERE gt.type = 2
  GROUP BY gt.tickets_id
) grp ON grp.tickets_id = t.id
`;

const categoryTreeCache = new Map<number, Promise<number[]>>();

function placeholders(values: readonly unknown[]): string {
  return values.map(() => "?").join(", ");
}

function toDateStart(value: string): string {
  return `${value} 00:00:00`;
}

function toDateEnd(value: string): string {
  return `${value} 23:59:59`;
}

function toPositiveInteger(value: number | null | undefined): number | undefined {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : undefined;
}

function resolveUniverse(universe?: TicketUniverse): TicketUniverse {
  return universe === "historical" ? "historical" : "active";
}

function resolveDepth(depth?: TicketSearchDepth): TicketSearchDepth {
  return depth === "expanded" ? "expanded" : "basic";
}

function normalizeForMatch(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function findNormalizedIndex(text: string, query: string): number {
  const normalizedQuery = normalizeForMatch(query).trim();
  if (!normalizedQuery) {
    return -1;
  }

  const originalChars = Array.from(text);
  let normalizedText = "";
  const indexMap: number[] = [];

  originalChars.forEach((char, index) => {
    const normalizedChar = normalizeForMatch(char);
    normalizedText += normalizedChar;
    for (let cursor = 0; cursor < normalizedChar.length; cursor += 1) {
      indexMap.push(index);
    }
  });

  const normalizedIndex = normalizedText.indexOf(normalizedQuery);
  if (normalizedIndex === -1) {
    return -1;
  }

  return indexMap[normalizedIndex] ?? -1;
}

function createMatchExcerpt(sourceText: string, representativeTerm: string): string | undefined {
  const cleanedText = cleanHtml(sourceText || "");
  if (!cleanedText) {
    return undefined;
  }

  const maxLength = 180;
  const matchIndex = findNormalizedIndex(cleanedText, representativeTerm);

  if (matchIndex === -1) {
    return cleanedText.length <= maxLength ? cleanedText : `${cleanedText.slice(0, maxLength - 3).trim()}...`;
  }

  const excerptRadius = 72;
  const start = Math.max(matchIndex - excerptRadius, 0);
  const end = Math.min(matchIndex + representativeTerm.length + excerptRadius, cleanedText.length);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < cleanedText.length ? "..." : "";

  return `${prefix}${cleanedText.slice(start, end).trim()}${suffix}`;
}

function buildSearchTerms(query: string): string[] {
  return query
    .split(" ")
    .map((term) => term.trim())
    .filter(Boolean);
}

async function getCategoryTreeIds(rootId: number): Promise<number[]> {
  const cachedIds = categoryTreeCache.get(rootId);
  if (cachedIds) {
    return cachedIds;
  }

  const loadIdsPromise = (async () => {
    const pool = getDbPool();
    const [rows] = await pool.execute<CategoryTreeRow[]>(
      `
        WITH RECURSIVE category_tree AS (
          SELECT id
          FROM glpi_itilcategories
          WHERE id = ?

          UNION DISTINCT

          SELECT child.id
          FROM glpi_itilcategories child
          INNER JOIN category_tree parent
            ON child.itilcategories_id = parent.id
        )
        SELECT id
        FROM category_tree
        ORDER BY id
      `,
      [rootId],
    );

    const categoryIds = rows
      .map((row) => Number(row.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (categoryIds.length === 0) {
      throw new Error(`APP_CATEGORY_ROOT_ID=${rootId} did not resolve any GLPI categories.`);
    }

    return categoryIds;
  })();

  categoryTreeCache.set(rootId, loadIdsPromise);

  try {
    return await loadIdsPromise;
  } catch (error) {
    categoryTreeCache.delete(rootId);
    throw error;
  }
}

function resolveScopedGroupIds(groupIds?: number[], department?: string): number[] | undefined {
  if (groupIds?.length) return groupIds;
  const appDbConfig = getAppDbConfig();
  if (!department || appDbConfig.categoryFilter || appDbConfig.categoryRootId) return undefined;

  const mapped = DEPARTMENT_GROUP_MAP[department.trim().toLowerCase()];
  return mapped ? [mapped] : undefined;
}

async function buildScopeSql(filters: TicketScopeFilters): Promise<ScopeSql> {
  const joins: string[] = [
    "LEFT JOIN glpi_itilcategories cat ON t.itilcategories_id = cat.id",
  ];
  const where: string[] = ["t.is_deleted = 0", "t.entities_id != 0"];
  const params: SqlParam[] = [];
  const universe = resolveUniverse(filters.universe);

  const appDbConfig = getAppDbConfig();

  if (appDbConfig.categoryRootId) {
    const categoryIds = await getCategoryTreeIds(appDbConfig.categoryRootId);
    where.push(`t.itilcategories_id IN (${placeholders(categoryIds)})`);
    params.push(...categoryIds);
  } else if (appDbConfig.categoryFilter) {
    where.push("cat.completename LIKE ?");
    params.push(`%${appDbConfig.categoryFilter}%`);
  }

  if (universe === "active") {
    where.push(`t.status IN (${placeholders(ACTIVE_UNIVERSE_STATUSES)})`);
    params.push(...ACTIVE_UNIVERSE_STATUSES);
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

  if (filters.technicianId) {
    joins.push("JOIN glpi_tickets_users ttu ON ttu.tickets_id = t.id AND ttu.type = 2");
    where.push("ttu.users_id = ?");
    params.push(filters.technicianId);
  }

  if (filters.requestTypeIds?.length) {
    where.push(`t.requesttypes_id IN (${placeholders(filters.requestTypeIds)})`);
    params.push(...filters.requestTypeIds);
  }

  if (filters.entityIds?.length) {
    where.push(`t.entities_id IN (${placeholders(filters.entityIds)})`);
    params.push(...filters.entityIds);
  }

  if (filters.locationIds?.length) {
    where.push(`t.locations_id IN (${placeholders(filters.locationIds)})`);
    params.push(...filters.locationIds);
  }

  if (filters.categoryId) {
    where.push("t.itilcategories_id = ?");
    params.push(filters.categoryId);
  }

  if (filters.dateFrom) {
    where.push("t.date >= ?");
    params.push(toDateStart(filters.dateFrom));
  }

  if (filters.dateTo) {
    where.push("t.date <= ?");
    params.push(toDateEnd(filters.dateTo));
  }

  return {
    joins: joins.join("\n"),
    where: where.join(" AND "),
    params,
    universe,
  };
}

function mapFilterOptionRows(rows: TicketFilterOptionRow[]) {
  return rows
    .map((row) => ({
      id: Number(row.id || 0),
      label: (row.label || "").trim(),
      total: Number(row.total || 0),
    }))
    .filter((row) => row.id > 0 && row.label)
    .sort((left, right) => right.total - left.total || left.label.localeCompare(right.label, "pt-BR"));
}

function mapTicketRow(
  row: TicketResultRow,
  options?: { depth?: TicketSearchDepth; representativeTerm?: string; numericQuery?: boolean },
) {
  const statusId = Number(row.status || 0);
  const urgencyId = Number(row.urgency || 0);
  const representativeTerm = options?.representativeTerm?.trim() || "";
  const depth = resolveDepth(options?.depth);
  const numericQuery = Boolean(options?.numericQuery);

  let matchSource: "title" | "content" | "followup" | "task" | "solution" | undefined;
  let matchExcerpt: string | undefined;

  if (depth === "expanded" && !numericQuery && representativeTerm) {
    const candidates: Array<{
      source: "title" | "content" | "followup" | "task" | "solution";
      text: string | null;
    }> = [
      { source: "title", text: row.title_match_text },
      { source: "content", text: row.content_match_text },
      { source: "followup", text: row.followup_match_text },
      { source: "task", text: row.task_match_text },
      { source: "solution", text: row.solution_match_text },
    ];

    const resolvedCandidate = candidates.find((candidate) => candidate.text && cleanHtml(candidate.text));
    if (resolvedCandidate) {
      matchSource = resolvedCandidate.source;
      matchExcerpt = createMatchExcerpt(resolvedCandidate.text || "", representativeTerm);
    }
  }

  return {
    id: Number(row.id),
    title: cleanHtml(row.name || "Sem titulo"),
    content: cleanHtml(row.content || ""),
    category: row.category || "Sem categoria",
    categoryId: toPositiveInteger(row.category_id),
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
    entity: row.entity || "",
    entityId: toPositiveInteger(row.entity_id),
    group: row.group_name || "",
    requestType: row.request_type || "Sem tipo",
    requestTypeId: toPositiveInteger(row.requesttypes_id),
    location: row.location || "Sem local",
    locationId: toPositiveInteger(row.location_id),
    matchSource,
    matchExcerpt,
  };
}

function buildBaseTicketSelect(matchSelectSql = "") {
  return `
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
      req.requester_id,
      COALESCE(tech.full_name, 'N/A') AS technician,
      tech.technician_id,
      COALESCE(cat.completename, 'Sem categoria') AS category,
      t.itilcategories_id AS category_id,
      COALESCE(ent.completename, ent.name, '') AS entity,
      ent.id AS entity_id,
      COALESCE(grp.group_name, '') AS group_name,
      grp.group_id,
      COALESCE(rt.name, 'Sem tipo') AS request_type,
      t.requesttypes_id,
      COALESCE(loc.completename, loc.name, 'Sem local') AS location,
      loc.id AS location_id
      ${matchSelectSql}
    FROM glpi_tickets t
  `;
}

function buildRepresentativeMatchSelect(representativeWildcard?: string): { sql: string; params: SqlParam[] } {
  if (!representativeWildcard) {
    return {
      sql: `,
      NULL AS title_match_text,
      NULL AS content_match_text,
      NULL AS followup_match_text,
      NULL AS task_match_text,
      NULL AS solution_match_text`,
      params: [],
    };
  }

  return {
    sql: `,
      CASE WHEN t.name LIKE ? THEN t.name ELSE NULL END AS title_match_text,
      CASE WHEN t.content LIKE ? THEN t.content ELSE NULL END AS content_match_text,
      (
        SELECT f.content
        FROM glpi_itilfollowups f
        WHERE f.itemtype = 'Ticket'
          AND f.items_id = t.id
          AND f.content LIKE ?
        ORDER BY COALESCE(f.date, f.date_creation) DESC, f.id DESC
        LIMIT 1
      ) AS followup_match_text,
      (
        SELECT tt.content
        FROM glpi_tickettasks tt
        WHERE tt.tickets_id = t.id
          AND tt.content LIKE ?
        ORDER BY COALESCE(tt.date, tt.date_creation) DESC, tt.id DESC
        LIMIT 1
      ) AS task_match_text,
      (
        SELECT s.content
        FROM glpi_itilsolutions s
        WHERE s.itemtype = 'Ticket'
          AND s.items_id = t.id
          AND s.content LIKE ?
        ORDER BY COALESCE(s.date_mod, s.date_creation) DESC, s.id DESC
        LIMIT 1
      ) AS solution_match_text`,
      params: [
        representativeWildcard,
        representativeWildcard,
        representativeWildcard,
        representativeWildcard,
        representativeWildcard,
      ],
    };
}

export async function getTicketFilterOptions() {
  const pool = getDbPool();
  const scope = await buildScopeSql({ universe: "historical" });

  const [requestTypeRows, entityRows, categoryRows, locationRows, groupRows, technicianRows] = await Promise.all([
    pool.execute<TicketFilterOptionRow[]>(
      `
        SELECT
          t.requesttypes_id AS id,
          COALESCE(rt.name, 'Sem tipo') AS label,
          COUNT(DISTINCT t.id) AS total
        FROM glpi_tickets t
        ${scope.joins}
        LEFT JOIN glpi_requesttypes rt ON rt.id = t.requesttypes_id
        WHERE ${scope.where}
          AND t.requesttypes_id IS NOT NULL
          AND t.requesttypes_id != 0
        GROUP BY t.requesttypes_id, label
      `,
      scope.params,
    ),
    pool.execute<TicketFilterOptionRow[]>(
      `
        SELECT
          ent.id AS id,
          COALESCE(ent.completename, ent.name, CONCAT('#', ent.id)) AS label,
          COUNT(DISTINCT t.id) AS total
        FROM glpi_tickets t
        ${scope.joins}
        LEFT JOIN glpi_entities ent ON ent.id = t.entities_id
        WHERE ${scope.where}
          AND t.entities_id IS NOT NULL
          AND t.entities_id != 0
        GROUP BY ent.id, label
      `,
      scope.params,
    ),
    pool.execute<TicketFilterOptionRow[]>(
      `
        SELECT
          cat_opt.id AS id,
          COALESCE(cat_opt.completename, cat_opt.name, CONCAT('#', cat_opt.id)) AS label,
          COUNT(DISTINCT t.id) AS total
        FROM glpi_tickets t
        ${scope.joins}
        LEFT JOIN glpi_itilcategories cat_opt ON cat_opt.id = t.itilcategories_id
        WHERE ${scope.where}
          AND t.itilcategories_id IS NOT NULL
          AND t.itilcategories_id != 0
        GROUP BY cat_opt.id, label
      `,
      scope.params,
    ),
    pool.execute<TicketFilterOptionRow[]>(
      `
        SELECT
          loc.id AS id,
          COALESCE(loc.completename, loc.name, CONCAT('#', loc.id)) AS label,
          COUNT(DISTINCT t.id) AS total
        FROM glpi_tickets t
        ${scope.joins}
        LEFT JOIN glpi_locations loc ON loc.id = t.locations_id
        WHERE ${scope.where}
          AND t.locations_id IS NOT NULL
          AND t.locations_id != 0
        GROUP BY loc.id, label
      `,
      scope.params,
    ),
    pool.execute<TicketFilterOptionRow[]>(
      `
        SELECT
          gt.groups_id AS id,
          COALESCE(g.completename, g.name, CONCAT('#', gt.groups_id)) AS label,
          COUNT(DISTINCT t.id) AS total
        FROM glpi_tickets t
        ${scope.joins}
        JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2
        LEFT JOIN glpi_groups g ON g.id = gt.groups_id
        WHERE ${scope.where}
        GROUP BY gt.groups_id, label
      `,
      scope.params,
    ),
    pool.execute<TicketFilterOptionRow[]>(
      `
        SELECT
          u.id AS id,
          COALESCE(CONCAT_WS(' ', NULLIF(u.firstname, ''), NULLIF(u.realname, '')), u.name, CONCAT('#', u.id)) AS label,
          COUNT(DISTINCT t.id) AS total
        FROM glpi_tickets t
        ${scope.joins}
        JOIN glpi_tickets_users tu ON tu.tickets_id = t.id AND tu.type = 2
        JOIN glpi_users u ON u.id = tu.users_id
        WHERE ${scope.where}
        GROUP BY u.id, label
      `,
      scope.params,
    ),
  ]);

  return {
    requestTypes: mapFilterOptionRows(requestTypeRows[0]),
    entities: mapFilterOptionRows(entityRows[0]),
    categories: mapFilterOptionRows(categoryRows[0]),
    locations: mapFilterOptionRows(locationRows[0]),
    groups: mapFilterOptionRows(groupRows[0]),
    technicians: mapFilterOptionRows(technicianRows[0]),
  };
}

export async function getTicketStats(filters: TicketStatsFilters) {
  const pool = getDbPool();
  const scope = await buildScopeSql(filters);

  const statsSql = `
    SELECT
      COUNT(DISTINCT CASE WHEN t.status = 1 THEN t.id END) AS novos,
      COUNT(DISTINCT CASE WHEN t.status IN (2, 3) THEN t.id END) AS em_atendimento,
      COUNT(DISTINCT CASE WHEN t.status = 4 THEN t.id END) AS pendentes,
      COUNT(DISTINCT CASE WHEN t.status = 5 THEN t.id END) AS solucionados,
      COUNT(DISTINCT CASE WHEN t.status = 6 THEN t.id END) AS fechados,
      COUNT(DISTINCT CASE WHEN t.status = 5 AND t.solvedate >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN t.id END) AS solucionados_recentes,
      COUNT(DISTINCT CASE WHEN t.status IN (1, 2, 3, 4) THEN t.id END) AS total_abertos,
      COUNT(DISTINCT t.id) AS total
    FROM glpi_tickets t
    ${scope.joins}
    WHERE ${scope.where}
  `;

  const [rows] = await pool.execute<StatsRow[]>(statsSql, scope.params);
  const row = rows[0];

  return {
    novos: Number(row?.novos || 0),
    em_atendimento: Number(row?.em_atendimento || 0),
    pendentes: Number(row?.pendentes || 0),
    solucionados: Number(row?.solucionados || 0),
    fechados: Number(row?.fechados || 0),
    solucionados_recentes: Number(row?.solucionados_recentes || 0),
    total_abertos: Number(row?.total_abertos || 0),
    total: Number(row?.total || 0),
  };
}

export async function listTickets(filters: ListTicketsFilters) {
  const pool = getDbPool();
  const scope = await buildScopeSql(filters);

  const countSql = `
    SELECT COUNT(DISTINCT t.id) AS total
    FROM glpi_tickets t
    ${scope.joins}
    WHERE ${scope.where}
  `;

  const dataSql = `
    ${buildBaseTicketSelect()}
    ${scope.joins}
    ${REQUESTER_SUBQUERY}
    ${TECHNICIAN_SUBQUERY}
    LEFT JOIN glpi_entities ent ON ent.id = t.entities_id
    ${GROUP_SUBQUERY}
    LEFT JOIN glpi_requesttypes rt ON rt.id = t.requesttypes_id
    LEFT JOIN glpi_locations loc ON loc.id = t.locations_id
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
  const depth = resolveDepth(filters.depth);
  const scope = await buildScopeSql(filters);
  const whereConditions = [scope.where];
  const params: SqlParam[] = [...scope.params];
  const numericQuery = /^\d+$/.test(filters.query);
  const terms = buildSearchTerms(filters.query);
  const representativeTerm = terms[0] ?? filters.query.trim();
  const representativeWildcard = representativeTerm ? `%${representativeTerm}%` : undefined;

  if (numericQuery) {
    whereConditions.push("t.id = ?");
    params.push(Number(filters.query));
  } else {
    for (const term of terms) {
      const wildcard = `%${term}%`;
      if (depth === "expanded") {
        whereConditions.push(`(
          t.name LIKE ?
          OR t.content LIKE ?
          OR CAST(t.id AS CHAR) LIKE ?
          OR EXISTS (
            SELECT 1
            FROM glpi_itilfollowups f
            WHERE f.itemtype = 'Ticket'
              AND f.items_id = t.id
              AND f.content LIKE ?
          )
          OR EXISTS (
            SELECT 1
            FROM glpi_tickettasks tt
            WHERE tt.tickets_id = t.id
              AND tt.content LIKE ?
          )
          OR EXISTS (
            SELECT 1
            FROM glpi_itilsolutions s
            WHERE s.itemtype = 'Ticket'
              AND s.items_id = t.id
              AND s.content LIKE ?
          )
        )`);
        params.push(wildcard, wildcard, wildcard, wildcard, wildcard, wildcard);
      } else {
        whereConditions.push("(t.name LIKE ? OR t.content LIKE ? OR CAST(t.id AS CHAR) LIKE ?)");
        params.push(wildcard, wildcard, wildcard);
      }
    }
  }

  const whereSql = whereConditions.join(" AND ");
  const matchSelect = depth === "expanded" && !numericQuery
    ? buildRepresentativeMatchSelect(representativeWildcard)
    : buildRepresentativeMatchSelect(undefined);

  const countSql = `
    SELECT COUNT(DISTINCT t.id) AS total
    FROM glpi_tickets t
    ${scope.joins}
    WHERE ${whereSql}
  `;

  const dataSql = `
    ${buildBaseTicketSelect(matchSelect.sql)}
    ${scope.joins}
    ${REQUESTER_SUBQUERY}
    ${TECHNICIAN_SUBQUERY}
    LEFT JOIN glpi_entities ent ON ent.id = t.entities_id
    ${GROUP_SUBQUERY}
    LEFT JOIN glpi_requesttypes rt ON rt.id = t.requesttypes_id
    LEFT JOIN glpi_locations loc ON loc.id = t.locations_id
    WHERE ${whereSql}
    ORDER BY t.date_mod DESC, t.id DESC
    LIMIT ?
  `;

  const [countRows, dataRows] = await Promise.all([
    pool.execute<CountRow[]>(countSql, params),
    pool.execute<TicketResultRow[]>(dataSql, [...matchSelect.params, ...params, filters.limit]),
  ]);

  const total = Number(countRows[0][0]?.total || 0);
  const data = dataRows[0].map((row) => ({
    ...mapTicketRow(row, {
      depth,
      representativeTerm,
      numericQuery,
    }),
    relevance: numericQuery ? 100 : 0,
  }));

  return {
    total,
    query: filters.query,
    data,
  };
}
