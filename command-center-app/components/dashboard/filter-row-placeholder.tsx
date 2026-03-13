import { SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { FilterToken } from "@/lib/dashboard/types";

type FilterRowPlaceholderProps = {
  filters: readonly FilterToken[];
  label?: string;
};

export function FilterRowPlaceholder({
  filters,
  label = "Filter placeholders"
}: FilterRowPlaceholderProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="gap-2 rounded-full border-border/80 px-3 py-1.5">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        {label}
      </Badge>
      {filters.map((filter) => (
        <div
          key={filter.id}
          className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground"
        >
          <span className="text-foreground">{filter.label}:</span> {filter.value}
        </div>
      ))}
    </div>
  );
}
