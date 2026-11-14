// FreshnessLine (product_design_pattern.md §5.5, §5.13): the age of every price
// and stock value ("6 dk önce kontrol edildi"); stale values in the warning
// colour, estimated values carry "tahmini" in the info style.
import { Clock } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

export interface FreshnessLineProps {
  /** Already worded from the catalogue. */
  children: ReactNode;
  /** Older than expected: warning colour (stale state). */
  stale?: boolean;
  /** Optional action after the text, e.g. "İlanı aç". */
  action?: ReactNode;
  className?: string;
}

export function FreshnessLine({ children, stale = false, action, className }: FreshnessLineProps) {
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-caption", stale ? "text-on-warning-subtle" : "text-text-muted", className)}>
      <span className="inline-flex items-center gap-1">
        <Icon icon={Clock} size="sm" />
        <span>{children}</span>
      </span>
      {action}
    </p>
  );
}
