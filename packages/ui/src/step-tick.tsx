"use client";

// StepTick (product_design_pattern.md §5.11; pagedesign.md §5 [DECIDED 2026-11-15]): one numbered
// action step. A ghost "Yaptım" control turns into an emerald "Yaptım ✓" and the step text goes
// muted; one tap undoes it. The next un-ticked step is the current one (primary ring). A later step
// stays usable but may carry an amber warning ("Önce iade talebini oluştur"). A step that is done
// elsewhere (e.g. "Takibi bitir" by its own button) has no tick control.
import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { cn } from "./cn";
import { Icon } from "./icon";

export interface StepTickProps {
  number: number;
  title: string;
  done: boolean;
  /** The next un-ticked step. */
  current?: boolean;
  /** Omitted = no tick control (the step is completed by another action). */
  onToggle?: () => void;
  busy?: boolean;
  /** "Yaptım" / "Yaptım ✓" (the accessible state is aria-pressed). */
  tickLabel: string;
  doneLabel: string;
  /** Amber note beside the step. */
  warning?: ReactNode;
  /** Links, buttons and captions of the step. */
  children?: ReactNode;
  className?: string;
}

export function StepTick({ number, title, done, current = false, onToggle, busy = false, tickLabel, doneLabel, warning, children, className }: StepTickProps) {
  return (
    <li className={cn("flex gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-(--size-step-indicator-dot) shrink-0 items-center justify-center rounded-pill border-(length:--border-width-strong) text-caption font-bold",
          done ? "border-savings bg-savings text-on-primary" : current ? "border-primary text-primary" : "border-border text-text-muted",
        )}
      >
        {done ? <Icon icon={Check} size="sm" /> : number}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span className={cn("text-body font-semibold", done ? "text-text-muted" : "text-text")}>{title}</span>
          {onToggle && (
            <Button variant="ghost" size="compact" aria-pressed={done} loading={busy} onClick={onToggle} {...(done ? { className: "text-savings" } : {})}>
              {done ? doneLabel : tickLabel}
            </Button>
          )}
        </span>
        {warning && !done && <span className="self-start rounded-pill bg-warning-subtle px-2 text-caption font-semibold text-on-warning-subtle">{warning}</span>}
        {children}
      </span>
    </li>
  );
}
