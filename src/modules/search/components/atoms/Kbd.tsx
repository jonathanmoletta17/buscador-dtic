import React from 'react';

interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export const Kbd: React.FC<KbdProps> = ({ children, className = "" }) => {
  return (
    <kbd className={`
      px-1.5 py-0.5 
      text-[10px] font-mono font-bold 
      bg-surface-3 border border-border-1 rounded 
      text-text-3 shadow-inner
      ${className}
    `}>
      {children}
    </kbd>
  );
};
