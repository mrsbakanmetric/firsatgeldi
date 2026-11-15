"use client";

// Pieces shared by the Tracked Items cards and Home (Hemen Gözat, small cards):
// a price against the price paid or the target (green ↓ / red ↑, with words for
// assistive technology), stock in words, and the status icon on the image corner.
import type { Money, TrackedItemListItem } from "@firsatgeldi/contracts";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { cn, focusRing, Icon, Tooltip } from "@firsatgeldi/ui";
import { ArrowDown, ArrowUp, Bookmark, Eye } from "lucide-react";
import { money } from "../search-add/format";

const CURRENCY = "TRY" as const;

export function tl(amount: number, locale: Locale): string {
  return money({ amount, currency: CURRENCY }, locale);
}

/** A price against the reference (price paid or target): lower = savings + ↓, higher = danger + ↑, equal = plain. */
export function Price({
  t,
  locale,
  value,
  reference = null,
  change,
  stale = false,
}: {
  t: Translator;
  locale: Locale;
  value: Money;
  reference?: number | null;
  change?: "down" | "up";
  /** Not checked for `tracking.stale_hours`: the price is the last known one and says so. */
  stale?: boolean;
}) {
  // A change (14-day) carries its own direction; a price is compared with the reference.
  const direction = change ?? (reference === null || value.amount === reference ? null : value.amount < reference ? "down" : "up");
  return (
    <span className={cn("inline-flex items-center justify-end gap-1 font-semibold tabular-nums", direction === "down" ? "text-savings" : direction === "up" ? "text-danger" : "text-text")}>
      {direction && <Icon icon={direction === "down" ? ArrowDown : ArrowUp} size="sm" />}
      {direction && <span className="sr-only">{t(direction === "down" ? "trackedItems.v4.lower" : "trackedItems.v4.higher")}</span>}
      {stale ? t("trackedItems.row.lastKnown", { price: money(value, locale) }) : money(value, locale)}
    </span>
  );
}

export type StockState = TrackedItemListItem["ranked"][number]["stockState"];

/** Stock in words; on a stale row its age instead ("Stok bilgisi en az 12 saat önceki"). */
export function StockWord({ t, state, staleHours = null }: { t: Translator; state: StockState | null; staleHours?: number | null }) {
  if (staleHours !== null) return <span className="text-on-warning-subtle">{t("trackedItems.row.staleStock", { count: staleHours })}</span>;
  if (!state) return null;
  return <span className={state === "IN_STOCK" ? "text-text-muted" : state === "LOW_STOCK" ? "text-on-warning-subtle" : "text-danger"}>{t(`trackedItems.v4.stock.${state}`)}</span>;
}

/** Status on the image's corner: eye on primary = "Takip ediyorsun", bookmark = "Almak istiyorsun" (Tooltip + accessible name). */
export function StatusIcon({ t, mode }: { t: Translator; mode: TrackedItemListItem["mode"] }) {
  const label = t(`trackedItems.v3.status.${mode}`);
  return (
    // 28 px round marker (the same size token as the step indicator dot), above the row link.
    <span className="absolute -top-1 -left-1 z-(--z-index-raised) flex">
      <Tooltip text={label} duplicatesLabel>
        <span
          role="img"
          aria-label={label}
          tabIndex={0}
          className={cn(
            "flex size-(--size-step-indicator-dot) items-center justify-center rounded-pill",
            mode === "BOUGHT" ? "bg-primary text-on-primary" : "border border-border bg-surface text-text",
            focusRing,
          )}
        >
          <Icon icon={mode === "BOUGHT" ? Eye : Bookmark} size="sm" />
        </span>
      </Tooltip>
    </span>
  );
}
