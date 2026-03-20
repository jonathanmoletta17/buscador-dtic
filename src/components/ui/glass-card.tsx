import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GlassCard = ({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => {
  return (
    <div className={cn(
      "glass rounded-2xl p-8 relative overflow-hidden",
      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-overlay-1 before:to-transparent before:pointer-events-none",
      "shadow-[0_8px_32px_rgba(15,23,42,0.24)]",
      className
    )}>
      {children}
    </div>
  );
};
