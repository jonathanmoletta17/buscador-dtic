import React from 'react';
import { 
  Inbox, 
  PlayCircle, 
  PauseCircle, 
  CheckCircle2
} from 'lucide-react';
import { KPICard } from '../molecules/KPICard';
import type { TicketStats } from '@/lib/api/types';

interface KPIGridProps {
  stats: TicketStats | null;
  selectedStatusId: number | null;
  onStatusChange: (statusId: number | null) => void;
  isLoading?: boolean;
}

export const KPIGrid: React.FC<KPIGridProps> = ({
  stats,
  selectedStatusId,
  onStatusChange,
  isLoading
}) => {
  type KPICardVariant = React.ComponentProps<typeof KPICard>['variant'];

  const items: Array<{
    id: number;
    label: string;
    count: number;
    icon: React.ComponentProps<typeof KPICard>['icon'];
    variant: KPICardVariant;
  }> = [
    { id: 1, label: 'Novos', count: stats?.new || 0, icon: Inbox, variant: 'success' },
    { id: 2, label: 'Em Atendimento', count: stats?.inProgress || 0, icon: PlayCircle, variant: 'info' },
    { id: 4, label: 'Pendentes', count: stats?.pending || 0, icon: PauseCircle, variant: 'warning' },
    { id: 5, label: 'Solucionados', count: stats?.solved || 0, icon: CheckCircle2, variant: 'violet' },
  ];

  if (isLoading && !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-surface-2 rounded-2xl border border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {items.map((item) => (
        <KPICard
          key={item.id}
          label={item.label}
          count={item.count}
          icon={item.icon}
          variant={item.variant}
          selected={selectedStatusId === item.id}
          onClick={() => onStatusChange(selectedStatusId === item.id ? null : item.id)}
        />
      ))}
    </div>
  );
};
