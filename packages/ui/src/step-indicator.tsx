// StepIndicator (product_design_pattern.md §5.24): numbered steps with text
// labels; the current step is emphasised by weight and border, completed steps
// carry a check icon. Optional progress line ("3 ürün bulduk · 2/3") with a
// ghost "Atla" control for skippable steps.
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

export interface StepIndicatorProps {
  /** Accessible name of the list ("Adımlar"). */
  label: string;
  steps: readonly string[];
  /** Zero-based index of the current step. */
  current: number;
  /** Screen-reader text for a completed step ("tamamlandı"). */
  completedLabel: string;
  /** Progress line under the steps, e.g. bulk add "2/3", with an optional skip control. */
  progress?: ReactNode;
  className?: string;
}

export function StepIndicator({ label, steps, current, completedLabel, progress, className }: StepIndicatorProps) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ol aria-label={label} className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => {
          const done = index < current;
          const isCurrent = index === current;
          return (
            <li key={step} aria-current={isCurrent ? "step" : undefined} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-pill text-caption font-bold",
                  done && "bg-primary text-on-primary",
                  isCurrent && "border-(length:--border-width-strong) border-primary text-primary",
                  !done && !isCurrent && "border-(length:--border-width-strong) border-border text-text-muted",
                )}
              >
                {done ? <Icon icon={Check} size="sm" /> : index + 1}
              </span>
              <span className={cn("text-body-sm", isCurrent ? "font-semibold text-text" : "text-text-muted")}>
                {step}
                {done && <span className="sr-only">{completedLabel}</span>}
              </span>
              {index < steps.length - 1 && (
                <span aria-hidden="true" className={cn("h-(--border-width-strong) min-w-4 flex-1 rounded-pill", done ? "bg-primary" : "bg-border")} />
              )}
            </li>
          );
        })}
      </ol>
      {progress && <div className="flex items-center justify-between gap-3 rounded-md bg-surface-alt p-3 text-body-sm font-semibold text-text">{progress}</div>}
    </div>
  );
}
