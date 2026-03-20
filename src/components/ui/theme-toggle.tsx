"use client";

import React from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "buscador_theme";

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "light" || value === "dark";
}

function resolveTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "dark";
  }

  const fromDom = document.documentElement.dataset.theme ?? null;
  if (isThemeMode(fromDom)) {
    return fromDom;
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(stored)) {
      return stored;
    }
  } catch {
    // ignore localStorage failures
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore localStorage failures
  }
}

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const [mounted, setMounted] = React.useState(false);
  const [theme, setTheme] = React.useState<ThemeMode>("dark");

  React.useEffect(() => {
    const resolvedTheme = resolveTheme();
    applyTheme(resolvedTheme);
    setTheme(resolvedTheme);
    setMounted(true);
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme: ThemeMode = currentTheme === "dark" ? "light" : "dark";
      applyTheme(nextTheme);
      return nextTheme;
    });
  }, []);

  if (!mounted) {
    return (
      <div
        aria-hidden="true"
        className={`h-9 w-[150px] rounded-full border border-border-1 bg-surface-1/80 ${className}`}
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-9 items-center gap-2 rounded-full border border-border-1 bg-surface-1/80 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-text-2 transition-colors hover:border-border-2 hover:text-text-1 ${className}`}
      title={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
      aria-label={isDark ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      {isDark ? <Sun size={14} className="text-warning" /> : <Moon size={14} className="text-info" />}
      <span>{isDark ? "Modo claro" : "Modo escuro"}</span>
    </button>
  );
}
