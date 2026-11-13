"use client";

// SegmentedChoice (product_design_pattern.md §4.3): a small set of mutually
// exclusive options — order status, ranges, durations, filters with counts,
// tabs. The selected option is raised/filled and announced as pressed.
// "segmented": equal parts in a surface-alt track · "chips": pill filters with counts.
import { cn, focusRing } from "./cn";

export interface SegmentedOption {
  value: string;
  label: string;
  count?: number;
}

export interface SegmentedChoiceProps {
  /** Accessible name of the group ("Sipariş durumu"). */
  label: string;
  options: readonly SegmentedOption[];
  value: string;
  onValueChange: (value: string) => void;
  variant?: "segmented" | "chips";
  /** Formats a count in the user's language. */
  formatCount?: (count: number) => string;
  className?: string;
}

export function SegmentedChoice({ label, options, value, onValueChange, variant = "segmented", formatCount = String, className }: SegmentedChoiceProps) {
  const chips = variant === "chips";
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(chips ? "flex gap-2 overflow-x-auto md:flex-wrap" : "flex flex-wrap gap-1 rounded-md bg-surface-alt p-1", className)}
    >
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "inline-flex min-h-(--size-touch-target-min) shrink-0 items-center justify-center gap-1 text-body-sm",
              chips
                ? cn("rounded-pill border px-3", pressed ? "border-primary bg-primary-subtle font-semibold text-on-primary-subtle" : "border-border bg-surface font-medium text-text")
                : cn("flex-1 rounded-sm px-3", pressed ? "bg-surface font-semibold text-text shadow-sm" : "font-medium text-text-muted"),
              focusRing,
            )}
          >
            <span>{option.label}</span>
            {option.count !== undefined && <span className="tabular-nums">{formatCount(option.count)}</span>}
          </button>
        );
      })}
    </div>
  );
}
