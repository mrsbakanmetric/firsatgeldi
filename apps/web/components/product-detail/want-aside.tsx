"use client";

// Product Detail aside, want-to-buy mode (design v2 Want, pagedesign.md §8.3; modules.md Want to Buy):
// "Hedef fiyat" with the price field; the suggestion chips side by side ("30 gün ↓ 25.997" · "6 ay ↓
// 24.899"; none without enough history); the duration (1 hafta · 1 ay · 3 ay · Süresiz); then
// "Almaya karar verince" with three short steps and **Aldım, kaydet** pinned to the card bottom — it
// opens the Search and Add confirm panel for this record, so the same record switches to bought.
// A cleared field removes the target (alerts then come on a notable drop). Every change is logged
// by the API (`tracking.edit`, `tracking.extend`).
import { type Money, TrackingDuration, type TrackedItemDetail } from "@firsatgeldi/contracts";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { buttonClasses, cn, Icon, SegmentedChoice, StatusBanner, TextField } from "@firsatgeldi/ui";
import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation } from "../../lib/api/hooks";
import { searchAddHref } from "../../lib/handoff";
import { parsePrice, priceInput } from "../search-add/format";
import { tl } from "../tracked-items/parts";

const CARD = "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:p-5";

function Target({ t, locale, item, onChanged }: { t: Translator; locale: Locale; item: TrackedItemDetail; onChanged: () => void }) {
  const want = item.want;
  const saved = want?.targetPrice ?? null;
  const [text, setText] = useState(saved ? priceInput(saved, locale) : "");
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const onError = (error: unknown) => setProblem(errorMessage(t, error));
  const update = useApiMutation("updateTrackedItem", { onSuccess: onChanged, onError });
  const extend = useApiMutation("extendTracking", {
    onSuccess: () => {
      setNote(t("productDetail.target.durationSaved"));
      onChanged();
    },
    onError,
  });
  const parsed = parsePrice(text, locale);
  const invalid = text.trim() !== "" && (parsed === null || parsed <= 0);

  const saveTarget = (value: Money | null) => {
    if ((value?.amount ?? null) === (saved?.amount ?? null)) return;
    setProblem(null);
    update.mutate({ params: { id: item.id }, body: { targetPrice: value } }, { onSuccess: () => setNote(t(value ? "productDetail.target.saved" : "productDetail.target.cleared")) });
  };
  const commit = () => {
    if (invalid) return;
    saveTarget(parsed === null ? null : { amount: parsed, currency: "TRY" });
  };
  const choose = (value: Money) => {
    setText(priceInput(value, locale));
    saveTarget(value);
  };
  const hints = [
    item.targetHints?.lowest30Days ? { key: "30", label: t("productDetail.target.chip30", { amount: tl(item.targetHints.lowest30Days.amount, locale) }), name: t("searchAdd.confirm.hint30", { amount: tl(item.targetHints.lowest30Days.amount, locale) }), value: item.targetHints.lowest30Days } : null,
    item.targetHints?.lowest6Months ? { key: "6m", label: t("productDetail.target.chip6m", { amount: tl(item.targetHints.lowest6Months.amount, locale) }), name: t("searchAdd.confirm.hint6m", { amount: tl(item.targetHints.lowest6Months.amount, locale) }), value: item.targetHints.lowest6Months } : null,
  ].filter((hint) => hint !== null);

  return (
    <section aria-labelledby="tg-title" className={CARD}>
      <h2 id="tg-title" className="text-h3 text-text">
        {t("productDetail.target.title")}
      </h2>
      <TextField
        label={t("productDetail.target.field")}
        helper={t("productDetail.target.helper")}
        inputMode="decimal"
        suffix={t("searchAdd.confirm.currency")}
        value={text}
        onChange={(event) => {
          setNote(null);
          setText(event.target.value);
        }}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
        {...(invalid ? { error: t("searchAdd.confirm.priceInvalid") } : {})}
      />
      {hints.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {hints.map((hint) => (
            <button
              key={hint.key}
              type="button"
              title={hint.name}
              onClick={() => choose(hint.value)}
              className="min-h-(--size-touch-target-min) rounded-pill border border-border bg-surface px-2 text-caption font-semibold text-text hover:bg-surface-alt"
            >
              {hint.label}
            </button>
          ))}
        </div>
      )}
      {want && (
        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-semibold text-text">{t("productDetail.target.duration")}</span>
          <SegmentedChoice
            label={t("productDetail.target.duration")}
            options={TrackingDuration.options.map((value) => ({ value, label: t(`searchAdd.confirm.durations.${value}`) }))}
            value={want.trackingDuration}
            onValueChange={(value) => {
              setProblem(null);
              setNote(null);
              extend.mutate({ params: { id: item.id }, body: { duration: value as (typeof TrackingDuration.options)[number] }, idempotencyKey: globalThis.crypto.randomUUID() });
            }}
          />
        </div>
      )}
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
      <span role="status" className="text-caption text-text-muted">
        {note}
      </span>
    </section>
  );
}

function Buy({ t, locale, item }: { t: Translator; locale: Locale; item: TrackedItemDetail }) {
  return (
    <section aria-labelledby="buy-title" className={cn(CARD, "flex-1")}>
      <h2 id="buy-title" className="text-h3 text-text">
        {t("productDetail.buy.title")}
      </h2>
      <ol className="flex list-decimal flex-col gap-1 pl-5 text-body-sm text-text">
        <li>{t("productDetail.buy.step1")}</li>
        <li>{t("productDetail.buy.step2")}</li>
        <li>{t("productDetail.buy.step3")}</li>
      </ol>
      <Link href={searchAddHref(locale, { productId: item.product.id, mode: "BOUGHT", convertId: item.id })} className={buttonClasses("primary", "mt-auto")}>
        <Icon icon={Check} size="md" />
        {t("trackedItems.v4.markBought")}
      </Link>
    </section>
  );
}

export function WantAside({ t, locale, item, onChanged }: { t: Translator; locale: Locale; item: TrackedItemDetail; onChanged: () => void }) {
  return (
    <>
      <Target t={t} locale={locale} item={item} onChanged={onChanged} />
      <Buy t={t} locale={locale} item={item} />
    </>
  );
}
