"use client";

// Product Detail aside, bought mode (design v2, pagedesign.md §8.3; modules.md Product Detail › Action
// steps, Return Window › Request tracking): "Kazancı almak için" — numbered steps with StepTick
// (reversible "Yaptım ✓"); step 1 carries the user's own store's return page and request tracking
// ("İade talebi açtım" / "Fiyat farkı istedim" → "Yanıt bekleniyor", then the answer); step 2 warns
// until step 1 is done; "Takibi bitir" is done by the header button. Then the ready price-difference
// message to the seller bought from, with "Mesajı kopyala". No explanation sentences. The last card
// fills to the chart column's bottom, its action pinned to the card bottom (design §3).
import type { ActionStep, TrackedItemDetail } from "@firsatgeldi/contracts";
import { daysBetween, toCalendarDay } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, cn, Icon, SegmentedChoice, StatusBanner, StepTick } from "@firsatgeldi/ui";
import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation, useApiQuery } from "../../lib/api/hooks";

const CARD = "flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 md:p-5";
const OUTCOMES = ["GIVEN", "REFUSED", "COUPON"] as const;

function stepTitle(t: Translator, item: TrackedItemDetail, step: ActionStep): string {
  if (step === "RETURN_REQUEST") return item.purchase?.orderStatus === "ORDERED" ? t("productDetail.steps.cancel") : t("productDetail.steps.return");
  return t(`productDetail.steps.${step === "PRICE_DIFFERENCE" ? "priceDifference" : step === "REORDER" ? "reorder" : "end"}`);
}

function Steps({ t, item, now, last, onChanged }: { t: Translator; item: TrackedItemDetail; now: number; last: boolean; onChanged: () => void }) {
  const [problem, setProblem] = useState<string | null>(null);
  const onError = (error: unknown) => setProblem(errorMessage(t, error));
  const tick = useApiMutation("tickStep", { onSuccess: onChanged, onError });
  const request = useApiMutation("updateRequest", { onSuccess: onChanged, onError });
  // Without a cheaper seller there is nothing to re-order (design States 2).
  const steps = item.steps.filter((entry) => entry.step !== "REORDER" || item.deal !== null);
  const current = steps.find((entry) => !entry.done)?.step;
  const firstDone = steps[0]?.done ?? false;
  const returnPage = item.returnRule?.policyUrl ?? null;
  const asked = item.request;

  const ask = (kind: "PRICE_DIFFERENCE" | "RETURN") => {
    setProblem(null);
    request.mutate({ params: { id: item.id }, body: { kind: asked?.kind === kind ? null : kind, outcome: null } });
  };

  return (
    <section aria-labelledby="st-title" className={cn(CARD, last && "flex-1")}>
      <h2 id="st-title" className="text-h3 text-text">
        {t("productDetail.steps.title")}
      </h2>
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
      <ol className="flex flex-col gap-3">
        {steps.map((entry, index) => (
          <StepTick
            key={entry.step}
            number={index + 1}
            title={stepTitle(t, item, entry.step)}
            done={entry.done}
            current={entry.step === current}
            tickLabel={t("productDetail.steps.tick")}
            doneLabel={t("productDetail.steps.ticked")}
            busy={tick.isPending && tick.variables.params.step === entry.step}
            {...(entry.step === "END" ? {} : { onToggle: () => tick.mutate({ params: { id: item.id, step: entry.step }, body: { done: !entry.done } }) })}
            {...(entry.step === "REORDER" && !firstDone ? { warning: t("productDetail.steps.returnFirst") } : {})}
            {...(index < steps.length - 1 ? { className: "border-b border-divider pb-3" } : {})}
          >
            {(entry.step === "RETURN_REQUEST" || entry.step === "PRICE_DIFFERENCE") && (
              <>
                {entry.step === "RETURN_REQUEST" && returnPage && item.purchase && (
                  <a href={returnPage} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 self-start text-body-sm font-semibold text-primary">
                    {t("productDetail.steps.returnPage", { platform: item.purchase.platformName })}
                    <Icon icon={ExternalLink} size="sm" />
                  </a>
                )}
                <span className="flex flex-wrap gap-2">
                  {entry.step === "RETURN_REQUEST" && (
                    <Button variant="secondary" size="compact" aria-pressed={asked?.kind === "RETURN"} onClick={() => ask("RETURN")}>
                      {t("productDetail.request.return")}
                    </Button>
                  )}
                  <Button variant="secondary" size="compact" aria-pressed={asked?.kind === "PRICE_DIFFERENCE"} onClick={() => ask("PRICE_DIFFERENCE")}>
                    {t("productDetail.request.priceDifference")}
                  </Button>
                </span>
                {asked && (
                  <span className="flex flex-col gap-2">
                    <span className="text-caption text-text-muted">
                      {asked.outcome
                        ? t(`productDetail.request.outcome.${asked.outcome}`)
                        : t("productDetail.request.waiting", { count: Math.max(0, daysBetween(toCalendarDay(new Date(asked.since)), toCalendarDay(new Date(now)))) })}
                    </span>
                    <SegmentedChoice
                      label={t("productDetail.request.outcomeLabel")}
                      variant="chips"
                      value={asked.outcome ?? ""}
                      options={OUTCOMES.map((value) => ({ value, label: t(`productDetail.request.outcomeOption.${value}`) }))}
                      onValueChange={(value) => request.mutate({ params: { id: item.id }, body: { kind: asked.kind, outcome: value as (typeof OUTCOMES)[number] } })}
                    />
                  </span>
                )}
              </>
            )}
            {entry.step === "END" && <span className="text-caption text-text-muted">{t("productDetail.steps.endHint")}</span>}
          </StepTick>
        ))}
      </ol>
    </section>
  );
}

function Message({ t, locale, item }: { t: Translator; locale: Locale; item: TrackedItemDetail }) {
  const message = useApiQuery("getPriceDifferenceMessage", { params: { id: item.id }, query: { locale } });
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);
  const data = message.data?.data;
  if (!data?.text) return null;
  const text = data.text;
  const copy = () => {
    const clipboard = globalThis.navigator?.clipboard;
    if (!clipboard) return setCopied("failed");
    clipboard.writeText(text).then(
      () => setCopied("done"),
      () => setCopied("failed"),
    );
  };
  return (
    <section aria-labelledby="msg-title" className={cn(CARD, "flex-1")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="msg-title" className="text-h3 text-text">
          {t("productDetail.message.title")}
        </h2>
        <span className="text-caption text-text-muted">{t("productDetail.message.to", { name: data.recipient })}</span>
      </div>
      <p className="rounded-md bg-surface-alt p-3 text-body-sm text-text">{text}</p>
      <span className="mt-auto flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="compact" icon={Copy} onClick={copy}>
          {t("productDetail.message.copy")}
        </Button>
        <span role="status" className="text-caption text-text-muted">
          {copied === "done" ? t("productDetail.message.copied") : copied === "failed" ? t("productDetail.message.copyFailed") : null}
        </span>
      </span>
    </section>
  );
}

export function BoughtAside({ t, locale, item, now, onChanged }: { t: Translator; locale: Locale; item: TrackedItemDetail; now: number; onChanged: () => void }) {
  // The message card is last when there is a cheaper price to ask about; otherwise the steps fill.
  const hasMessage = item.deal !== null;
  return (
    <>
      <Steps t={t} item={item} now={now} last={!hasMessage} onChanged={onChanged} />
      {hasMessage && <Message t={t} locale={locale} item={item} />}
    </>
  );
}
