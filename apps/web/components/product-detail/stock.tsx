"use client";

// Product Detail stock history (design v2 keeps the v1 boxes; modules.md Stock history): the last
// 14 days and the last month side by side, one row per cheaper seller by rank and the seller the
// user bought from, the key incl. "Veri yok", the current state in one sentence ("en az N gündür")
// and the dated change log, newest first. Days before tracking began have no data.
import type { StockHistoryDetail, StockSubject, TrackedItemDetail } from "@firsatgeldi/contracts";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { SkeletonBlock, StockHistory } from "@firsatgeldi/ui";
import { useApiQuery } from "../../lib/api/hooks";
import { shortDay } from "../tracked-items/format";

function subjectLabel(t: Translator, subject: StockSubject): string {
  if (subject.kind === "OWN") return t("productDetail.stock.own");
  return subject.rank === 1 ? t("trackedItems.v4.rankFirst") : t("trackedItems.v4.rank", { rank: subject.rank });
}

function stateWord(t: Translator, state: NonNullable<StockHistoryDetail["rows"][number]["days"][number]>): string {
  return t(`trackedItems.v4.stock.${state}`);
}

function block(t: Translator, locale: Locale, title: string, data: StockHistoryDetail) {
  return {
    title,
    from: shortDay(data.from, locale),
    to: t("productDetail.stock.today"),
    rows: data.rows.map((row) => {
      const last = row.days.at(-1) ?? null;
      const label = subjectLabel(t, row.subject);
      return { label, days: row.days, summary: t("productDetail.stock.rowLabel", { subject: label, state: last ? stateWord(t, last) : t("productDetail.stock.none") }) };
    }),
  };
}

export function StockSection({ t, locale, item }: { t: Translator; locale: Locale; item: TrackedItemDetail }) {
  const short = useApiQuery("getStockHistory", { params: { id: item.id }, query: { range: "14d" } });
  const month = useApiQuery("getStockHistory", { params: { id: item.id }, query: { range: "1m" } });
  const a = short.data?.data;
  const b = month.data?.data;
  if (!a || !b) return short.isError || month.isError ? null : <SkeletonBlock shape="card" />;
  if (!a.rows.length) return null;
  const conclusion = b.conclusion;
  return (
    <StockHistory
      title={t("productDetail.stock.title")}
      titleId="sk-title"
      conclusion={
        conclusion
          ? t("productDetail.stock.conclusion", { subject: subjectLabel(t, conclusion.subject), state: stateWord(t, conclusion.state).toLocaleLowerCase(locale), count: conclusion.atLeastDays })
          : null
      }
      keyLabels={{ inStock: t("trackedItems.v4.stock.IN_STOCK"), low: t("productDetail.stock.low"), out: t("trackedItems.v4.stock.OUT_OF_STOCK"), none: t("productDetail.stock.none") }}
      blocks={[block(t, locale, t("productDetail.stock.last14"), a), block(t, locale, t("productDetail.stock.lastMonth"), b)]}
      changes={{
        title: t("productDetail.stock.changes"),
        items: b.changes.map((change) => ({
          when: shortDay(change.day, locale),
          what: t(`productDetail.stock.change.${change.to}`, { subject: subjectLabel(t, change.subject) }),
        })),
      }}
    />
  );
}
