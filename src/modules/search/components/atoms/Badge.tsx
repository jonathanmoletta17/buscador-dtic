import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'violet' | 'orange';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'default',
  className = "" 
}) => {
  const variants = {
    default: 'bg-surface-3 text-text-2 border-white/10',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    danger: 'bg-danger/10 text-danger border-danger/20',
    info: 'bg-info/10 text-info border-info/20',
    violet: 'bg-accent-violet/10 text-accent-violet border-accent-violet/20',
    orange: 'bg-accent-orange/10 text-accent-orange border-accent-orange/20',
  };

  return (
    <span className={`
      px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
      ${variants[variant]}
      ${className}
    `}>
      {children}
    </span>
  );
};
