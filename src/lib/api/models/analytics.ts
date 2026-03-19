import type { IsoDateTimeString } from "@/lib/datetime/iso";

export interface AnalyticsFilters {
  dateFrom: string;
  dateTo: string;
  department?: string | null;
  groupIds: number[];
}

export interface AnalyticsSummary {
  novos: number;
  emAtendimento: number;
  pendentes: number;
  resolvidosPeriodo: number;
  backlogAberto: number;
  totalPeriodo: number;
}

export interface AnalyticsTrendPoint {
  date: string;
  novos: number;
  emAtendimento: number;
  pendentes: number;
  resolvidos: number;
  totalCriados: number;
}

export interface AnalyticsRankingItem {
  technicianId: number;
  technicianName: string;
  resolvedCount: number;
}

export interface AnalyticsRecentActivityItem {
  ticketId: number;
  title: string;
  statusId: number;
  status: string;
  category: string;
  requester: string;
  technician: string;
  action: string;
  occurredAt: IsoDateTimeString;
}

export interface AnalyticsDistributionItem {
  name: string;
  value: number;
}

export interface AnalyticsSummaryResult {
  context: string;
  filters: AnalyticsFilters;
  data: AnalyticsSummary;
}

export interface AnalyticsTrendsResult {
  context: string;
  filters: AnalyticsFilters;
  series: AnalyticsTrendPoint[];
}

export interface AnalyticsRankingResult {
  context: string;
  filters: AnalyticsFilters;
  limit: number | null;
  data: AnalyticsRankingItem[];
}

export interface AnalyticsRecentActivityResult {
  context: string;
  filters: AnalyticsFilters;
  limit: number;
  data: AnalyticsRecentActivityItem[];
}

export interface AnalyticsDistributionResult {
  context: string;
  filters: AnalyticsFilters;
  limit: number;
  data: AnalyticsDistributionItem[];
}
