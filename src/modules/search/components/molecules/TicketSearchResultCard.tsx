import React, { useState } from 'react';
import { 
  Building2, 
  Tag, 
  User, 
  UserCog, 
  Users, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Calendar
} from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '../atoms/Badge';
import { PremiumButton } from '@/components/ui/premium-button';
import { formatIsoDateTime } from '@/lib/datetime/iso';
import type { TicketSummary } from '@/lib/api/types';

interface TicketSearchResultCardProps {
  ticket: TicketSummary;
  context: string;
}

export const TicketSearchResultCard: React.FC<TicketSearchResultCardProps> = ({ 
  ticket, 
  context 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Formatação de data simples
  const formatDate = (dateStr: string | null | undefined) =>
    formatIsoDateTime(dateStr) || '--/--/----';

  const glpiUrl = context === 'dtic' 
    ? `http://cau.ppiratini.intra.rs.gov.br/glpi/front/ticket.form.php?id=${ticket.id}`
    : `http://10.72.30.39/sis/front/ticket.form.php?id=${ticket.id}`;

  return (
    <GlassCard className="p-0 overflow-hidden border-white/5 hover:border-white/10 transition-colors group/card">
      {/* Top Banner / Header */}
      <div className="p-6 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Badge variant="info" className="px-3 py-1 text-xs">#{ticket.id}</Badge>
            <h3 className="text-lg font-bold text-text-1 group-hover/card:text-white transition-colors">
              {ticket.title}
            </h3>
          </div>
          
          <div className="flex flex-col items-end text-[10px] text-text-3 uppercase font-bold tracking-widest text-right">
            <span className="flex items-center gap-1.5">
              <Calendar size={12} className="opacity-50" />
              Data de Registro
            </span>
            <span className="text-text-1 text-xs mt-0.5">{formatDate(ticket.dateCreated)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.2em] text-text-3 mb-6">
          <span className="bg-white/5 px-2 py-0.5 rounded">GLPI {context.toUpperCase()}</span>
          <span className="opacity-40">•</span>
          <span className="opacity-60">Modificado em {formatDate(ticket.dateModified)}</span>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <MetaItem icon={Building2} label="Entidade" value={ticket.entityName || ticket.entity_name || "Central de Atendimentos"} />
          <MetaItem icon={Tag} label="Categoria" value={ticket.category} />
          <MetaItem icon={User} label="Requerente" value={ticket.requester} />
          <MetaItem icon={UserCog} label="Técnico" value={ticket.technician || "Aguardando"} />
          <MetaItem icon={Users} label="Grupo" value={ticket.groupName || "N/A"} />
        </div>

        {/* Description Preview */}
        <div className="bg-surface-0/50 rounded-lg border border-white/5 p-4 mb-6 relative">
          <div className="text-[10px] font-bold text-text-3 uppercase tracking-widest mb-2 flex items-center gap-2">
            Descrição do Problema
          </div>
          <p className={`text-sm text-text-2 leading-relaxed ${!isExpanded && 'line-clamp-2'}`}>
            {ticket.content || "Sem descrição disponível."}
          </p>
          
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-accent-blue uppercase tracking-widest hover:text-white transition-colors"
          >
            {isExpanded ? (
              <><ChevronUp size={12} /> Ver conteúdo resumido</>
            ) : (
              <><ChevronDown size={12} /> Ver conteúdo completo</>
            )}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-3 uppercase tracking-widest">Prioridade:</span>
            <span className="text-[10px] font-bold text-warning uppercase">{ticket.urgency || "Média"}</span>
          </div>
          
          <a href={glpiUrl} target="_blank" rel="noopener noreferrer">
            <PremiumButton 
              size="sm" 
              variant="primary" 
              className="px-6 py-2 h-auto text-[11px]"
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
}

const MetaItem: React.FC<MetaItemProps> = ({ icon: Icon, label, value }) => (
  <div className="bg-surface-2/40 border border-white/[0.03] p-3 rounded-lg flex flex-col gap-1.5">
    <div className="flex items-center gap-2 text-[9px] text-text-3 uppercase font-bold tracking-widest opacity-60">
      <Icon size={12} />
      {label}
    </div>
    <div className="text-[11px] font-semibold text-text-1 truncate" title={value}>
      {value || "---"}
    </div>
  </div>
);
