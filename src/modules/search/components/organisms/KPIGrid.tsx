import React from "react";
import {
  CheckCircle2,
  Inbox,
  Lock,
  PauseCircle,
  PlayCircle,
} from "lucide-react";

import type { TicketStats } from "@/lib/api/types";

import { KPICard } from "../molecules/KPICard";

interface KPIGridProps {
  stats: TicketStats | null;
  selectedStatusId: number | null;
  onStatusChange: (statusId: number | null) => void;
  isLoading?: boolean;
  showClosed?: boolean;
}

export const KPIGrid: React.FC<KPIGridProps> = ({
  stats,
  selectedStatusId,
  onStatusChange,
  isLoading,
  showClosed = false,
}) => {
  type KPICardVariant = React.ComponentProps<typeof KPICard>["variant"];

  const items: Array<{
    id: number;
    label: string;
    count: number;
    icon: React.ComponentProps<typeof KPICard>["icon"];
    variant: KPICardVariant;
  }> = [
    { id: 1, label: "Novos", count: stats?.new || 0, icon: Inbox, variant: "success" },
    { id: 2, label: "Em Atendimento", count: stats?.inProgress || 0, icon: PlayCircle, variant: "info" },
    { id: 4, label: "Pendentes", count: stats?.pending || 0, icon: PauseCircle, variant: "warning" },
    { id: 5, label: "Solucionados", count: stats?.solved || 0, icon: CheckCircle2, variant: "violet" },
  ];

  if (showClosed) {
    items.push({ id: 6, label: "Fechados", count: stats?.closed || 0, icon: Lock, variant: "orange" });
  }

  if (isLoading && !stats) {
    return (
      <div className={`grid gap-6 ${showClosed ? "grid-cols-1 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
        {[...Array(items.length || 4)].map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl border border-border-1 bg-surface-2" />
        ))}
      </div>
    );
  }

  return (
    <div className={`grid gap-6 ${showClosed ? "grid-cols-1 md:grid-cols-5" : "grid-cols-2 md:grid-cols-4"}`}>
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
