import type { IsoDateTimeString } from "@/lib/datetime/iso";

export type TicketUniverseDto = "active" | "historical";
export type TicketSearchDepthDto = "basic" | "expanded";
export type TicketMatchSourceDto = "title" | "content" | "followup" | "task" | "solution";

export interface TicketStatsDto {
  novos?: number;
  em_atendimento?: number;
  pendentes?: number;
  solucionados?: number;
  fechados?: number;
  solucionados_recentes?: number;
  total_abertos?: number;
  total?: number;
}

export interface TicketListItemDto {
  id: number;
  title: string;
  content: string;
  categoryId?: number;
  statusId: number;
  status: string;
  urgencyId: number;
  urgency: string;
  priority: number;
  dateCreated: IsoDateTimeString;
  dateModified: IsoDateTimeString;
  solveDate?: IsoDateTimeString | null;
  closeDate?: IsoDateTimeString | null;
  requester?: string;
  technician?: string;
  category: string;
  entity?: string;
  entityId?: number;
  group?: string;
  requestType?: string;
  requestTypeId?: number;
  location?: string;
  locationId?: number;
}

export interface TicketListResponseDto {
  total: number;
  limit: number;
  offset: number;
  context: string;
  data: TicketListItemDto[];
}

export interface TicketSearchItemDto extends TicketListItemDto {
  relevance: number;
  matchSource?: TicketMatchSourceDto;
  matchExcerpt?: string;
}

export interface TicketSearchResponseDto {
  total: number;
  query: string;
  context: string;
  department?: string | null;
  data: TicketSearchItemDto[];
}

export interface TicketFilterOptionDto {
  id: number;
  label: string;
  total: number;
}

export interface TicketFilterOptionsResponseDto {
  requestTypes: TicketFilterOptionDto[];
  entities: TicketFilterOptionDto[];
  categories: TicketFilterOptionDto[];
  locations: TicketFilterOptionDto[];
  groups: TicketFilterOptionDto[];
  technicians: TicketFilterOptionDto[];
}
