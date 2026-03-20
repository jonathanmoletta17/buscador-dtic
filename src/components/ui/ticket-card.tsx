"use client";

import React from "react";
import { Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { decodeHtmlEntities } from "@/lib/utils/formatters";

interface TicketCardProps {
  id: string;
  title: string;
  description: string;
  status: string;
  statusColor?: "info" | "warning" | "danger" | "success" | "neutral";
  category?: string;
  sla?: string;
  slaLevel?: "ok" | "attention" | "critical" | "expired";
  onClick?: () => void;
}

const statusTextColors: Record<string, string> = {
  info: "text-info/80",
  warning: "text-warning/80",
  danger: "text-danger/80",
  success: "text-success/80",
  neutral: "text-text-3",
};

export function TicketCard({
  id,
  title,
  description,
  status,
  statusColor = "neutral",
  category,
  sla,
  slaLevel = "ok",
  onClick,
}: TicketCardProps) {
  const isCriticalSla = slaLevel === "critical" || slaLevel === "expired";

  return (
    <button
      onClick={onClick}
      className="group/card w-full cursor-pointer rounded-lg border border-border-1 bg-surface-2 p-4 text-left transition-all duration-200 hover:border-border-2 hover:bg-surface-3"
    >
      {/* Top Row: ID + SLA */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[12px] font-mono text-text-3/70 truncate">
          {id}
        </span>
        {sla && (
          <span className={`text-[12px] font-mono flex items-center gap-1 shrink-0 ${isCriticalSla ? "text-danger" : "text-text-3/60"}`}>
            {slaLevel === "expired" ? <AlertTriangle size={11} /> : <Clock size={11} />}
            {sla}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="mb-1.5 line-clamp-2 text-[15px] font-semibold leading-snug text-text-1 transition-colors group-hover/card:text-text-1">
        {decodeHtmlEntities(title)}
      </h4>

      {/* Description */}
      <p className="text-[13px] text-text-2/60 line-clamp-1 leading-relaxed mb-3">
        {description}
      </p>

      {/* Bottom Row: Category + Status */}
      <div className="flex items-center justify-between gap-2">
        {category && (
          <span className="rounded bg-overlay-1 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-text-3/50">
            {category}
          </span>
        )}
        <span
          className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1 ${statusTextColors[statusColor]}`}
          title={status === "Solucionado" ? "Aguardando limite de avaliação do usuário" : status === "Fechado" ? "Ticket encerrado definitivamente" : undefined}
        >
          {status === "Solucionado" && <Clock size={10} />}
          {status === "Fechado" && <CheckCircle2 size={10} />}
          {status}
        </span>
      </div>
    </button>
  );
}
