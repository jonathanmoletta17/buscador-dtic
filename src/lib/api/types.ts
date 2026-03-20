/**
 * Tipos compartilhados para dados do GLPI.
 */

import type { IsoDateTimeString } from "@/lib/datetime/iso";

export type TicketUniverse = "active" | "historical";
export type TicketSearchDepth = "basic" | "expanded";
export type TicketMatchSource = "title" | "content" | "followup" | "task" | "solution";

// Status GLPI -> labels legiveis
export const TICKET_STATUS_MAP: Record<number, string> = {
  1: "Novo",
  2: "Em Atendimento",
  3: "Planejado",
  4: "Pendente",
  5: "Solucionado",
  6: "Fechado",
};

export const TICKET_URGENCY_MAP: Record<number, string> = {
  1: "Muito Baixa",
  2: "Baixa",
  3: "Media",
  4: "Alta",
  5: "Muito Alta",
};

// Modelo normalizado de ticket (o que o frontend consome)
export interface TicketSummary {
  id: number;
  title: string;
  content: string;
  category: string;
  categoryId?: number;
  status: string;
  statusId: number;
  urgency: string;
  urgencyId: number;
  dateCreated: IsoDateTimeString;
  dateModified: IsoDateTimeString;
  solveDate?: IsoDateTimeString;
  closeDate?: IsoDateTimeString;
  requester?: string;
  technician?: string;
  groupName?: string;
  requestType?: string;
  requestTypeId?: number;
  entityName?: string;
  entityId?: number;
  entity_name?: string;
  location?: string;
  locationId?: number;
  matchSource?: TicketMatchSource;
  matchExcerpt?: string;
  slaTime?: string;
}

export interface TicketDetail extends TicketSummary {
  location?: string;
  priority: number;
  type: number; // 1=Incident, 2=Request
}

export interface FollowUp {
  id: number;
  content: string;
  dateCreated: IsoDateTimeString;
  userName: string;
  isPrivate: boolean;
  isTech: boolean;
}

export interface TicketStats {
  new: number;
  inProgress: number;     // status 2 + 3 (Em Atendimento + Planejado)
  pending: number;
  solved: number;
  closed: number;
  solvedRecent: number;   // ultimos 30 dias
  total: number;
  totalOpen: number;      // tickets abertos (1-4)
}

export interface TicketFilterOption {
  id: number;
  label: string;
  total: number;
}

export interface TicketFilterOptions {
  requestTypes: TicketFilterOption[];
  entities: TicketFilterOption[];
  categories: TicketFilterOption[];
  locations: TicketFilterOption[];
  groups: TicketFilterOption[];
  technicians: TicketFilterOption[];
}

// Resposta bruta do GLPI Search API (campo IDs)
// Field IDs para Ticket:
// 1 = name, 2 = id, 4 = requester, 5 = technician
// 7 = category, 8 = assigned group, 10 = urgency
// 12 = status, 15 = date, 19 = date_mod
// 21 = content
export const TICKET_SEARCH_FIELDS = {
  ID: 2,
  NAME: 1,
  STATUS: 12,
  DATE: 15,
  DATE_MOD: 19,
  CATEGORY: 7,
  URGENCY: 10,
  REQUESTER: 4,
  TECHNICIAN: 5,
  ASSIGNED_GROUP: 8,
  CONTENT: 21,
} as const;
