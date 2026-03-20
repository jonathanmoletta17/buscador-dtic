import React, { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, LayoutGrid, ListFilter, SortDesc } from "lucide-react";

import type { TicketSearchDepth, TicketSummary, TicketUniverse } from "@/lib/api/types";

import { TicketSearchResultCard } from "../molecules/TicketSearchResultCard";

interface TicketListProps {
  tickets: TicketSummary[];
  totalCount: number;
  resultMeta: {
    loadedCount: number;
    isTruncated: boolean;
    truncationLimit: number | null;
  };
  context: string;
  universe: TicketUniverse;
  depth: TicketSearchDepth;
  summaryLabel: string;
  sortBy: "relevance" | "date";
  onSortChange: (sort: "relevance" | "date") => void;
  isLoading?: boolean;
  pagination: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  totalCount,
  resultMeta,
  context,
  universe,
  depth,
  summaryLabel,
  sortBy,
  onSortChange,
  isLoading,
  pagination,
}) => {
  const resultsTopRef = useRef<HTMLDivElement | null>(null);

  const handlePageChange = useCallback((nextPage: number) => {
    if (nextPage === pagination.currentPage) {
      return;
    }

    pagination.onPageChange(nextPage);
    window.requestAnimationFrame(() => {
      resultsTopRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [pagination]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, index) => (
          <div key={index} className="h-64 animate-pulse rounded-2xl border border-border-1 bg-surface-2" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div ref={resultsTopRef} className="h-px" />

      <div className="flex flex-col gap-4 border-b border-border-1 pb-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-text-1">
              Resultados <span className="font-medium text-text-3">({totalCount})</span>
            </h2>
            <span className="rounded bg-overlay-1 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-text-3">
              {summaryLabel}
            </span>
          </div>
          <p className="text-sm text-text-3">
            {sortBy === "relevance" ? "Ordenado por relevancia local" : "Ordenado por data mais recente"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="mr-2 text-[10px] font-bold uppercase tracking-widest text-text-3">Ordenar por:</span>

          <div className="flex rounded-lg border border-border-1 bg-surface-2 p-1">
            <SortButton
              active={sortBy === "relevance"}
              onClick={() => onSortChange("relevance")}
              icon={ListFilter}
              label="Relevancia"
            />
            <SortButton
              active={sortBy === "date"}
              onClick={() => onSortChange("date")}
              icon={SortDesc}
              label="Recentes"
            />
          </div>
        </div>
      </div>

      {resultMeta.isTruncated && (
        <div className="rounded-xl border border-warning/35 bg-warning/10 px-4 py-3 text-sm text-warning">
          Mostrando {resultMeta.loadedCount} de {totalCount} resultados
          {resultMeta.truncationLimit ? ` (limite atual: ${resultMeta.truncationLimit})` : ""}. Refine filtros/termo
          para reduzir volume.
        </div>
      )}

      {tickets.length > 0 ? (
        <div className="space-y-6">
          {tickets.map((ticket) => (
            <TicketSearchResultCard
              key={ticket.id}
              ticket={ticket}
              context={context}
              universe={universe}
              depth={depth}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border-1 bg-surface-2">
            <LayoutGrid className="text-text-3" size={32} />
          </div>
          <h3 className="mb-2 text-lg font-bold text-text-1">Nenhum chamado encontrado</h3>
          <p className="max-w-xs text-sm text-text-3">
            Tente ajustar seu termo de busca ou remover os filtros aplicados.
          </p>
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border-1 pt-6">
          <button
            type="button"
            onClick={() => handlePageChange(Math.max(pagination.currentPage - 1, 1))}
            disabled={pagination.currentPage <= 1}
            className="inline-flex items-center gap-2 rounded-lg border border-border-1 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text-2 transition-colors hover:border-border-2 hover:text-text-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft size={14} />
            Anterior
          </button>

          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-3">
            Pagina {pagination.currentPage} de {pagination.totalPages}
          </span>

          <button
            type="button"
            onClick={() => handlePageChange(Math.min(pagination.currentPage + 1, pagination.totalPages))}
            disabled={pagination.currentPage >= pagination.totalPages}
            className="inline-flex items-center gap-2 rounded-lg border border-border-1 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-text-2 transition-colors hover:border-border-2 hover:text-text-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Proxima
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

interface SortButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
}

const SortButton: React.FC<SortButtonProps> = ({ active, onClick, icon: Icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={[
      "flex items-center gap-2 rounded-md px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all",
      active
        ? "bg-accent-blue text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]"
        : "text-text-3 hover:bg-overlay-1 hover:text-text-2",
    ].join(" ")}
  >
    <Icon size={14} />
    {label}
  </button>
);
