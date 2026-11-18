"use client";

// "Takibi bitir" (Tracked Items card footer, pagedesign.md §8.4 v6; Product Detail header, design v2
// End, §8.3): a bought item asks how it ended — "İade ettim, yeniden aldım" (or cancelled and bought
// again) · "Fiyat farkı aldım" · "Vazgeçtim" — with the new price paid, prefilled and editable, and
// the saving worked out live as the user types (a saving goes to My Savings); a want-to-buy item ends
// on one confirm. "Geri al" works for 7 days. The prefill is the price of the offer the user opened
// with "Göster" (Product Detail), otherwise today's cheapest when there is a deal.
import type { EndTrackingResult, Money, TrackedItemListItem } from "@firsatgeldi/contracts";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, Dialog, SegmentedChoice, StatusBanner, TextField } from "@firsatgeldi/ui";
import { CircleStop } from "lucide-react";
import { useRef, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation } from "../../lib/api/hooks";
import { money, parsePrice, priceInput } from "../search-add/format";

type Outcome = "RETURN_REBUY" | "PRICE_DIFFERENCE" | "NONE";
const OUTCOMES: readonly Outcome[] = ["RETURN_REBUY", "PRICE_DIFFERENCE", "NONE"];

/** Where the prefilled new price comes from. */
export interface EndPrefill {
  price: Money;
  source: "revealed" | "cheapest";
}

export function EndTrackingDialog({
  t,
  locale,
  item,
  prefill,
  onClose,
  onEnded,
}: {
  t: Translator;
  locale: Locale;
  item: TrackedItemListItem;
  /** Product Detail passes the revealed offer's price; by default today's cheapest when there is a deal. */
  prefill?: EndPrefill | null;
  onClose: () => void;
  onEnded: (item: TrackedItemListItem, result: EndTrackingResult) => void;
}) {
  const bought = item.mode === "BOUGHT";
  const start = prefill !== undefined ? prefill : item.deal && item.cheapest ? { price: item.cheapest, source: "cheapest" as const } : null;
  // An offer opened with "Göster" means the user went for it: the first answer is chosen (design End).
  const [outcome, setOutcome] = useState<Outcome | null>(start?.source === "revealed" ? "RETURN_REBUY" : null);
  const [priceText, setPriceText] = useState(start ? priceInput(start.price, locale) : "");
  const [problem, setProblem] = useState<string | null>(null);
  const attempt = useRef(globalThis.crypto.randomUUID());
  const price = parsePrice(priceText, locale);
  const invalid = priceText.trim() !== "" && price === null;
  const paid = item.purchase?.pricePaid ?? null;
  const asksPrice = bought && outcome !== null && outcome !== "NONE";
  const saving = asksPrice && paid && price !== null ? paid.amount - price : null;

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

  const helper = start?.source === "revealed" ? t("trackedItems.v3.prefillRevealed") : start ? t("trackedItems.v3.prefillCheapest") : t("trackedItems.v3.newPriceHelp");

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
              {outcome === "RETURN_REBUY" && <p className="text-caption text-text-muted">{t("trackedItems.v3.endOptionNote.RETURN_REBUY")}</p>}
            </div>
            {asksPrice && (
              <>
                <TextField
                  label={t("trackedItems.v3.newPrice")}
                  helper={helper}
                  inputMode="decimal"
                  suffix={t("searchAdd.confirm.currency")}
                  value={priceText}
                  onChange={(event) => setPriceText(event.target.value)}
                  {...(invalid ? { error: t("searchAdd.confirm.priceInvalid") } : {})}
                />
                {saving !== null && (
                  <p aria-live="polite" className="flex items-baseline justify-between gap-3 rounded-md bg-surface-alt px-3 py-2">
                    <span className="text-body-sm text-text">{t("trackedItems.v3.saving")}</span>
                    {saving > 0 ? <span className="text-price text-savings">{money({ amount: saving, currency: "TRY" }, locale)}</span> : <span className="text-body-sm text-text-muted">{t("trackedItems.v3.noSaving")}</span>}
                  </p>
                )}
              </>
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
