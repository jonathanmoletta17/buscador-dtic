import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { fetchStats, fetchTickets, searchTicketsDirect } from '@/lib/api/ticketService';
import { compareIsoDateDesc } from '@/lib/datetime/iso';
import type { TicketSummary, TicketStats } from '@/lib/api/types';
import { calculateRelevanceScore } from '../utils/searchUtils';
import { useLiveDataRefresh } from '@/hooks/useLiveDataRefresh';
import { POLL_INTERVALS } from '@/lib/realtime/polling';

const SEARCH_SCOPE_STATUSES = [1, 2, 3, 4, 5] as const;
const DB_LIST_LIMIT = 500;
const DB_SEARCH_LIMIT = 200;

function resolveStatusFilter(statusId: number | null): number[] {
  if (!statusId) return [...SEARCH_SCOPE_STATUSES];
  if (statusId === 2) return [2, 3]; // "Em Atendimento" = atribuído + planejado
  return [statusId];
}

export interface UseTicketsSearchProps {
  context: string;
  department?: string;
  debounceMs?: number;
}

export function useTicketsSearch({
  context,
  department,
  debounceMs = 300
}: UseTicketsSearchProps) {
  // Estados de busca e filtros
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedStatusId, setSelectedStatusId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'relevance' | 'date'>('date');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Estados de dados
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [updateNotice, setUpdateNotice] = useState(false);
  const hasLoadedOnceRef = useRef(false);

  // Debounce manual do termo de busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [searchInput, debounceMs]);

  const loadBaseData = useCallback(async () => {
    const statusFilter = resolveStatusFilter(selectedStatusId);
    const isInitialLoad = !hasLoadedOnceRef.current;
    if (isInitialLoad) setLoading(true);
    else setRefreshing(true);
    setUpdateNotice(!isInitialLoad);

    try {
      const [statsData, ticketsData] = await Promise.all([
        fetchStats(context, null, department),
        fetchTickets(context, {
          department,
          status: statusFilter,
          limit: DB_LIST_LIMIT,
        })
      ]);
      setStats(statsData);
      setTickets(ticketsData.tickets);
      setTotalCount(ticketsData.total);
      hasLoadedOnceRef.current = true;
    } catch (error) {
      console.error("Failed to load base data:", error);
      if (!hasLoadedOnceRef.current) {
        setStats(null);
        setTickets([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setUpdateNotice(false);
    }
  }, [context, department, selectedStatusId]);

  // Carregamento de base (Stats + Tickets) no mesmo universo dos cards
  useEffect(() => {
    if (debouncedSearchTerm.length >= 2) return;
    void loadBaseData();
  }, [debouncedSearchTerm, loadBaseData]);

  useLiveDataRefresh({
    context,
    domains: ["tickets", "dashboard", "analytics", "search", "user"],
    onRefresh: () => {
      if (debouncedSearchTerm.length >= 2) return;
      return loadBaseData();
    },
    pollIntervalMs: POLL_INTERVALS.search,
    enabled: debouncedSearchTerm.length < 2,
    minRefreshGapMs: 750,
  });

  // Busca remota quando o termo muda (direto no banco) com o mesmo filtro de status ativo
  useEffect(() => {
    const statusFilter = resolveStatusFilter(selectedStatusId);

    if (debouncedSearchTerm.length >= 2) {
      setSearching(true);
      searchTicketsDirect(context, debouncedSearchTerm, {
        department,
        status: statusFilter,
        limit: DB_SEARCH_LIMIT,
      })
        .then(data => {
          setTickets(data.tickets);
          setTotalCount(data.total);
        })
        .catch(err => console.error("Remote search failed:", err))
        .finally(() => setSearching(false));
    }
  }, [debouncedSearchTerm, context, department, selectedStatusId]);

  // Processamento local (Filtros e Ordenação)
  const processedTickets = useMemo(() => {
    let result = [...tickets];

    // 1. Filtro de Categoria
    if (selectedCategory) {
      result = result.filter(t => t.category === selectedCategory);
    }

    // 2. Ordenação
    if (sortBy === 'date') {
      result.sort((a, b) => compareIsoDateDesc(a.dateCreated, b.dateCreated));
    } else {
      // Relevância manual baseada no termo de busca (caso queira complementar o banco)
      result.sort((a, b) => {
        const scoreA = calculateRelevanceScore([
          { text: String(a.id), weight: 100 },
          { text: a.title, weight: 70 },
          { text: a.requester || '', weight: 50 },
          { text: a.content, weight: 10 }
        ], debouncedSearchTerm);
        
        const scoreB = calculateRelevanceScore([
          { text: String(b.id), weight: 100 },
          { text: b.title, weight: 70 },
          { text: b.requester || '', weight: 50 },
          { text: b.content, weight: 10 }
        ], debouncedSearchTerm);

        return scoreB - scoreA;
      });
    }

    return result;
  }, [tickets, selectedCategory, sortBy, debouncedSearchTerm]);

  // Paginação
  const totalPages = Math.ceil(processedTickets.length / itemsPerPage);
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedTickets.slice(start, start + itemsPerPage);
  }, [processedTickets, currentPage]);

  return {
    // Busca
    searchInput,
    setSearchInput,
    debouncedSearchTerm,
    searching,
    loading,
    refreshing,
    
    // Dados
    tickets: paginatedTickets,
    totalCount: debouncedSearchTerm ? totalCount : processedTickets.length,
    stats,
    updateNotice,
    setUpdateNotice,
    
    // Filtros e Ordenação
    filters: {
      selectedStatusId,
      setSelectedStatusId,
      selectedCategory,
      setSelectedCategory,
      sortBy,
      setSortBy
    },
    
    // Paginação
    pagination: {
      currentPage,
      setCurrentPage,
      totalPages,
      itemsPerPage
    }
  };
}
