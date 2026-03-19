"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTicketsSearch } from '../hooks/useTicketsSearch';
import { SearchInput } from './atoms/SearchInput';
import { KPIGrid } from './organisms/KPIGrid';
import { TicketList } from './organisms/TicketList';
import Image from "next/image";

interface SearchPageProps {
  context: string;
  department?: string;
}

export function SearchPage({ context, department }: SearchPageProps) {
  const {
    searchInput,
    setSearchInput,
    searching,
    loading,
    tickets,
    totalCount,
    stats,
    filters,
  } = useTicketsSearch({
    context,
    department,
    debounceMs: 300
  });

  const themeClass = department === 'conservacao' ? 'theme-memoria' : (department === 'manutencao' || context === 'sis' ? 'theme-manutencao' : 'theme-dtic');

  return (
    <div className={`h-screen overflow-y-auto custom-scrollbar relative flex flex-col ${themeClass}`}>
      {/* Search Header Section */}
      <header className="pt-20 pb-16 px-6 text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex justify-center mb-8">
             <div className="w-24 h-24 relative mb-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)] glow-premium">
              <Image 
                  src="/assets/branding/brasao_rs.svg" 
                  alt="Brasão Oficial RS" 
                  fill
                  className="object-contain"
                />
             </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white mb-2 uppercase italic">
            GLPI <span className="text-accent-blue">Smart</span> Search
          </h1>
          <p className="text-[12px] font-bold text-text-3 uppercase tracking-[0.4em] mb-12 opacity-60">
            Central de Atendimento ao Usuário • Sistema de Busca Inteligente
          </p>
          
          <SearchInput 
            value={searchInput} 
            onChange={setSearchInput}
            className="mb-4"
          />
        </motion.div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 pb-20 z-10 space-y-16">
        {/* Statistics Grid */}
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
          />
        </motion.section>

        {/* Results Section */}
        <section className="relative">
          <AnimatePresence mode="wait">
            {searching && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute -top-6 left-0 text-[10px] text-accent-blue animate-pulse font-bold tracking-widest uppercase"
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
              context={context}
              sortBy={filters.sortBy}
              onSortChange={filters.setSortBy}
              isLoading={loading}
            />
          </motion.div>
        </section>

        {/* Shortcut Legend */}
        <motion.footer 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 1 }}
          className="flex justify-center gap-6 text-[10px] text-text-3 uppercase font-bold tracking-widest pt-10"
        >
           <span className="flex items-center gap-2">/ Focar busca</span>
           <span className="flex items-center gap-2">Esc Limpar</span>
           <span className="flex items-center gap-2">Alt+1/2 Ordenar</span>
        </motion.footer>
      </main>
    </div>
  );
}
