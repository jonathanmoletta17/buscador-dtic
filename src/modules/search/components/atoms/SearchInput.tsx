import React, { useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { PremiumInput } from "@/components/ui/premium-input";
import { Kbd } from "./Kbd";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "Pesquisar chamados...",
  className = ""
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Atalho '/' para focar
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // 'Esc' para limpar e desfocar
      if (e.key === "Escape") {
        if (value !== "") onChange("");
        inputRef.current?.blur();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value, onChange]);

  return (
    <div className={`relative w-full max-w-2xl mx-auto ${className}`}>
      <PremiumInput
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        icon={<Search size={18} />}
        className="pr-12"
      />
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-focus-within:opacity-20 transition-opacity">
        <Kbd>/</Kbd>
      </div>
    </div>
  );
};
