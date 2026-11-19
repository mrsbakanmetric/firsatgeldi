"use client";

// Development-only link reading test (data test, docs/implementation_plan.md step 23): paste
// a store product link, see what path 1 reads from the link text, one row per link and one
// column per field. Runs the real `readLinkText` in the browser; no request to the store and
// no provider call. Not part of the production build (next.config.ts › pageExtensions), so no
// approved screen design is needed; built from the List template and canonical parts only.
import { formatNumber } from "@firsatgeldi/core";
import type { Locale, TranslationKey } from "@firsatgeldi/i18n";
import { type LinkTextFailure, type LinkTextResult, PLATFORM_DOMAINS, readLinkText } from "@firsatgeldi/sources";
import { Button, EmptyState, PageTemplate, TextField } from "@firsatgeldi/ui";
import { Link2, X } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslator } from "../shell/parts";

interface Row {
  readonly id: number;
  /** Shown in the column header ("Link 2"); counts up from 1. */
  readonly no: number;
  readonly link: string;
  readonly result: LinkTextResult;
}

type ColumnKey =
  | "result"
  | "store"
  | "productId"
  | "sellerId"
  | "brand"
  | "category"
  | "modelCode"
  | "generation"
  | "series"
  | "storage"
  | "screen"
  | "size"
  | "power"
  | "colours"
  | "gender"
  | "pack"
  | "name"
  | "link";

const COLUMNS: readonly ColumnKey[] = [
  "result",
  "store",
  "productId",
  "sellerId",
  "brand",
  "category",
  "modelCode",
  "generation",
  "series",
  "storage",
  "screen",
  "size",
  "power",
  "colours",
  "gender",
  "pack",
  "name",
  "link",
];

const PROBLEM_KEYS: Readonly<Record<LinkTextFailure, TranslationKey>> = {
  NOT_A_URL: "devLink.problems.NOT_A_URL",
  UNKNOWN_STORE: "devLink.problems.UNKNOWN_STORE",
  SHORT_LINK: "devLink.problems.SHORT_LINK",
  NOT_A_PRODUCT_PAGE: "devLink.problems.NOT_A_PRODUCT_PAGE",
};

const storeDomain = (code: string): string => PLATFORM_DOMAINS.find((platform) => platform.code === code)?.domain ?? code;

export function LinkReader({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const [draft, setDraft] = useState("");
  const [rows, setRows] = useState<readonly Row[]>([]);
  const none = t("devLink.values.none");
  const amount = (key: TranslationKey, value: number | null) => (value === null ? none : t(key, { value: formatNumber(value, locale) }));
  const list = (values: readonly string[]) => (values.length > 0 ? values.join(", ") : none);

  function cell(row: Row, column: ColumnKey): string {
    const { result } = row;
    if (column === "link") return row.link;
    if (!result.ok) {
      if (column === "result") return t(PROBLEM_KEYS[result.reason]);
      if (column === "store") return result.platform ? storeDomain(result.platform) : none;
      return none;
    }
    const reading = result.reading;
    const attributes = reading.attributes;
    switch (column) {
      case "result":
        return t("devLink.values.ok");
      case "store":
        return storeDomain(reading.platform);
      case "productId":
        return reading.productExternalId || none;
      case "sellerId":
        return reading.sellerExternalId ?? none;
      case "brand":
        return reading.brand ?? none;
      case "category":
        return t("devLink.values.categoryLater");
      case "modelCode":
        return reading.modelCode ?? none;
      case "generation":
        return attributes.generation ? `${attributes.generation.line} ${attributes.generation.number}` : none;
      case "series":
        return list(attributes.series);
      case "storage":
        return amount("devLink.values.storage", attributes.storageGb);
      case "screen":
        return amount("devLink.values.screen", attributes.screenInch);
      case "size":
        return amount("devLink.values.size", attributes.sizeMm);
      case "power":
        return amount("devLink.values.power", attributes.powerW);
      case "colours":
        return list(attributes.colours);
      case "gender":
        return attributes.gender ?? none;
      case "pack":
        return amount("devLink.values.pack", attributes.packCount);
      case "name":
        return list(reading.nameWords);
    }
  }

  // Only the fields this link gave: a field no link in the table has a value for is not a row
  // (no "Cinsiyet" for AirPods). The result and the link itself are always shown.
  const ALWAYS: readonly ColumnKey[] = ["result", "link"];
  const visibleColumns = COLUMNS.filter((column) => ALWAYS.includes(column) || rows.some((row) => cell(row, column) !== none));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const link = draft.trim();
    if (!link) return;
    // Each "Çöz" starts over: the table shows only the link just read.
    setRows([{ id: Date.now(), no: 1, link, result: readLinkText(link) }]);
    setDraft("");
  }

  return (
    <PageTemplate
      kind="list"
      title={t("devLink.title")}
      caption={t("devLink.caption")}
      actions={
        rows.length > 0 ? (
          <Button variant="secondary" onClick={() => setRows([])}>
            {t("devLink.clear")}
          </Button>
        ) : null
      }
      toolbar={
        <form onSubmit={submit} className="w-full">
          <TextField
            label={t("devLink.field")}
            helper={t("devLink.helper")}
            type="text"
            inputMode="url"
            autoComplete="off"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            action={
              <Button type="submit" size="compact">
                {t("devLink.read")}
              </Button>
            }
          />
        </form>
      }
    >
      {rows.length === 0 ? (
        <EmptyState icon={Link2} title={t("devLink.emptyTitle")} description={t("devLink.emptyText")} />
      ) : (
        <div className="w-full overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-left text-body-sm" aria-label={t("devLink.tableLabel")}>
            <thead className="bg-surface-alt">
              <tr>
                <th scope="col" className="p-2 text-caption font-semibold whitespace-nowrap text-text-muted">
                  {t("devLink.attribute")}
                </th>
                {rows.map((row) => (
                  <th key={row.id} scope="col" className="p-2 text-caption font-semibold whitespace-nowrap text-text-muted">
                    <span className="inline-flex items-center gap-1">
                      {t("devLink.linkNumber", { number: row.no })}
                      <Button
                        variant="ghost"
                        size="compact"
                        iconOnly
                        icon={X}
                        label={t("devLink.remove", { number: row.no })}
                        onClick={() => setRows((current) => current.filter((each) => each.id !== row.id))}
                      />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleColumns.map((column) => (
                <tr key={column} className="border-t border-divider align-top">
                  <th scope="row" className="p-2 font-semibold whitespace-nowrap text-text-muted">
                    {t(`devLink.columns.${column}`)}
                  </th>
                  {rows.map((row) => (
                    <td
                      key={row.id}
                      className={column === "link" || column === "name" ? "min-w-(--size-side-column-width) p-2 break-all text-text" : "p-2 whitespace-nowrap text-text"}
                    >
                      {cell(row, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageTemplate>
  );
}
