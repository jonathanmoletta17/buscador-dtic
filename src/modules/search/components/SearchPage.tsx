"use client";

import React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

import { useTicketsSearch } from "../hooks/useTicketsSearch";
import { SearchInput } from "./atoms/SearchInput";
import { KPIGrid } from "./organisms/KPIGrid";
import { TicketList } from "./organisms/TicketList";
import { SearchControls } from "./organisms/SearchControls";
import { ActiveFilterChips } from "./organisms/ActiveFilterChips";

interface SearchPageProps {
  context: string;
  department?: string;
}

export function SearchPage({ context, department }: SearchPageProps) {
  const [searchFocused, setSearchFocused] = React.useState(false);

  const {
    searchInput,
    setSearchInput,
    searching,
    loading,
    tickets,
    totalCount,
    stats,
    filterOptions,
    filterOptionsLoading,
    periodError,
    resultMeta,
    summaryLabel,
    filters,
    pagination,
  } = useTicketsSearch({
    context,
    department,
    debounceMs: 300,
  });

  const themeClass = department === "conservacao"
    ? "theme-memoria"
    : department === "manutencao" || context === "sis"
      ? "theme-manutencao"
      : "theme-dtic";

  const headerTitle = department === "dtic" || context === "dtic"
    ? "Buscador DTIC"
    : department === "manutencao"
      ? "Buscador SIS - Manutencao"
      : "Buscador SIS - Conservacao";

  const headerSubtitle = department === "dtic" || context === "dtic"
    ? "Central de Atendimento ao Usuario - Busca de chamados DTIC"
    : department === "manutencao"
      ? "Central de Atendimento ao Usuario - Busca de chamados SIS Manutencao"
      : "Central de Atendimento ao Usuario - Busca de chamados SIS Conservacao";

  return (
    <div className={`custom-scrollbar relative flex h-screen flex-col overflow-y-auto ${themeClass}`}>
      <header className="z-10 px-6 pb-8 pt-16 text-center md:pb-10 md:pt-20">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="space-y-4"
        >
          <motion.div
            initial={false}
            animate={
              searchFocused
                ? { opacity: 0, y: -80, height: 0, marginBottom: 0 }
                : { opacity: 1, y: 0, height: "auto", marginBottom: 16 }
            }
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
            aria-hidden={searchFocused}
          >
            <div className="mb-8 flex justify-center">
              <div className="glow-premium relative mb-2 h-24 w-24 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]">
                <Image
                  src="/assets/branding/brasao_rs.svg"
                  alt="Brasao Oficial RS"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
            <h1 className="mb-2 text-3xl font-black uppercase italic tracking-tight text-white md:text-5xl">
              {headerTitle}
            </h1>
            <p className="mb-10 text-[12px] font-bold uppercase tracking-[0.4em] text-text-3 opacity-60">
              {headerSubtitle}
            </p>
          </motion.div>

          <SearchInput
            value={searchInput}
            onChange={setSearchInput}
            onFocusChange={setSearchFocused}
            className={searchFocused ? "mb-1" : "mb-4"}
          />
        </motion.div>
      </header>

      <main className="z-10 mx-auto flex-1 w-full max-w-7xl space-y-10 px-6 pb-20">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
        >
          <SearchControls
            universe={filters.universe}
            onUniverseChange={filters.setUniverse}
            depth={filters.depth}
            onDepthChange={filters.setDepth}
            periodPreset={filters.periodPreset}
            onPeriodPresetChange={filters.setPeriodPreset}
            dateFrom={filters.dateFrom}
            onDateFromChange={filters.setDateFrom}
            dateTo={filters.dateTo}
            onDateToChange={filters.setDateTo}
            periodError={periodError}
            filterOptions={filterOptions}
            filterOptionsLoading={filterOptionsLoading}
            advancedOpen={filters.advancedOpen}
            onAdvancedToggle={filters.setAdvancedOpen}
            activeAdvancedCount={filters.activeAdvancedCount}
            entityId={filters.entityId}
            onEntityChange={filters.setEntityId}
            categoryId={filters.categoryId}
            onCategoryChange={filters.setCategoryId}
            locationId={filters.locationId}
            onLocationChange={filters.setLocationId}
            groupId={filters.groupId}
            onGroupChange={filters.setGroupId}
            technicianId={filters.technicianId}
            onTechnicianChange={filters.setTechnicianId}
            onResetFilters={filters.resetAllFilters}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <KPIGrid
            stats={stats}
            selectedStatusId={filters.selectedStatusId}
            onStatusChange={filters.setSelectedStatusId}
            isLoading={loading}
            showClosed={filters.universe === "historical"}
          />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15 }}
        >
          <ActiveFilterChips chips={filters.activeFilterChips} />
        </motion.section>

        <section className="relative">
          <AnimatePresence mode="wait">
            {searching && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -top-6 left-0 animate-pulse text-[10px] font-bold uppercase tracking-widest text-accent-blue"
              >
                Pesquisando no banco de dados...
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <TicketList
              tickets={tickets}
              totalCount={totalCount}
              resultMeta={resultMeta}
              context={context}
              universe={filters.universe}
              depth={filters.depth}
              summaryLabel={summaryLabel}
              sortBy={filters.sortBy}
              onSortChange={filters.setSortBy}
              isLoading={loading}
              pagination={{
                currentPage: pagination.currentPage,
                totalPages: pagination.totalPages,
                onPageChange: pagination.setCurrentPage,
              }}
            />
          </motion.div>
        </section>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1 }}
          className="flex justify-center gap-6 pt-10 text-[10px] font-bold uppercase tracking-widest text-text-3"
        >
          <span className="flex items-center gap-2">/ Focar busca</span>
          <span className="flex items-center gap-2">Esc Limpar</span>
          <span className="flex items-center gap-2">Alt+1/2 Ordenar</span>
        </motion.footer>
      </main>
    </div>
  );
}
