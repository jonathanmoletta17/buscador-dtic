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
  info: "text-blue-400/80",
  warning: "text-amber-400/80",
  danger: "text-red-400/80",
  success: "text-emerald-400/80",
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
      className="group/card w-full text-left rounded-lg bg-surface-2 border border-white/[0.06] hover:bg-surface-3 hover:border-white/[0.10] transition-all duration-200 cursor-pointer p-4"
    >
      {/* Top Row: ID + SLA */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[12px] font-mono text-text-3/70 truncate">
          {id}
        </span>
        {sla && (
          <span className={`text-[12px] font-mono flex items-center gap-1 shrink-0 ${isCriticalSla ? "text-red-400" : "text-text-3/60"}`}>
            {slaLevel === "expired" ? <AlertTriangle size={11} /> : <Clock size={11} />}
            {sla}
          </span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-[15px] font-semibold text-text-1 group-hover/card:text-white transition-colors leading-snug mb-1.5 line-clamp-2">
        {decodeHtmlEntities(title)}
      </h4>

      {/* Description */}
      <p className="text-[13px] text-text-2/60 line-clamp-1 leading-relaxed mb-3">
        {description}
      </p>

      {/* Bottom Row: Category + Status */}
      <div className="flex items-center justify-between gap-2">
        {category && (
          <span className="text-[11px] font-medium text-text-3/50 bg-white/[0.04] px-2 py-0.5 rounded uppercase tracking-wider">
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
