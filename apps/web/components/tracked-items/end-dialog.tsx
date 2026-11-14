"use client";

// "Takibi bitir" from the row ⋯ menu (pagedesign.md §8.4 v3; modules.md Tracked Items
// "End tracking from the list"): a bought item asks how it ended — İade ettim ·
// Fiyat farkı aldım · Vazgeçtim — with an optional new price paid (a saving goes to My
// Savings); a want-to-buy item ends on one confirm. "Geri al" works for 7 days.
import type { EndTrackingResult, TrackedItemListItem } from "@firsatgeldi/contracts";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, Dialog, SegmentedChoice, StatusBanner, TextField } from "@firsatgeldi/ui";
import { CircleStop } from "lucide-react";
import { useRef, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation } from "../../lib/api/hooks";
import { parsePrice, priceInput } from "../search-add/format";

type Outcome = "RETURN_REBUY" | "PRICE_DIFFERENCE" | "NONE";
const OUTCOMES: readonly Outcome[] = ["RETURN_REBUY", "PRICE_DIFFERENCE", "NONE"];

export function EndTrackingDialog({
  t,
  locale,
  item,
  onClose,
  onEnded,
}: {
  t: Translator;
  locale: Locale;
  item: TrackedItemListItem;
  onClose: () => void;
  onEnded: (item: TrackedItemListItem, result: EndTrackingResult) => void;
}) {
  const bought = item.mode === "BOUGHT";
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  // The new price is prefilled with today's cheapest when there is a deal, and stays editable.
  const [priceText, setPriceText] = useState(item.deal && item.cheapest ? priceInput(item.cheapest, locale) : "");
  const [problem, setProblem] = useState<string | null>(null);
  const attempt = useRef(globalThis.crypto.randomUUID());
  const price = parsePrice(priceText, locale);
  const invalid = priceText.trim() !== "" && price === null;

  const end = useApiMutation("endTracking", {
    onSuccess: ({ data }) => onEnded(item, data),
    onError: (error) => {
      attempt.current = globalThis.crypto.randomUUID();
      setProblem(errorMessage(t, error));
    },
  });

  const confirm = () => {
    setProblem(null);
    const method = bought && outcome && outcome !== "NONE" ? outcome : null;
    end.mutate({
      params: { id: item.id },
      body: { method, reboughtPrice: method && price !== null ? { amount: price, currency: "TRY" } : null },
      idempotencyKey: attempt.current,
    });
  };

  return (
    <Dialog open onClose={onClose} title={t("trackedItems.v3.endTitle")} description={item.product.name} icon={CircleStop} closeLabel={t("common.close")} size="compact">
      <div className="flex flex-col gap-4">
        {bought ? (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-body-sm font-semibold text-text">{t("trackedItems.v3.endQuestion")}</p>
              <SegmentedChoice
                label={t("trackedItems.v3.endQuestion")}
                variant="chips"
                value={outcome ?? ""}
                options={OUTCOMES.map((value) => ({ value, label: t(`trackedItems.v3.endOptions.${value}`) }))}
                onValueChange={(value) => setOutcome(value as Outcome)}
              />
            </div>
            {outcome && outcome !== "NONE" && (
              <TextField
                label={t("trackedItems.v3.newPrice")}
                helper={t("trackedItems.v3.newPriceHelp")}
                inputMode="decimal"
                suffix={t("searchAdd.confirm.currency")}
                value={priceText}
                onChange={(event) => setPriceText(event.target.value)}
                {...(invalid ? { error: t("searchAdd.confirm.priceInvalid") } : {})}
              />
            )}
          </>
        ) : (
          <p className="text-body-sm text-text">{t("trackedItems.v3.wantEndText", { name: item.product.name })}</p>
        )}
        {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.close")}
          </Button>
          <Button onClick={confirm} disabled={(bought && outcome === null) || invalid} loading={end.isPending}>
            {t("trackedItems.v3.end")}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
