import React from 'react';
import { TicketSearchResultCard } from '../molecules/TicketSearchResultCard';
import { LayoutGrid, ListFilter, SortDesc } from 'lucide-react';
import type { TicketSummary } from '@/lib/api/types';

interface TicketListProps {
  tickets: TicketSummary[];
  totalCount: number;
  context: string;
  sortBy: 'relevance' | 'date';
  onSortChange: (sort: 'relevance' | 'date') => void;
  isLoading?: boolean;
}

export const TicketList: React.FC<TicketListProps> = ({
  tickets,
  totalCount,
  context,
  sortBy,
  onSortChange,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-64 bg-surface-2 rounded-2xl border border-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* List Header / Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-text-1">
            Resultados <span className="text-text-3 font-medium">({totalCount})</span>
          </h2>
          <span className="text-[10px] text-text-3 uppercase font-bold tracking-widest bg-white/5 px-2 py-1 rounded">
            Exibindo mais recentes primeiro
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-3 uppercase font-bold tracking-widest mr-2">Ordenar por:</span>
          
          <div className="flex bg-surface-2 p-1 rounded-lg border border-white/5">
            <SortButton 
              active={sortBy === 'relevance'} 
              onClick={() => onSortChange('relevance')}
              icon={ListFilter}
              label="Relevância"
            />
            <SortButton 
              active={sortBy === 'date'} 
              onClick={() => onSortChange('date')}
              icon={SortDesc}
              label="Recentes"
            />
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {tickets.length > 0 ? (
        <div className="space-y-6">
          {tickets.map((ticket) => (
            <TicketSearchResultCard 
              key={ticket.id} 
              ticket={ticket} 
              context={context} 
            />
          ))}
        </div>
      ) : (
        <div className="py-20 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-surface-2 rounded-full flex items-center justify-center mb-6 border border-white/5">
            <LayoutGrid className="text-text-3" size={32} />
          </div>
          <h3 className="text-lg font-bold text-text-1 mb-2">Nenhum chamado encontrado</h3>
          <p className="text-sm text-text-3 max-w-xs">
            Tente ajustar seu termo de busca ou remover os filtros aplicados.
          </p>
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
    onClick={onClick}
    className={`
      flex items-center gap-2 px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all
      ${active 
        ? 'bg-accent-blue text-white shadow-[0_0_12px_rgba(59,130,246,0.3)]' 
        : 'text-text-3 hover:text-text-2 hover:bg-white/5'
      }
    `}
  >
    <Icon size={14} />
    {label}
  </button>
);
