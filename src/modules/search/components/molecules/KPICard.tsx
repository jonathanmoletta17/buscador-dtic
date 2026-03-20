import React from 'react';
import { LucideIcon } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

interface KPICardProps {
  label: string;
  count: number;
  icon: LucideIcon;
  variant: 'success' | 'info' | 'warning' | 'danger' | 'violet' | 'orange';
  selected?: boolean;
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  count,
  icon: Icon,
  variant,
  selected,
  onClick
}) => {
  const variants = {
    success: 'from-success/20 to-success/5 text-success border-success/20',
    info: 'from-info/20 to-info/5 text-info border-info/20',
    warning: 'from-warning/20 to-warning/5 text-warning border-warning/20',
    danger: 'from-danger/20 to-danger/5 text-danger border-danger/20',
    violet: 'from-accent-violet/20 to-accent-violet/5 text-accent-violet border-accent-violet/20',
    orange: 'from-accent-orange/20 to-accent-orange/5 text-accent-orange border-accent-orange/20',
  };

  return (
    <div 
      onClick={onClick}
      className={`
        cursor-pointer transition-all duration-300 transform
        ${selected ? 'scale-[1.02] -translate-y-1' : 'hover:scale-[1.01] hover:-translate-y-0.5'}
        active:scale-[0.98]
      `}
    >
      <GlassCard className={`
        relative overflow-hidden p-6 h-32 flex flex-col justify-between
        bg-gradient-to-br ${variants[variant]}
        ${selected ? 'border-opacity-100 ring-2 ring-border-2' : 'border-opacity-30'}
      `}>
        <div className="flex justify-between items-start">
          <Icon size={20} className="opacity-80" />
          <span className="text-3xl font-bold tracking-tighter">{count}</span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
          {label}
        </span>
        
        {/* Subtle Decorative Glow */}
        <div className={`
          absolute -bottom-4 -right-4 w-16 h-16 rounded-full blur-2xl opacity-20
          bg-current
        `} />
      </GlassCard>
    </div>
  );
};
