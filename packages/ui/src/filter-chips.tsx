// FilterChips (pagedesign.md §5, §8.4 design v2): list filters as small grey chips
// (components.chip) with counts — "Tümü 5 · Aldım 3 …". One is pressed at a time;
// the pressed chip is marked by a check and weight as well as its fill (never colour alone).
import { Check } from "lucide-react";
import { chipClasses } from "./attribute-chip";
import { cn } from "./cn";
import { Icon } from "./icon";

export interface FilterChipOption<T extends string> {
  id: T;
  label: string;
  count: number;
}

export interface FilterChipsProps<T extends string> {
  /** Accessible name of the group ("Filtreler"). */
  label: string;
  options: readonly FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function FilterChips<T extends string>({ label, options, value, onChange, className }: FilterChipsProps<T>) {
  return (
    <div role="group" aria-label={label} className={cn("flex flex-wrap items-center gap-2", className)}>
      {options.map((option) => {
        const pressed = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.id)}
            className={chipClasses(pressed ? "bg-primary-subtle font-semibold text-on-primary-subtle hover:bg-primary-subtle" : undefined)}
          >
            {pressed && <Icon icon={Check} size="sm" />}
            <span>{option.label}</span>
            <span className={cn("tabular-nums", pressed ? "text-on-primary-subtle" : "text-text-muted")}>{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}
