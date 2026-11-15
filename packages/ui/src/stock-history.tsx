// StockHistory (pagedesign.md §5 "StockHistory (full, 14 days + 1 month, change log)";
// product_design_pattern.md §5.7; Product Detail v2): the current state in one sentence, the key
// (in stock · low · out · no data), blocks side by side (last 14 days · last month) with one row
// per seller — by rank, or "the seller you bought from" — one box per day, dates under the first
// and last box, and a dated change log, newest first. Every text is given by the caller.
import { cn } from "./cn";
import { StockKey, StockStrip, type StockDay } from "./stock-strip";

export interface StockHistoryBlock {
  /** "Son 14 gün". */
  title: string;
  /** Labels under the first and last box ("30 Eki", "bugün"). */
  from: string;
  to: string;
  /** `summary` = the row in words for assistive technology ("En ucuz satıcı: stokta"). */
  rows: readonly { label: string; days: readonly StockDay[]; summary: string }[];
}

export interface StockHistoryProps {
  /** Section heading ("Stok geçmişi") and its id for aria-labelledby. */
  title: string;
  titleId: string;
  /** "En ucuz satıcı şu an stokta · en az 7 gündür". */
  conclusion: string | null;
  keyLabels: { inStock: string; low: string; out: string; none: string };
  blocks: readonly StockHistoryBlock[];
  /** "DEĞİŞİKLİKLER · en yeni önce" and its dated lines; omitted when nothing changed. */
  changes?: { title: string; items: readonly { when: string; what: string }[] } | null;
  className?: string;
}

export function StockHistory({ title, titleId, conclusion, keyLabels, blocks, changes, className }: StockHistoryProps) {
  return (
    <section aria-labelledby={titleId} className={cn("flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h2 id={titleId} className="text-h3 text-text">
            {title}
          </h2>
          {conclusion && <span className="text-body-sm text-text">{conclusion}</span>}
        </div>
        <StockKey labels={keyLabels} className="text-caption text-text-muted" />
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {blocks.map((block) => (
          <div key={block.title} className="flex min-w-0 flex-col gap-2">
            <span className="text-body-sm font-semibold text-text">{block.title}</span>
            {/* A table sizes the label column once per block, so every row's boxes line up. */}
            <table className="w-full border-separate border-spacing-y-2">
              <tbody>
                {block.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className="w-px pr-3 text-left text-caption font-medium whitespace-nowrap text-text-muted">
                      {row.label}
                    </th>
                    <td>
                      <StockStrip days={row.days} label={row.summary} />
                    </td>
                  </tr>
                ))}
                <tr aria-hidden="true">
                  <td />
                  <td>
                    <span className="flex justify-between text-caption text-text-muted">
                      <span>{block.from}</span>
                      <span>{block.to}</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ))}
      </div>
      {changes && changes.items.length > 0 && (
        <div className="flex flex-col gap-1 border-t border-divider pt-3">
          <span className="text-caption font-semibold text-text-muted">{changes.title}</span>
          <ul className="flex flex-col gap-1">
            {changes.items.map((item) => (
              <li key={`${item.when}-${item.what}`} className="flex gap-3 text-body-sm">
                <span className="w-1/4 shrink-0 text-text-muted">{item.when}</span>
                <span className="min-w-0 flex-1 text-text">{item.what}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
