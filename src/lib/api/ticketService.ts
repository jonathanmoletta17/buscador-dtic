/**
 * ticketService - Camada de dados para tickets.
 *
 * CQRS:
 *   LEITURAS (listagens, stats) -> /db/stats, /db/tickets e /db/filter-options
 */

import { apiGet, buildApiPath } from "./client";
import type {
  TicketFilterOptions,
  TicketSearchDepth,
  TicketStats,
  TicketSummary,
  TicketUniverse,
} from "./types";
import type {
  TicketFilterOptionsResponseDto,
  TicketListResponseDto,
  TicketSearchResponseDto,
  TicketStatsDto,
} from "./contracts/tickets";
import {
  mapTicketFilterOptionsResponseDto,
  mapTicketListResponseDto,
  mapTicketSearchResponseDto,
  mapTicketStatsDto,
} from "./mappers/tickets";

interface TicketQueryOptions {
  groupId?: number | null;
  department?: string | null;
  universe?: TicketUniverse;
  status?: number[];
  requesterId?: number | null;
  technicianId?: number | null;
  requestTypeIds?: number[];
  entityIds?: number[];
  locationIds?: number[];
  categoryId?: number | null;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

function toCsv(values?: number[] | null): string | undefined {
  return values?.length ? values.join(",") : undefined;
}

function buildTicketQuery(options: TicketQueryOptions) {
  return {
    group_ids: options.groupId,
    department: options.department,
    universe: options.universe,
    status: toCsv(options.status),
    requester_id: options.requesterId,
    technician_id: options.technicianId,
    requesttypes_id: toCsv(options.requestTypeIds),
    entities_id: toCsv(options.entityIds),
    locations_id: toCsv(options.locationIds),
    category_id: options.categoryId,
    date_from: options.dateFrom,
    date_to: options.dateTo,
    limit: options.limit,
    offset: options.offset,
  };
}

export async function fetchStats(
  context: string,
  options: Omit<TicketQueryOptions, "status" | "requesterId" | "limit" | "offset"> = {},
): Promise<TicketStats> {
  const data = await apiGet<TicketStatsDto>(
    buildApiPath(context, "db/stats"),
    {
      group_ids: options.groupId,
      department: options.department,
      universe: options.universe,
      technician_id: options.technicianId,
      requesttypes_id: toCsv(options.requestTypeIds),
      entities_id: toCsv(options.entityIds),
      locations_id: toCsv(options.locationIds),
      category_id: options.categoryId,
      date_from: options.dateFrom,
      date_to: options.dateTo,
    },
    { signal: options.signal },
  );

  return mapTicketStatsDto(data);
}

export async function fetchTicketFilterOptions(context: string): Promise<TicketFilterOptions> {
  const data = await apiGet<TicketFilterOptionsResponseDto>(buildApiPath(context, "db/filter-options"));
  return mapTicketFilterOptionsResponseDto(data);
}

export async function fetchTickets(
  context: string,
  options: TicketQueryOptions = {},
): Promise<{ total: number; tickets: TicketSummary[] }> {
  const result = await apiGet<TicketListResponseDto>(
    buildApiPath(context, "db/tickets"),
    buildTicketQuery(options),
    { signal: options.signal },
  );
  return mapTicketListResponseDto(result);
}

export async function fetchMyTickets(
  context: string,
  userId: number,
  options: {
    universe?: TicketUniverse;
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
      universe: options.universe,
      dateFrom: options.dateFrom,
      dateTo: options.dateTo,
      limit: pageSize,
      offset,
    });

    if (page === 0) total = result.total;
    if (result.tickets.length === 0) break;

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

export async function searchTicketsDirect(
  context: string,
  query: string,
  options: Omit<TicketQueryOptions, "requesterId" | "limit" | "offset"> & {
    depth?: TicketSearchDepth;
    limit?: number;
  } = {},
): Promise<{ total: number; tickets: TicketSummary[] }> {
  const result = await apiGet<TicketSearchResponseDto>(
    buildApiPath(context, "tickets/search"),
    {
      q: query,
      group_ids: options.groupId,
      department: options.department,
      universe: options.universe,
      depth: options.depth,
      status: toCsv(options.status),
      technician_id: options.technicianId,
      requesttypes_id: toCsv(options.requestTypeIds),
      entities_id: toCsv(options.entityIds),
      locations_id: toCsv(options.locationIds),
      category_id: options.categoryId,
      date_from: options.dateFrom,
      date_to: options.dateTo,
      limit: options.limit,
    },
    { signal: options.signal },
  );
  return mapTicketSearchResponseDto(result);
}
