import React from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
}

export const PremiumButton = ({ 
  children, 
  className, 
  variant = "primary",
  size = "md",
  icon,
  ...props 
}: ButtonProps) => {
  const sizeClasses = {
    sm: "min-h-[36px] py-1.5 px-4 text-xs rounded-lg",
    md: "min-h-[48px] py-2 px-6 rounded-xl",
    lg: "min-h-[56px] py-3 px-8 text-lg rounded-2xl",
  };
  const variants = {
    primary: "bg-accent-blue text-white shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:brightness-110 active:scale-[0.98]",
    secondary: "bg-surface-3 text-text-1 border border-border-1 hover:bg-surface-4 active:scale-[0.98]",
    ghost: "bg-transparent text-text-2 hover:text-text-1 hover:bg-white/5",
  };

  return (
    <button 
      className={cn(
        "relative font-semibold transition-all duration-200 overflow-hidden group flex items-center justify-center gap-2",
        variants[variant],
        sizeClasses[size],
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:-translate-x-full hover:before:animate-[shimmer_1.5s_infinite]",
        className
      )}
      {...props}
    >
      {icon && <span className="relative z-10 shrink-0">{icon}</span>}
      <span className="relative z-10">{children}</span>
      <style jsx>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </button>
  );
};
