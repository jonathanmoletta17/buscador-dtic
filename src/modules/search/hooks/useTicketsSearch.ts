import { useState, useMemo, useEffect, useCallback, useRef, type MutableRefObject } from "react";

import { fetchStats, fetchTicketFilterOptions, fetchTickets, searchTicketsDirect } from "@/lib/api/ticketService";
import { compareIsoDateDesc } from "@/lib/datetime/iso";
import type {
  TicketFilterOptions,
  TicketSearchDepth,
  TicketSummary,
  TicketStats,
  TicketUniverse,
} from "@/lib/api/types";
import { calculateRelevanceScore } from "../utils/searchUtils";
import { useLiveDataRefresh } from "@/hooks/useLiveDataRefresh";
import { POLL_INTERVALS } from "@/lib/realtime/polling";

const DB_LIST_LIMIT = 500;
const DB_SEARCH_LIMIT = 200;
const ITEMS_PER_PAGE = 5;

type PeriodPreset = "7d" | "30d" | "90d" | "custom";

interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface RequestFlowState {
  requestId: number;
  controller: AbortController | null;
}

interface ResultMeta {
  loadedCount: number;
  isTruncated: boolean;
  truncationLimit: number | null;
}

export interface UseTicketsSearchProps {
  context: string;
  department?: string;
  debounceMs?: number;
}

function formatDateInput(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPresetDateRange(preset: Exclude<PeriodPreset, "custom">): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const dateTo = formatDateInput(today);
  const dateFrom = new Date(today);
  const amount = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  dateFrom.setDate(dateFrom.getDate() - amount);

  return {
    dateFrom: formatDateInput(dateFrom),
    dateTo,
  };
}

function resolveStatusFilter(statusId: number | null): number[] | undefined {
  if (!statusId) return undefined;
  if (statusId === 2) return [2, 3];
  return [statusId];
}

function buildPeriodLabel(preset: PeriodPreset, dateFrom: string, dateTo: string): string {
  if (preset === "custom") {
    return `Periodo: ${dateFrom} a ${dateTo}`;
  }

  const labelMap: Record<Exclude<PeriodPreset, "custom">, string> = {
    "7d": "Periodo: 7 dias",
    "30d": "Periodo: 30 dias",
    "90d": "Periodo: 90 dias",
  };

  return labelMap[preset];
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === "AbortError"
  ) || (error instanceof Error && error.name === "AbortError");
}

function trackUniverseSelection(nextUniverse: TicketUniverse): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const storageKey = "buscador_dtic_universe_usage";
    const current = JSON.parse(localStorage.getItem(storageKey) || "{}") as Record<string, number>;
    current[nextUniverse] = (current[nextUniverse] || 0) + 1;
    localStorage.setItem(storageKey, JSON.stringify(current));
  } catch {
    // telemetry is best-effort and must never impact the search flow
  }
}

export function useTicketsSearch({
  context,
  department,
  debounceMs = 300,
}: UseTicketsSearchProps) {
  const initialRangeRef = useRef(getPresetDateRange("90d"));
  const lastSearchStateRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const baseFlowRef = useRef<RequestFlowState>({ requestId: 0, controller: null });
  const searchFlowRef = useRef<RequestFlowState>({ requestId: 0, controller: null });

  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"relevance" | "date">("date");
  const [currentPage, setCurrentPage] = useState(1);
  const [universe, setUniverseState] = useState<TicketUniverse>("historical");
  const [depth, setDepth] = useState<TicketSearchDepth>("basic");
  const [periodPreset, setPeriodPresetState] = useState<PeriodPreset>("90d");
  const [dateFrom, setDateFromState] = useState(initialRangeRef.current.dateFrom);
  const [dateTo, setDateToState] = useState(initialRangeRef.current.dateTo);
  const [entityId, setEntityId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [locationId, setLocationId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [technicianId, setTechnicianId] = useState<number | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [filterOptions, setFilterOptions] = useState<TicketFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [filterOptionsLoading, setFilterOptionsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchInput.trim());
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchInput, debounceMs]);

  useEffect(() => {
    void fetchTicketFilterOptions(context)
      .then((options) => setFilterOptions(options))
      .catch((error) => {
        console.error("Failed to load filter options:", error);
        setFilterOptions({
          requestTypes: [],
          entities: [],
          categories: [],
          locations: [],
          groups: [],
          technicians: [],
        });
      })
      .finally(() => setFilterOptionsLoading(false));
  }, [context]);

  const optionLabelMaps = useMemo(() => {
    const createMap = (items?: { id: number; label: string }[]) =>
      new Map((items || []).map((item) => [item.id, item.label]));

    return {
      entities: createMap(filterOptions?.entities),
      categories: createMap(filterOptions?.categories),
      locations: createMap(filterOptions?.locations),
      groups: createMap(filterOptions?.groups),
      technicians: createMap(filterOptions?.technicians),
    };
  }, [filterOptions]);

  const statusFilter = useMemo(() => resolveStatusFilter(selectedStatusId), [selectedStatusId]);
  const statsOptions = useMemo(
    () => ({
      department,
      universe,
      groupId,
      entityIds: entityId ? [entityId] : undefined,
      locationIds: locationId ? [locationId] : undefined,
      technicianId: technicianId ?? undefined,
      categoryId: categoryId ?? undefined,
      dateFrom,
      dateTo,
    }),
    [department, universe, groupId, entityId, locationId, technicianId, categoryId, dateFrom, dateTo],
  );
  const listOptions = useMemo(
    () => ({
      ...statsOptions,
      status: statusFilter,
      limit: DB_LIST_LIMIT,
    }),
    [statsOptions, statusFilter],
  );
  const searchOptions = useMemo(
    () => ({
      ...statsOptions,
      status: statusFilter,
      depth,
      limit: DB_SEARCH_LIMIT,
    }),
    [statsOptions, statusFilter, depth],
  );

  const beginRequest = useCallback((flowRef: MutableRefObject<RequestFlowState>) => {
    flowRef.current.controller?.abort();
    const nextController = new AbortController();
    const nextRequestId = flowRef.current.requestId + 1;
    flowRef.current = {
      requestId: nextRequestId,
      controller: nextController,
    };
    return { requestId: nextRequestId, signal: nextController.signal };
  }, []);

  const cancelRequest = useCallback((flowRef: MutableRefObject<RequestFlowState>) => {
    flowRef.current.controller?.abort();
    flowRef.current = {
      requestId: flowRef.current.requestId + 1,
      controller: null,
    };
  }, []);

  const isActiveRequest = useCallback((flowRef: MutableRefObject<RequestFlowState>, requestId: number) => {
    return flowRef.current.requestId === requestId;
  }, []);

  const periodError = useMemo(() => {
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return "Periodo invalido: a data inicial nao pode ser maior que a data final.";
    }
    return null;
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!periodError) {
      return;
    }

    cancelRequest(baseFlowRef);
    cancelRequest(searchFlowRef);
    setLoading(false);
    setRefreshing(false);
    setSearching(false);
  }, [cancelRequest, periodError]);

  const loadBaseData = useCallback(async () => {
    if (periodError) {
      return;
    }

    const { requestId, signal } = beginRequest(baseFlowRef);
    const isInitialLoad = !hasLoadedOnceRef.current;
    if (isInitialLoad) setLoading(true);
    else setRefreshing(true);

    try {
      const [statsData, ticketsData] = await Promise.all([
        fetchStats(context, { ...statsOptions, signal }),
        fetchTickets(context, { ...listOptions, signal }),
      ]);
      if (!isActiveRequest(baseFlowRef, requestId)) {
        return;
      }
      setStats(statsData);
      setTickets(ticketsData.tickets);
      setTotalCount(ticketsData.total);
      hasLoadedOnceRef.current = true;
    } catch (error) {
      if (isAbortError(error) || !isActiveRequest(baseFlowRef, requestId)) {
        return;
      }
      console.error("Failed to load base data:", error);
      if (!hasLoadedOnceRef.current) {
        setStats(null);
        setTickets([]);
        setTotalCount(0);
      }
    } finally {
      if (!isActiveRequest(baseFlowRef, requestId)) {
        return;
      }
      baseFlowRef.current.controller = null;
      setLoading(false);
      setRefreshing(false);
    }
  }, [beginRequest, context, isActiveRequest, listOptions, periodError, statsOptions]);

  useEffect(() => {
    const hasSearch = debouncedSearchTerm.length >= 2;
    if (hasSearch !== lastSearchStateRef.current) {
      setSortBy(hasSearch ? "relevance" : "date");
      lastSearchStateRef.current = hasSearch;
    }
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (periodError || debouncedSearchTerm.length !== 0) return;
    void loadBaseData();
  }, [debouncedSearchTerm, loadBaseData, periodError]);

  useLiveDataRefresh({
    context,
    domains: ["tickets", "dashboard", "analytics", "search", "user"],
    onRefresh: () => {
      if (periodError || debouncedSearchTerm.length !== 0) return;
      return loadBaseData();
    },
    pollIntervalMs: POLL_INTERVALS.search,
    enabled: debouncedSearchTerm.length === 0 && !periodError,
    minRefreshGapMs: 750,
  });

  useEffect(() => {
    if (periodError || debouncedSearchTerm.length < 2) {
      cancelRequest(searchFlowRef);
      setSearching(false);
      return;
    }

    const { requestId, signal } = beginRequest(searchFlowRef);
    setSearching(true);
    void searchTicketsDirect(context, debouncedSearchTerm, { ...searchOptions, signal })
      .then((data) => {
        if (!isActiveRequest(searchFlowRef, requestId)) {
          return;
        }
        setTickets(data.tickets);
        setTotalCount(data.total);
      })
      .catch((error) => {
        if (isAbortError(error) || !isActiveRequest(searchFlowRef, requestId)) {
          return;
        }
        console.error("Remote search failed:", error);
        setTickets([]);
        setTotalCount(0);
      })
      .finally(() => {
        if (!isActiveRequest(searchFlowRef, requestId)) {
          return;
        }
        searchFlowRef.current.controller = null;
        setSearching(false);
      });
  }, [beginRequest, cancelRequest, context, debouncedSearchTerm, isActiveRequest, periodError, searchOptions]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearchTerm,
    selectedStatusId,
    universe,
    depth,
    periodPreset,
    dateFrom,
    dateTo,
    entityId,
    categoryId,
    locationId,
    groupId,
    technicianId,
  ]);

  const processedTickets = useMemo(() => {
    const result = [...tickets];

    if (sortBy === "date") {
      result.sort((left, right) => compareIsoDateDesc(left.dateCreated, right.dateCreated));
      return result;
    }

    result.sort((left, right) => {
      const scoreLeft = calculateRelevanceScore(
        [
          { text: String(left.id), weight: 100 },
          { text: left.title, weight: 70 },
          { text: left.requestType || "", weight: 45 },
          { text: left.requester || "", weight: 35 },
          { text: left.content, weight: 20 },
          { text: left.matchExcerpt || "", weight: 30 },
        ],
        debouncedSearchTerm,
      );
      const scoreRight = calculateRelevanceScore(
        [
          { text: String(right.id), weight: 100 },
          { text: right.title, weight: 70 },
          { text: right.requestType || "", weight: 45 },
          { text: right.requester || "", weight: 35 },
          { text: right.content, weight: 20 },
          { text: right.matchExcerpt || "", weight: 30 },
        ],
        debouncedSearchTerm,
      );

      if (scoreRight !== scoreLeft) {
        return scoreRight - scoreLeft;
      }

      return compareIsoDateDesc(left.dateCreated, right.dateCreated);
    });

    return result;
  }, [tickets, sortBy, debouncedSearchTerm]);

  const hasRemoteSearch = debouncedSearchTerm.length >= 2;
  const resultMeta = useMemo<ResultMeta>(() => {
    const loadedCount = processedTickets.length;
    return {
      loadedCount,
      isTruncated: totalCount > loadedCount,
      truncationLimit: hasRemoteSearch ? DB_SEARCH_LIMIT : DB_LIST_LIMIT,
    };
  }, [hasRemoteSearch, processedTickets.length, totalCount]);

  const totalPages = Math.max(Math.ceil(processedTickets.length / ITEMS_PER_PAGE), 1);
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return processedTickets.slice(start, start + ITEMS_PER_PAGE);
  }, [processedTickets, currentPage]);

  useEffect(() => {
    return () => {
      cancelRequest(baseFlowRef);
      cancelRequest(searchFlowRef);
    };
  }, [cancelRequest]);

  const setUniverse = useCallback((nextUniverse: TicketUniverse) => {
    trackUniverseSelection(nextUniverse);
    setUniverseState(nextUniverse);
    if (nextUniverse === "active" && selectedStatusId === 6) {
      setSelectedStatusId(null);
    }
  }, [selectedStatusId]);

  const setPeriodPreset = useCallback((nextPreset: PeriodPreset) => {
    setPeriodPresetState(nextPreset);
    if (nextPreset === "custom") {
      return;
    }

    const range = getPresetDateRange(nextPreset);
    setDateFromState(range.dateFrom);
    setDateToState(range.dateTo);
  }, []);

  const setDateFrom = useCallback((value: string) => {
    setPeriodPresetState("custom");
    setDateFromState(value);
  }, []);

  const setDateTo = useCallback((value: string) => {
    setPeriodPresetState("custom");
    setDateToState(value);
  }, []);

  const resetAllFilters = useCallback(() => {
    const range = getPresetDateRange("90d");
    setSearchInput("");
    setSelectedStatusId(null);
    setSortBy("date");
    setUniverseState("historical");
    setDepth("basic");
    setPeriodPresetState("90d");
    setDateFromState(range.dateFrom);
    setDateToState(range.dateTo);
    setEntityId(null);
    setCategoryId(null);
    setLocationId(null);
    setGroupId(null);
    setTechnicianId(null);
  }, []);

  const activeAdvancedCount = [entityId, categoryId, locationId, groupId, technicianId].filter(Boolean).length;

  const activeFilterChips = useMemo<ActiveFilterChip[]>(() => {
    const chips: ActiveFilterChip[] = [];

    if (universe === "active") {
      chips.push({
        key: "universe",
        label: "Universo: Operacional",
        onRemove: () => setUniverse("historical"),
      });
    }

    if (periodPreset !== "90d") {
      chips.push({
        key: "period",
        label: buildPeriodLabel(periodPreset, dateFrom, dateTo),
        onRemove: () => setPeriodPreset("90d"),
      });
    }

    if (depth === "expanded") {
      chips.push({
        key: "depth",
        label: "Busca expandida",
        onRemove: () => setDepth("basic"),
      });
    }

    if (selectedStatusId) {
      const statusLabels: Record<number, string> = {
        1: "Status: Novos",
        2: "Status: Em Atendimento",
        4: "Status: Pendentes",
        5: "Status: Solucionados",
        6: "Status: Fechados",
      };
      chips.push({
        key: "status",
        label: statusLabels[selectedStatusId] || `Status: ${selectedStatusId}`,
        onRemove: () => setSelectedStatusId(null),
      });
    }

    if (entityId) {
      chips.push({
        key: "entity",
        label: `Entidade: ${optionLabelMaps.entities.get(entityId) || entityId}`,
        onRemove: () => setEntityId(null),
      });
    }

    if (categoryId) {
      chips.push({
        key: "category",
        label: `Categoria: ${optionLabelMaps.categories.get(categoryId) || categoryId}`,
        onRemove: () => setCategoryId(null),
      });
    }

    if (locationId) {
      chips.push({
        key: "location",
        label: `Local: ${optionLabelMaps.locations.get(locationId) || locationId}`,
        onRemove: () => setLocationId(null),
      });
    }

    if (groupId) {
      chips.push({
        key: "group",
        label: `Grupo: ${optionLabelMaps.groups.get(groupId) || groupId}`,
        onRemove: () => setGroupId(null),
      });
    }

    if (technicianId) {
      chips.push({
        key: "technician",
        label: `Tecnico: ${optionLabelMaps.technicians.get(technicianId) || technicianId}`,
        onRemove: () => setTechnicianId(null),
      });
    }

    return chips;
  }, [
    universe,
    periodPreset,
    dateFrom,
    dateTo,
    depth,
    selectedStatusId,
    entityId,
    categoryId,
    locationId,
    groupId,
    technicianId,
    optionLabelMaps,
    setPeriodPreset,
    setUniverse,
  ]);

  const summaryLabel = useMemo(() => {
    const parts = [
      universe === "historical" ? "Historico completo" : "Operacional",
      buildPeriodLabel(periodPreset, dateFrom, dateTo).replace("Periodo: ", ""),
      debouncedSearchTerm.length >= 2
        ? depth === "expanded"
          ? "Busca expandida"
          : "Busca basica"
        : "Lista por data",
    ];

    return parts.join(" / ");
  }, [universe, periodPreset, dateFrom, dateTo, debouncedSearchTerm, depth]);

  return {
    searchInput,
    setSearchInput,
    debouncedSearchTerm,
    searching,
    loading,
    refreshing,
    filterOptionsLoading,
    tickets: paginatedTickets,
    totalCount,
    stats,
    filterOptions,
    periodError,
    resultMeta,
    summaryLabel,
    filters: {
      selectedStatusId,
      setSelectedStatusId,
      sortBy,
      setSortBy,
      universe,
      setUniverse,
      depth,
      setDepth,
      periodPreset,
      setPeriodPreset,
      dateFrom,
      setDateFrom,
      dateTo,
      setDateTo,
      entityId,
      setEntityId,
      categoryId,
      setCategoryId,
      locationId,
      setLocationId,
      groupId,
      setGroupId,
      technicianId,
      setTechnicianId,
      advancedOpen,
      setAdvancedOpen,
      activeAdvancedCount,
      activeFilterChips,
      resetAllFilters,
    },
    pagination: {
      currentPage,
      setCurrentPage,
      totalPages,
      itemsPerPage: ITEMS_PER_PAGE,
    },
  };
}
