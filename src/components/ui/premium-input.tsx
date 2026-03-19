import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
}

export const PremiumInput = React.forwardRef<HTMLInputElement, InputProps>(({ 
  label, 
  icon,
  className, 
  ...props 
}, ref) => {
  return (
    <div className="space-y-2 group">
      {label && <label className="block text-[11px] font-semibold text-text-3 uppercase tracking-widest group-focus-within:text-accent-blue transition-colors">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-3 group-focus-within:text-accent-blue transition-colors">
            {icon}
          </div>
        )}
        <input 
          ref={ref}
          className={cn(
            "w-full bg-surface-2 border border-white/5 rounded-xl py-3 px-4 outline-none transition-all duration-200",
            "text-text-1 placeholder:text-text-3",
            "focus:border-accent-blue/50 focus:bg-surface-3 focus:shadow-[0_0_12px_rgba(59,130,246,0.1)]",
            icon && "pl-12",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
});

PremiumInput.displayName = "PremiumInput";
