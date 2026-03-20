import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TicketFilterOptions, TicketStats, TicketSummary } from "@/lib/api/types";
import { useTicketsSearch } from "./useTicketsSearch";

const {
  fetchStatsMock,
  fetchTicketsMock,
  fetchFilterOptionsMock,
  searchTicketsDirectMock,
  useLiveDataRefreshMock,
} = vi.hoisted(() => ({
  fetchStatsMock: vi.fn(),
  fetchTicketsMock: vi.fn(),
  fetchFilterOptionsMock: vi.fn(),
  searchTicketsDirectMock: vi.fn(),
  useLiveDataRefreshMock: vi.fn(),
}));

vi.mock("@/lib/api/ticketService", () => ({
  fetchStats: fetchStatsMock,
  fetchTickets: fetchTicketsMock,
  fetchTicketFilterOptions: fetchFilterOptionsMock,
  searchTicketsDirect: searchTicketsDirectMock,
}));

vi.mock("@/hooks/useLiveDataRefresh", () => ({
  useLiveDataRefresh: useLiveDataRefreshMock,
}));

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeTicket(id: number, dateCreated: string): TicketSummary {
  const isoDate = dateCreated as TicketSummary["dateCreated"];
  return {
    id,
    title: `Ticket ${id}`,
    content: `Conteudo ${id}`,
    category: "Categoria",
    categoryId: 10,
    status: "Novo",
    statusId: 1,
    urgency: "Baixa",
    urgencyId: 2,
    dateCreated: isoDate,
    dateModified: isoDate,
    requester: "Usuario",
    requestType: "Portal",
    requestTypeId: 1,
    entityName: "DTIC",
    entityId: 2,
    entity_name: "DTIC",
    location: "Sede",
    locationId: 3,
  };
}

function makeStats(total = 10): TicketStats {
  return {
    new: 1,
    inProgress: 2,
    pending: 3,
    solved: 4,
    closed: 5,
    solvedRecent: 2,
    total,
    totalOpen: 6,
  };
}

function makeFilterOptions(): TicketFilterOptions {
  return {
    requestTypes: [],
    entities: [],
    categories: [],
    locations: [],
    groups: [],
    technicians: [],
  };
}

async function flushPromises(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useTicketsSearch (DTIC)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    fetchStatsMock.mockResolvedValue(makeStats());
    fetchTicketsMock.mockResolvedValue({
      total: 1,
      tickets: [makeTicket(1, "2026-03-10T10:00:00Z")],
    });
    fetchFilterOptionsMock.mockResolvedValue(makeFilterOptions());
    searchTicketsDirectMock.mockResolvedValue({
      total: 1,
      tickets: [makeTicket(99, "2026-03-11T10:00:00Z")],
    });
  });

  it("mantem apenas a ultima resposta no fluxo baseData", async () => {
    const firstStats = createDeferred<TicketStats>();
    const firstTickets = createDeferred<{ total: number; tickets: TicketSummary[] }>();
    const secondStats = createDeferred<TicketStats>();
    const secondTickets = createDeferred<{ total: number; tickets: TicketSummary[] }>();

    fetchStatsMock
      .mockImplementationOnce(() => firstStats.promise)
      .mockImplementationOnce(() => secondStats.promise);
    fetchTicketsMock
      .mockImplementationOnce(() => firstTickets.promise)
      .mockImplementationOnce(() => secondTickets.promise);

    const { result } = renderHook(() => useTicketsSearch({ context: "dtic", debounceMs: 10 }));

    await waitFor(() => expect(fetchStatsMock).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.filters.setSelectedStatusId(1);
    });

    await waitFor(() => expect(fetchStatsMock).toHaveBeenCalledTimes(2));

    act(() => {
      secondStats.resolve(makeStats(20));
      secondTickets.resolve({
        total: 20,
        tickets: [makeTicket(2, "2026-03-12T10:00:00Z")],
      });
    });
    await waitFor(() => expect(result.current.totalCount).toBe(20));

    act(() => {
      firstStats.resolve(makeStats(10));
      firstTickets.resolve({
        total: 10,
        tickets: [makeTicket(1, "2026-03-10T10:00:00Z")],
      });
    });
    await flushPromises();

    expect(result.current.totalCount).toBe(20);
    expect(result.current.tickets[0]?.id).toBe(2);
  });

  it("mantem apenas a ultima resposta no fluxo de busca", async () => {
    const firstSearch = createDeferred<{ total: number; tickets: TicketSummary[] }>();
    const secondSearch = createDeferred<{ total: number; tickets: TicketSummary[] }>();

    searchTicketsDirectMock
      .mockImplementationOnce(() => firstSearch.promise)
      .mockImplementationOnce(() => secondSearch.promise);

    const { result } = renderHook(() => useTicketsSearch({ context: "dtic", debounceMs: 10 }));

    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalled());

    act(() => {
      result.current.setSearchInput("rede");
    });
    await waitFor(() => expect(searchTicketsDirectMock).toHaveBeenCalledTimes(1));

    act(() => {
      result.current.setSearchInput("rede lenta");
    });
    await waitFor(() => expect(searchTicketsDirectMock).toHaveBeenCalledTimes(2));

    act(() => {
      secondSearch.resolve({
        total: 30,
        tickets: [makeTicket(30, "2026-03-14T10:00:00Z")],
      });
    });
    await waitFor(() => expect(result.current.totalCount).toBe(30));

    act(() => {
      firstSearch.resolve({
        total: 12,
        tickets: [makeTicket(12, "2026-03-13T10:00:00Z")],
      });
    });
    await flushPromises();

    expect(result.current.totalCount).toBe(30);
    expect(result.current.tickets[0]?.id).toBe(30);
  });

  it("bloqueia chamadas remotas quando periodo invalido", async () => {
    const { result } = renderHook(() => useTicketsSearch({ context: "dtic", debounceMs: 10 }));
    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalled());

    vi.clearAllMocks();

    act(() => {
      result.current.filters.setDateFrom("2026-03-20");
      result.current.filters.setDateTo("2026-03-01");
    });

    await waitFor(() => expect(result.current.periodError).toBeTruthy());

    act(() => {
      result.current.filters.setSelectedStatusId(4);
      result.current.setSearchInput("senha");
    });
    await waitFor(() => expect(result.current.debouncedSearchTerm).toBe("senha"));
    await flushPromises();

    expect(fetchStatsMock).not.toHaveBeenCalled();
    expect(fetchTicketsMock).not.toHaveBeenCalled();
    expect(searchTicketsDirectMock).not.toHaveBeenCalled();
  });

  it("limpa erro de periodo e volta a consultar servicos", async () => {
    const { result } = renderHook(() => useTicketsSearch({ context: "dtic", debounceMs: 10 }));
    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalled());

    act(() => {
      result.current.filters.setDateFrom("2026-03-20");
      result.current.filters.setDateTo("2026-03-01");
    });
    await waitFor(() => expect(result.current.periodError).toBeTruthy());

    vi.clearAllMocks();
    fetchStatsMock.mockResolvedValue(makeStats());
    fetchTicketsMock.mockResolvedValue({
      total: 3,
      tickets: [makeTicket(3, "2026-03-15T10:00:00Z")],
    });

    act(() => {
      result.current.filters.setDateTo("2026-03-25");
    });

    await waitFor(() => expect(result.current.periodError).toBeNull());
    await waitFor(() => expect(fetchStatsMock).toHaveBeenCalled());
    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalled());
  });

  it("calcula truncamento corretamente", async () => {
    fetchTicketsMock.mockResolvedValue({
      total: 700,
      tickets: [
        makeTicket(1, "2026-03-10T10:00:00Z"),
        makeTicket(2, "2026-03-11T10:00:00Z"),
        makeTicket(3, "2026-03-12T10:00:00Z"),
      ],
    });

    const { result } = renderHook(() => useTicketsSearch({ context: "dtic", debounceMs: 10 }));
    await waitFor(() => expect(result.current.resultMeta.loadedCount).toBe(3));

    expect(result.current.resultMeta.isTruncated).toBe(true);
    expect(result.current.resultMeta.truncationLimit).toBe(500);
    expect(result.current.totalCount).toBe(700);
  });

  it("nao dispara busca remota para termo de 1 caractere", async () => {
    const { result } = renderHook(() => useTicketsSearch({ context: "dtic", debounceMs: 10 }));
    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalled());
    vi.clearAllMocks();

    act(() => {
      result.current.setSearchInput("a");
    });
    await waitFor(() => expect(result.current.debouncedSearchTerm).toBe("a"));
    await flushPromises();

    expect(searchTicketsDirectMock).not.toHaveBeenCalled();
  });

  it("termo vazio permite carga base e polling habilitado", async () => {
    const { result } = renderHook(() => useTicketsSearch({ context: "dtic", debounceMs: 10 }));

    await waitFor(() => expect(fetchTicketsMock).toHaveBeenCalled());
    expect(useLiveDataRefreshMock).toHaveBeenCalled();
    const firstCall = useLiveDataRefreshMock.mock.calls.at(-1)?.[0];
    expect(firstCall.enabled).toBe(true);

    act(() => {
      result.current.setSearchInput("rede");
    });
    await waitFor(() => expect(result.current.debouncedSearchTerm).toBe("rede"));
    const secondCall = useLiveDataRefreshMock.mock.calls.at(-1)?.[0];
    expect(secondCall.enabled).toBe(false);

    act(() => {
      result.current.setSearchInput("");
    });
    await waitFor(() => expect(result.current.debouncedSearchTerm).toBe(""));
    const thirdCall = useLiveDataRefreshMock.mock.calls.at(-1)?.[0];
    expect(thirdCall.enabled).toBe(true);
  });
});
