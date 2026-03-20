import React from "react";
import { CalendarRange, Layers3, SlidersHorizontal } from "lucide-react";

import { GlassCard } from "@/components/ui/glass-card";
import type { TicketFilterOptions, TicketSearchDepth, TicketUniverse } from "@/lib/api/types";

type PeriodPreset = "7d" | "30d" | "90d" | "custom";

interface SearchControlsProps {
  universe: TicketUniverse;
  onUniverseChange: (value: TicketUniverse) => void;
  depth: TicketSearchDepth;
  onDepthChange: (value: TicketSearchDepth) => void;
  periodPreset: PeriodPreset;
  onPeriodPresetChange: (value: PeriodPreset) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  periodError: string | null;
  filterOptions: TicketFilterOptions | null;
  filterOptionsLoading?: boolean;
  advancedOpen: boolean;
  onAdvancedToggle: (value: boolean) => void;
  activeAdvancedCount: number;
  entityId: number | null;
  onEntityChange: (value: number | null) => void;
  categoryId: number | null;
  onCategoryChange: (value: number | null) => void;
  locationId: number | null;
  onLocationChange: (value: number | null) => void;
  groupId: number | null;
  onGroupChange: (value: number | null) => void;
  technicianId: number | null;
  onTechnicianChange: (value: number | null) => void;
  onResetFilters: () => void;
}

function parseSelectInteger(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function SegmentedButton<T extends string>({
  value,
  currentValue,
  onSelect,
  children,
}: {
  value: T;
  currentValue: T;
  onSelect: (value: T) => void;
  children: React.ReactNode;
}) {
  const active = value === currentValue;

  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={[
        "whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.18em] transition-all",
        active
          ? "bg-accent-blue text-white shadow-[0_0_16px_rgba(59,130,246,0.24)]"
          : "text-text-3 hover:bg-overlay-1 hover:text-text-1",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  options: Array<{ id: number; label: string; total: number }>;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-text-3">
        {label}
      </span>
      <select
        value={value ?? ""}
        onChange={(event) => onChange(parseSelectInteger(event.target.value))}
        disabled={disabled}
        className="w-full rounded-xl border border-border-1 bg-surface-2 px-3 py-3 text-sm text-text-1 outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus:border-accent-blue/60"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label} ({option.total})
          </option>
        ))}
      </select>
    </label>
  );
}

export function SearchControls({
  universe,
  onUniverseChange,
  depth,
  onDepthChange,
  periodPreset,
  onPeriodPresetChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  periodError,
  filterOptions,
  filterOptionsLoading = false,
  advancedOpen,
  onAdvancedToggle,
  activeAdvancedCount,
  entityId,
  onEntityChange,
  categoryId,
  onCategoryChange,
  locationId,
  onLocationChange,
  groupId,
  onGroupChange,
  technicianId,
  onTechnicianChange,
  onResetFilters,
}: SearchControlsProps) {
  const advancedDisabled = filterOptionsLoading || !filterOptions;

  return (
    <GlassCard className="border-border-1 p-5 md:p-6">
      <div className="space-y-5">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4 rounded-2xl border border-border-1 bg-surface-1/45 p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.26em] text-text-3">
              <CalendarRange size={14} />
              Periodo
            </div>

            <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
              <div className="flex flex-wrap items-center gap-2">
                {(["7d", "30d", "90d", "custom"] as PeriodPreset[]).map((preset) => (
                  <SegmentedButton
                    key={preset}
                    value={preset}
                    currentValue={periodPreset}
                    onSelect={onPeriodPresetChange}
                  >
                    {preset === "custom" ? "Custom" : preset}
                  </SegmentedButton>
                ))}
              </div>

              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-text-3">
                  Data inicial
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => onDateFromChange(event.target.value)}
                  className="w-full rounded-xl border border-border-1 bg-surface-2 px-3 py-3 text-sm text-text-1 outline-none transition-colors focus:border-accent-blue/60"
                />
              </label>

              <label className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-text-3">
                  Data final
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => onDateToChange(event.target.value)}
                  className="w-full rounded-xl border border-border-1 bg-surface-2 px-3 py-3 text-sm text-text-1 outline-none transition-colors focus:border-accent-blue/60"
                />
              </label>
            </div>

            {periodError && (
              <p className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {periodError}
              </p>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-border-1 bg-surface-1/45 p-4 sm:p-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.26em] text-text-3">
                <Layers3 size={14} />
                Profundidade
              </div>
              <div className="inline-flex rounded-xl border border-border-1 bg-surface-1 p-1">
                <SegmentedButton value="basic" currentValue={depth} onSelect={onDepthChange}>
                  Busca basica
                </SegmentedButton>
                <SegmentedButton value="expanded" currentValue={depth} onSelect={onDepthChange}>
                  Busca expandida
                </SegmentedButton>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onAdvancedToggle(!advancedOpen)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-1 bg-surface-1 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-text-2 transition-colors hover:border-border-2 hover:text-text-1"
              >
                <SlidersHorizontal size={14} />
                Filtros
                {activeAdvancedCount > 0 && (
                  <span className="rounded-full bg-accent-blue/20 px-2 py-0.5 text-[10px] text-accent-blue">
                    {activeAdvancedCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onResetFilters}
                className="rounded-xl border border-border-1 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-text-3 transition-colors hover:border-border-2 hover:text-text-1"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </section>

        {advancedOpen && (
          <section className="space-y-4 rounded-2xl border border-border-1 bg-surface-1/35 p-4 sm:p-5">
            <div className="grid gap-4 xl:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] xl:items-start">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-text-3">
                  <Layers3 size={14} />
                  Escopo dos chamados
                </div>
                <div className="inline-flex rounded-xl border border-border-1 bg-surface-1 p-1">
                  <SegmentedButton value="historical" currentValue={universe} onSelect={onUniverseChange}>
                    Historico
                  </SegmentedButton>
                  <SegmentedButton value="active" currentValue={universe} onSelect={onUniverseChange}>
                    Operacional
                  </SegmentedButton>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <FilterSelect
                  label="Entidade"
                  value={entityId}
                  onChange={onEntityChange}
                  options={filterOptions?.entities ?? []}
                  placeholder="Todas as entidades"
                  disabled={advancedDisabled}
                />
                <FilterSelect
                  label="Categoria"
                  value={categoryId}
                  onChange={onCategoryChange}
                  options={filterOptions?.categories ?? []}
                  placeholder="Todas as categorias"
                  disabled={advancedDisabled}
                />
                <FilterSelect
                  label="Local"
                  value={locationId}
                  onChange={onLocationChange}
                  options={filterOptions?.locations ?? []}
                  placeholder="Todos os locais"
                  disabled={advancedDisabled}
                />
                <FilterSelect
                  label="Grupo"
                  value={groupId}
                  onChange={onGroupChange}
                  options={filterOptions?.groups ?? []}
                  placeholder="Todos os grupos"
                  disabled={advancedDisabled}
                />
                <FilterSelect
                  label="Tecnico"
                  value={technicianId}
                  onChange={onTechnicianChange}
                  options={filterOptions?.technicians ?? []}
                  placeholder="Todos os tecnicos"
                  disabled={advancedDisabled}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </GlassCard>
  );
}
