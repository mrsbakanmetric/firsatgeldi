"use client";

// Product Detail after tracking ended (design v2 End "Sonra", flows H; modules.md Product Detail rules,
// Ratings › Our buyers' answers): one status line by the reason — "Takip bitti · <date>" (with the
// saving written to My Savings), "İade süresi bitti · <date>", "Takip süresi doldu · <date>" — with
// "Geri al" while it is open and where else it can be done; sellers and "Göster" are gone, the
// price and stock history stay readable. A bought item then asks the two optional one-tap buyer
// questions until they are answered or skipped. Both writes are logged by the API.
import type { BuyerFeedback, TrackedItemDetail } from "@firsatgeldi/contracts";
import { toCalendarDay } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, SegmentedChoice, StatusBanner } from "@firsatgeldi/ui";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation } from "../../lib/api/hooks";
import { money } from "../search-add/format";
import { shortDay } from "../tracked-items/format";

const MS_PER_DAY = 86_400_000;
const PRICE_DIFFERENCE = ["YES", "NO", "NOT_ASKED"] as const;
const RETURN_SMOOTH = ["YES", "PROBLEM", "NOT_DONE"] as const;

export function EndedBanner({ t, locale, item, now, onChanged }: { t: Translator; locale: Locale; item: TrackedItemDetail; now: number; onChanged: () => void }) {
  const [problem, setProblem] = useState<string | null>(null);
  const restore = useApiMutation("restoreTracking", { onSuccess: onChanged, onError: (error) => setProblem(errorMessage(t, error)) });
  const ended = item.ended;
  if (!ended) return null;
  const date = shortDay(toCalendarDay(new Date(ended.at)), locale);
  const reason = ended.reason === "USER" || ended.reason === "RETURN_WINDOW" || ended.reason === "TRACKING_DURATION" ? ended.reason : "ENDED";
  const until = ended.restorableUntil ? Date.parse(ended.restorableUntil) : null;
  const open = until !== null && until > now;
  return (
    <>
      <StatusBanner
        tone="info"
        title={[t(`productDetail.ended.${reason}`, { date }), ended.savingRecorded ? t("productDetail.ended.saving", { amount: money(ended.savingRecorded, locale) }) : null].filter(Boolean).join(t("common.listSeparator"))}
        action={
          open ? (
            <Button variant="secondary" size="compact" loading={restore.isPending} onClick={() => restore.mutate({ params: { id: item.id }, idempotencyKey: globalThis.crypto.randomUUID() })}>
              {t("trackedItems.v3.restore")}
            </Button>
          ) : undefined
        }
      >
        {[t("productDetail.ended.historyNote"), open && until !== null ? t("productDetail.ended.restoreNote", { count: Math.max(1, Math.floor((until - now) / MS_PER_DAY)) }) : null].filter(Boolean).join(" ")}
      </StatusBanner>
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
    </>
  );
}

export function BuyerQuestions({ t, item, onChanged }: { t: Translator; item: TrackedItemDetail; onChanged: () => void }) {
  const [answers, setAnswers] = useState<BuyerFeedback>({ priceDifferenceGiven: null, returnSmooth: null });
  const [skipped, setSkipped] = useState(false);
  const [sent, setSent] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const send = useApiMutation("sendFeedback", {
    onSuccess: () => {
      setSent(true);
      onChanged();
    },
    onError: (error) => setProblem(errorMessage(t, error)),
  });
  if (sent) {
    return (
      <p role="status" className="text-body-sm text-text-muted">
        {t("productDetail.feedback.thanks")}
      </p>
    );
  }
  if (skipped || item.mode !== "BOUGHT" || item.state === "ACTIVE" || item.feedback !== null) return null;
  const answered = answers.priceDifferenceGiven !== null || answers.returnSmooth !== null;
  return (
    <section aria-labelledby="fb-title" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:p-5">
      <h2 id="fb-title" className="text-body-sm font-semibold text-text-muted">
        {t("productDetail.feedback.title")}
      </h2>
      <div className="flex flex-col gap-2">
        <span className="text-body-sm font-semibold text-text">{t("productDetail.feedback.priceDifference")}</span>
        <SegmentedChoice
          label={t("productDetail.feedback.priceDifference")}
          variant="chips"
          value={answers.priceDifferenceGiven ?? ""}
          options={PRICE_DIFFERENCE.map((value) => ({ value, label: t(`productDetail.feedback.priceDifferenceOption.${value}`) }))}
          onValueChange={(value) => setAnswers((current) => ({ ...current, priceDifferenceGiven: value as (typeof PRICE_DIFFERENCE)[number] }))}
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-body-sm font-semibold text-text">{t("productDetail.feedback.returnSmooth")}</span>
        <SegmentedChoice
          label={t("productDetail.feedback.returnSmooth")}
          variant="chips"
          value={answers.returnSmooth ?? ""}
          options={RETURN_SMOOTH.map((value) => ({ value, label: t(`productDetail.feedback.returnSmoothOption.${value}`) }))}
          onValueChange={(value) => setAnswers((current) => ({ ...current, returnSmooth: value as (typeof RETURN_SMOOTH)[number] }))}
        />
      </div>
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
      <span className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" size="compact" onClick={() => setSkipped(true)}>
          {t("productDetail.feedback.skip")}
        </Button>
        <Button size="compact" disabled={!answered} loading={send.isPending} onClick={() => send.mutate({ params: { id: item.id }, body: answers, idempotencyKey: globalThis.crypto.randomUUID() })}>
          {t("productDetail.feedback.send")}
        </Button>
      </span>
    </section>
  );
}
