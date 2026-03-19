import type { IsoDateTimeString } from "@/lib/datetime/iso";

export interface TicketStatsDto {
  novos?: number;
  em_atendimento?: number;
  pendentes?: number;
  solucionados?: number;
  solucionados_recentes?: number;
  total_abertos?: number;
  total?: number;
}

export interface TicketListItemDto {
  id: number;
  title: string;
  content: string;
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
}

export interface TicketListResponseDto {
  total: number;
  limit: number;
  offset: number;
  context: string;
  data: TicketListItemDto[];
}

export interface TicketSearchItemDto extends TicketListItemDto {
  entity?: string;
  group?: string;
  relevance: number;
}

export interface TicketSearchResponseDto {
  total: number;
  query: string;
  context: string;
  department?: string | null;
  data: TicketSearchItemDto[];
}
