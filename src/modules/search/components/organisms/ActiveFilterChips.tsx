import React from "react";
import { X } from "lucide-react";

import { Badge } from "../atoms/Badge";

interface ActiveFilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
}

export function ActiveFilterChips({ chips }: ActiveFilterChipsProps) {
  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="group"
        >
          <Badge variant="info" className="inline-flex items-center gap-2 border-info/30 px-3 py-1 hover:border-info/50">
            <span>{chip.label}</span>
            <X size={12} className="transition-transform group-hover:scale-110" />
          </Badge>
        </button>
      ))}
    </div>
  );
}
