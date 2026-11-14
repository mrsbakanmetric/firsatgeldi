// StatTile (pagedesign.md §5; §8.4 Compact UI design v2): one small figure —
// caption label, value in the list price size, an optional muted detail on the
// same line. Several sit in one thin summary row (`StatTiles`), not as large tiles.
import type { ReactNode } from "react";
import { cn } from "./cn";

export interface StatTileProps {
  label: string;
  value: string;
  /** "en çok 3.302 TL", "en yakını 16 Kasım". */
  detail?: ReactNode;
  /** A saving is emerald (§5.9). */
  tone?: "default" | "saving";
  className?: string;
}

export function StatTile({ label, value, detail, tone = "default", className }: StatTileProps) {
  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <dt className="text-caption text-text-muted">{label}</dt>
      <dd className="flex flex-wrap items-baseline gap-x-2">
        <span className={cn("text-price tabular-nums", tone === "saving" ? "text-savings" : "text-text")}>{value}</span>
        {detail && <span className="text-caption text-text-muted">{detail}</span>}
      </dd>
    </div>
  );
}

/** The thin summary row: four figures in one row from breakpoint.md, two per row on phones. */
export function StatTiles({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <dl aria-label={label} className={cn("grid grid-cols-2 gap-x-4 gap-y-3 border-y border-divider py-3 md:grid-cols-4", className)}>
      {children}
    </dl>
  );
}
