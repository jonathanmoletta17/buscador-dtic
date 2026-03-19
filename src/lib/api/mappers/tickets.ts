import { asIsoDateTimeString, toIsoDateTimeOrUndefined } from "@/lib/datetime/iso";

import type { TicketListItemDto, TicketListResponseDto, TicketSearchItemDto, TicketSearchResponseDto, TicketStatsDto } from "../contracts/tickets";
import type { FollowUp, TicketDetail, TicketStats, TicketSummary } from "../types";

type GlpiTicketDto = Record<string, unknown>;
type GlpiFollowupDto = Record<string, unknown>;

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function getNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function mapTicketStatsDto(dto: TicketStatsDto): TicketStats {
  return {
    new: dto.novos ?? 0,
    inProgress: dto.em_atendimento ?? 0,
    pending: dto.pendentes ?? 0,
    solved: dto.solucionados ?? 0,
    solvedRecent: dto.solucionados_recentes ?? 0,
    totalOpen: dto.total_abertos ?? 0,
    total: dto.total ?? 0,
  };
}

export function mapTicketSummaryDto(dto: TicketListItemDto | TicketSearchItemDto): TicketSummary {
  const entityName = "entity" in dto ? dto.entity : undefined;
  const groupName = "group" in dto ? dto.group : undefined;

  return {
    id: dto.id,
    title: stripHtml(dto.title || "Sem título"),
    content: stripHtml(dto.content || ""),
    category: dto.category || "Sem categoria",
    status: dto.status || "",
    statusId: dto.statusId || 0,
    urgency: dto.urgency || "",
    urgencyId: dto.urgencyId || 0,
    dateCreated: asIsoDateTimeString(dto.dateCreated),
    dateModified: asIsoDateTimeString(dto.dateModified),
    solveDate: toIsoDateTimeOrUndefined(dto.solveDate ?? undefined),
    closeDate: toIsoDateTimeOrUndefined(dto.closeDate ?? undefined),
    requester: dto.requester,
    technician: dto.technician,
    groupName,
    entityName,
    entity_name: entityName,
  };
}

export function mapTicketListResponseDto(dto: TicketListResponseDto): { total: number; tickets: TicketSummary[] } {
  return {
    total: dto.total || 0,
    tickets: dto.data.map(mapTicketSummaryDto),
  };
}

export function mapTicketSearchResponseDto(dto: TicketSearchResponseDto): { total: number; tickets: TicketSummary[] } {
  return {
    total: dto.total || 0,
    tickets: dto.data.map(mapTicketSummaryDto),
  };
}

export function mapGlpiTicketDetail(rawData: GlpiTicketDto, rawFollowupsData: unknown[]): {
  ticket: TicketDetail;
  followups: FollowUp[];
} {
  const statusId = getNumber(rawData.status, 1);
  const urgencyId = getNumber(rawData.urgency, 3);
  const entityName = getString(rawData.entities_id_completename) || getString(rawData.entities_id) || undefined;

  const ticket: TicketDetail = {
    id: getNumber(rawData.id),
    title: getString(rawData.name, "Sem título"),
    content: stripHtml(getString(rawData.content)),
    category: getString(rawData.itilcategories_id_completename) || getString(rawData.itilcategories_id, "Sem categoria"),
    status: getString(rawData.status_completename) || `Status ${statusId}`,
    statusId,
    urgency: getString(rawData.urgency_name) || `Urgência ${urgencyId}`,
    urgencyId,
    dateCreated: asIsoDateTimeString(getString(rawData.date)),
    dateModified: asIsoDateTimeString(getString(rawData.date_mod)),
    location: getString(rawData.locations_id_completename) || getString(rawData.locations_id) || undefined,
    entityName,
    entity_name: entityName,
    priority: getNumber(rawData.priority, 3),
    type: getNumber(rawData.type, 1),
    closeDate: toIsoDateTimeOrUndefined(getString(rawData.closedate) || undefined),
    solveDate: toIsoDateTimeOrUndefined(getString(rawData.solvedate) || undefined),
  };

  const followups: FollowUp[] = rawFollowupsData.map((item) => {
    const followup = item as GlpiFollowupDto;
    return {
      id: getNumber(followup.id),
      content: stripHtml(getString(followup.content)),
      dateCreated: asIsoDateTimeString(getString(followup.date) || getString(followup.date_creation)),
      userName: getString(followup.users_id_completename) || getString(followup.users_id, "Sistema"),
      isPrivate: Boolean(followup.is_private),
      isTech: false,
    };
  });

  return { ticket, followups };
}
