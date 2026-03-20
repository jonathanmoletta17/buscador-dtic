import React, { useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  ExternalLink,
  Search,
  Tag,
  User,
  UserCog,
  Users,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import { PremiumButton } from "@/components/ui/premium-button";
import { formatIsoDateTime } from "@/lib/datetime/iso";
import type { TicketSearchDepth, TicketSummary, TicketUniverse } from "@/lib/api/types";

import { Badge } from "../atoms/Badge";

interface TicketSearchResultCardProps {
  ticket: TicketSummary;
  context: string;
  universe: TicketUniverse;
  depth: TicketSearchDepth;
}

const MATCH_SOURCE_LABELS: Record<string, string> = {
  title: "Titulo",
  content: "Descricao",
  followup: "Followup",
  task: "Task",
  solution: "Solution",
};

function normalizeTicketText(value: string | null | undefined): string {
  if (!value) {
    return "Sem descricao disponivel.";
  }

  const htmlBreaksNormalized = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, " ");

  const htmlEntitiesDecoded = htmlBreaksNormalized
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'");

  const normalizedLines = htmlEntitiesDecoded
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim());

  const compactLines: string[] = [];
  for (const line of normalizedLines) {
    if (!line) {
      if (compactLines.length > 0 && compactLines[compactLines.length - 1] !== "") {
        compactLines.push("");
      }
      continue;
    }
    compactLines.push(line);
  }

  const normalized = compactLines.join("\n").trim();
  return normalized || "Sem descricao disponivel.";
}

function buildDescriptionPreview(value: string): { preview: string; truncated: boolean } {
  const maxChars = 280;
  const maxLines = 4;
  const lines = value.split("\n");
  const limitedLines = lines.slice(0, maxLines).join("\n");
  let preview = limitedLines;
  let truncated = lines.length > maxLines;

  if (preview.length > maxChars) {
    preview = `${preview.slice(0, maxChars).trimEnd()}...`;
    truncated = true;
  } else if (truncated) {
    preview = `${preview.trimEnd()}...`;
  }

  if (!truncated && preview.length < value.length) {
    preview = `${preview.trimEnd()}...`;
    truncated = true;
  }

  return {
    preview,
    truncated,
  };
}

function splitEntityHierarchy(value: string): string[] {
  const delimiters = [/\s*>\s*/, /\s*\/\s*/, /\s*\|\s*/, /\s*»\s*/, /\s*::\s*/];
  for (const delimiter of delimiters) {
    const segments = value
      .split(delimiter)
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (segments.length > 1) {
      return segments;
    }
  }

  return [value.trim()].filter(Boolean);
}

const EntityHierarchyValue: React.FC<{ value: string }> = ({ value }) => {
  const [expanded, setExpanded] = useState(false);

  const segments = useMemo(() => splitEntityHierarchy(value), [value]);
  const hiddenLevels = Math.max(segments.length - 3, 0);
  const collapsedText = segments.length > 3
    ? `${segments[0]} > ... > ${segments.slice(-2).join(" > ")}`
    : segments.join(" > ");

  return (
    <div className="space-y-1.5">
      <div className="break-words text-[11px] font-semibold leading-snug text-text-1" title={segments.join(" > ")}>
        {expanded ? segments.join(" > ") : collapsedText}
      </div>
      {hiddenLevels > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="text-[9px] font-bold uppercase tracking-widest text-accent-blue transition-colors hover:text-white"
        >
          {expanded ? "Recolher hierarquia" : `Ver hierarquia completa (+${hiddenLevels} niveis)`}
        </button>
      )}
    </div>
  );
};

export const TicketSearchResultCard: React.FC<TicketSearchResultCardProps> = ({
  ticket,
  context,
  universe,
  depth,
}) => {
  const [showFullDescription, setShowFullDescription] = useState(false);

  const formatDate = (dateStr: string | null | undefined) => formatIsoDateTime(dateStr) || "--/--/----";
  const glpiUrl = context === "dtic"
    ? `http://cau.ppiratini.intra.rs.gov.br/glpi/front/ticket.form.php?id=${ticket.id}`
    : `http://10.72.30.39/sis/front/ticket.form.php?id=${ticket.id}`;

  const universeLabel = universe === "historical" ? "Historico" : "Operacional";
  const matchLabel = ticket.matchSource ? MATCH_SOURCE_LABELS[ticket.matchSource] || ticket.matchSource : null;
  const entityValue = ticket.entityName || ticket.entity_name || "Central de Atendimentos";
  const normalizedDescription = useMemo(() => normalizeTicketText(ticket.content), [ticket.content]);
  const descriptionPreview = useMemo(() => buildDescriptionPreview(normalizedDescription), [normalizedDescription]);
  const displayedDescription = showFullDescription || !descriptionPreview.truncated
    ? normalizedDescription
    : descriptionPreview.preview;

  return (
    <GlassCard className="group/card overflow-hidden border-white/5 p-0 transition-colors hover:border-white/10">
      <div className="p-6 pb-4">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info" className="px-3 py-1 text-xs">#{ticket.id}</Badge>
              <Badge variant={universe === "historical" ? "violet" : "warning"}>{universeLabel}</Badge>
              {ticket.requestType && <Badge variant="orange">{ticket.requestType}</Badge>}
              {depth === "expanded" && matchLabel && <Badge variant="success">Match: {matchLabel}</Badge>}
            </div>
            <h3 className="text-lg font-bold text-text-1 transition-colors group-hover/card:text-white">
              {ticket.title}
            </h3>
          </div>

          <div className="flex flex-col items-end text-right text-[10px] font-bold uppercase tracking-widest text-text-3">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} className="opacity-50" />
              Data de Registro
            </span>
            <span className="mt-0.5 text-xs text-text-1">{formatDate(ticket.dateCreated)}</span>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-text-3">
          <span className="rounded bg-white/5 px-2 py-0.5">GLPI {context.toUpperCase()}</span>
          <span className="opacity-40">-</span>
          <span className="opacity-60">Modificado em {formatDate(ticket.dateModified)}</span>
          {ticket.location && (
            <>
              <span className="opacity-40">-</span>
              <span className="opacity-60">{ticket.location}</span>
            </>
          )}
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <MetaItem icon={Building2} label="Entidade">
            <EntityHierarchyValue value={entityValue} />
          </MetaItem>
          <MetaItem icon={Tag} label="Categoria" value={ticket.category} />
          <MetaItem icon={User} label="Requerente" value={ticket.requester} />
          <MetaItem icon={UserCog} label="Tecnico" value={ticket.technician || "Aguardando"} />
          <MetaItem icon={Users} label="Grupo" value={ticket.groupName || "N/A"} />
        </div>

        {depth === "expanded" && ticket.matchExcerpt && (
          <div className="mb-4 rounded-lg border border-success/15 bg-success/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-success">
              <Search size={12} />
              Correspondencia encontrada em {matchLabel?.toLowerCase() || "conteudo"}
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-text-1">{normalizeTicketText(ticket.matchExcerpt)}</p>
          </div>
        )}

        <div className="relative mb-6 rounded-lg border border-white/5 bg-surface-0/50 p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-text-3">
            Descricao do Problema
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-text-2">
            {displayedDescription}
          </p>

          {descriptionPreview.truncated && (
            <button
              type="button"
              onClick={() => setShowFullDescription((current) => !current)}
              className="mt-3 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-accent-blue transition-colors hover:text-white"
            >
              {showFullDescription ? (
                <>
                  <ChevronUp size={12} />
                  Ver conteudo resumido
                </>
              ) : (
                <>
                  <ChevronDown size={12} />
                  Ver conteudo completo
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-3">Prioridade:</span>
            <span className="text-[10px] font-bold uppercase text-warning">{ticket.urgency || "Media"}</span>
          </div>

          <a href={glpiUrl} target="_blank" rel="noopener noreferrer">
            <PremiumButton
              size="sm"
              variant="primary"
              className="h-auto px-6 py-2 text-[11px]"
              icon={<ExternalLink size={14} />}
            >
              Ver detalhes no GLPI
            </PremiumButton>
          </a>
        </div>
      </div>
    </GlassCard>
  );
};

interface MetaItemProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  children?: React.ReactNode;
}

const MetaItem: React.FC<MetaItemProps> = ({ icon: Icon, label, value, children }) => (
  <div className="flex flex-col gap-1.5 rounded-lg border border-white/[0.03] bg-surface-2/40 p-3">
    <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-text-3 opacity-60">
      <Icon size={12} />
      {label}
    </div>
    {children || (
      <div className="break-words text-[11px] font-semibold leading-snug text-text-1" title={value}>
        {value || "---"}
      </div>
    )}
  </div>
);
