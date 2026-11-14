// StockStrip (pagedesign.md §5; product_design_pattern.md §5.7): one equal box per
// day; in stock = solid emerald, low = solid amber with a darker solid border,
// out = hollow with a dashed red border (fill AND colour), no data = blank.
// The key lives once on the page (`StockKey`); the row says the state in words.
import { cn } from "./cn";

export type StockDay = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | null;

const DAY_CLASSES: Record<NonNullable<StockDay>, string> = {
  IN_STOCK: "bg-stock-in",
  LOW_STOCK: "border-(length:--component-stock-history-low-stock-border-width) border-stock-low-border bg-stock-low",
  OUT_OF_STOCK: "border-(length:--component-stock-history-out-of-stock-border-width) border-dashed border-stock-out-border bg-stock-out-fill",
};
/** A day without data (before tracking): blank, nothing guessed. */
const NO_DATA_CLASSES = "border border-divider";

function Box({ day, className }: { day: StockDay; className?: string }) {
  return <span className={cn("h-3 rounded-(--component-stock-history-box-radius)", day ? DAY_CLASSES[day] : NO_DATA_CLASSES, className)} />;
}

export interface StockStripProps {
  days: readonly StockDay[];
  /** The state in words for assistive technology ("Stokta · en az 7 gündür"). */
  label: string;
  className?: string;
}

export function StockStrip({ days, label, className }: StockStripProps) {
  return (
    <span role="img" aria-label={label} className={cn("flex w-full gap-(--component-stock-history-gap)", className)}>
      {days.map((day, index) => (
        <Box key={index} day={day} className="flex-1" />
      ))}
    </span>
  );
}

/** The visible key of the three states (§5.7: "A visible key explains the three states"). */
export function StockKey({ labels, className }: { labels: { inStock: string; low: string; out: string }; className?: string }) {
  const entries = [
    { day: "IN_STOCK" as const, text: labels.inStock },
    { day: "LOW_STOCK" as const, text: labels.low },
    { day: "OUT_OF_STOCK" as const, text: labels.out },
  ];
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {entries.map((entry) => (
        <span key={entry.day} className="inline-flex items-center gap-1">
          <Box day={entry.day} className="w-3" />
          <span>{entry.text}</span>
        </span>
      ))}
    </span>
  );
}
