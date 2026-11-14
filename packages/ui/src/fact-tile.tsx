// FactTile (product_design_pattern.md §5.26): short facts about a listing as
// equal tiles in a row (three columns for three). Good = savings-subtle with
// an emerald check, bad = danger-subtle with a red cross; neutral when there
// is not enough evidence. Icon + label + value — never colour alone.
import { Check, Minus, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "./cn";
import { Icon } from "./icon";

export type FactVerdict = "good" | "bad" | "neutral";

const VERDICT = {
  good: { box: "bg-savings-subtle", icon: Check, mark: "text-savings" },
  bad: { box: "bg-danger-subtle", icon: X, mark: "text-danger" },
  neutral: { box: "bg-surface-alt", icon: Minus, mark: "text-text-muted" },
} as const;

export interface FactTileProps {
  label: string;
  value: string;
  verdict: FactVerdict;
  /** Accessible word for the verdict ("iyi" / "dikkat" / "veri yok"), read after the value. */
  verdictLabel: string;
  /** One short reason under the value (seller trust). */
  note?: string;
}

export function FactTile({ label, value, verdict, verdictLabel, note }: FactTileProps) {
  const style = VERDICT[verdict];
  return (
    <div className={cn("flex min-w-0 flex-col gap-1 rounded-md p-3", style.box)}>
      <span className="flex items-center gap-1 text-caption text-text-muted">
        <Icon icon={style.icon} size="sm" className={style.mark} label={verdictLabel} />
        <span>{label}</span>
      </span>
      <span className="text-body-sm font-semibold break-words text-text">{value}</span>
      {note && <span className="text-caption break-words text-text-muted">{note}</span>}
    </div>
  );
}

/** Equal columns: three tiles side by side from the smallest width up. */
export function FactTiles({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="grid grid-cols-3 gap-2">
      {children}
    </div>
  );
}
