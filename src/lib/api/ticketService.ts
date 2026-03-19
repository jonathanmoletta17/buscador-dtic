/**
 * ticketService — Camada de dados para tickets.
 *
 * CQRS:
 *   LEITURAS (listagens, stats) → /db/stats, /db/tickets (SQL direto)
 */

import { apiGet, buildApiPath } from './client';
import type { TicketSummary, TicketStats } from "./types";
import type { TicketListResponseDto, TicketSearchResponseDto, TicketStatsDto } from "./contracts/tickets";
import {
  mapTicketListResponseDto,
  mapTicketSearchResponseDto,
  mapTicketStatsDto,
} from "./mappers/tickets";

// ────────────────────────────────────────────────────────────────────────
// CQRS: LEITURAS via /db (SQL direto)
// ────────────────────────────────────────────────────────────────────────

/**
 * Busca contagens reais de tickets por status via SQL.
 * Substitui o antigo computeStats() que contava apenas 50 tickets.
 */
export async function fetchStats(
  context: string,
  groupId?: number | null,
  department?: string | null
): Promise<TicketStats> {
  const data = await apiGet<TicketStatsDto>(buildApiPath(context, "db/stats"), {
    group_ids: groupId,
    department,
  });

  return mapTicketStatsDto(data);
}

/**
 * Busca tickets com JOINs reais (requester, technician, category).
 * Substitui fetchTicketsByGroup/fetchAllTickets que usavam Search API.
 */
export async function fetchTickets(
  context: string,
  options: {
    groupId?: number | null;
    department?: string | null;
    status?: number[];
    requesterId?: number | null;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ total: number; tickets: TicketSummary[] }> {
  const result = await apiGet<TicketListResponseDto>(
    buildApiPath(context, "db/tickets"),
    {
      group_ids: options.groupId,
      department: options.department,
      status: options.status?.length ? options.status.join(",") : undefined,
      requester_id: options.requesterId,
      date_from: options.dateFrom,
      date_to: options.dateTo,
      limit: options.limit,
      offset: options.offset,
    },
  );
  return mapTicketListResponseDto(result);
}

/**
 * Busca os tickets abertos do usuário logado diretamente via DB SQL
 */
export async function fetchMyTickets(
  context: string,
  userId: number,
  options: {
    dateFrom?: string;
    dateTo?: string;
    pageSize?: number;
    maxPages?: number;
  } = {},
): Promise<{ total: number; tickets: TicketSummary[] }> {
  const pageSize = Math.min(Math.max(options.pageSize ?? 200, 1), 500);
  const maxPages = Math.max(options.maxPages ?? 20, 1);

  let total = 0;
  let offset = 0;
  const allTickets: TicketSummary[] = [];
  const seen = new Set<number>();

  for (let page = 0; page < maxPages; page += 1) {
    const result = await fetchTickets(context, {
      requesterId: userId,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      limit: pageSize,
      offset,
    });

    if (page === 0) total = result.total;

    if (result.tickets.length === 0) {
      break;
    }

    for (const ticket of result.tickets) {
      if (seen.has(ticket.id)) continue;
      seen.add(ticket.id);
      allTickets.push(ticket);
    }

    offset += result.tickets.length;
    if (offset >= total) break;
  }

  return { total, tickets: allTickets };
}

/**
 * Busca direta no banco (SQL) via novo endpoint de busca do tensor-aurora.
 * Suporta busca por texto (MATCH AGAINST/LIKE) e por ID.
 */
export async function searchTicketsDirect(
  context: string,
  query: string,
  options: {
    department?: string | null;
    status?: number[];
    limit?: number;
  } = {}
): Promise<{ total: number; tickets: TicketSummary[] }> {
  const result = await apiGet<TicketSearchResponseDto>(
    buildApiPath(context, "tickets/search"),
    {
      q: query,
      department: options.department,
      status: options.status?.length ? options.status.join(",") : undefined,
      limit: options.limit,
    },
  );
  return mapTicketSearchResponseDto(result);
}
