"use client";

// "Teslim aldın mı?" in the header card (design flows E; modules.md Return Window › Unknown delivery
// date): asked once the estimated delivery day has passed while the last return day is still
// estimated. "Evet, bugün" and "Evet, başka gün" (with the day) fix the last day; "Henüz değil"
// keeps the estimate. Each answer is logged by the API (`tracking.delivered`).
import type { TrackedItemDetail } from "@firsatgeldi/contracts";
import { toCalendarDay } from "@firsatgeldi/core";
import type { Translator } from "@firsatgeldi/i18n";
import { Button, StatusBanner, TextField } from "@firsatgeldi/ui";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation } from "../../lib/api/hooks";

export function DeliveryPrompt({ t, item, now, onChanged }: { t: Translator; item: TrackedItemDetail; now: number; onChanged: () => void }) {
  const [otherDay, setOtherDay] = useState(false);
  const [day, setDay] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const answer = useApiMutation("answerDelivered", {
    onSuccess: (_, variables) => {
      if (variables.body.answer === "NOT_YET") setNote(t("productDetail.delivery.notYetDone"));
      onChanged();
    },
    onError: (error) => setProblem(errorMessage(t, error)),
  });
  const send = (body: { answer: "TODAY" | "OTHER_DAY" | "NOT_YET"; day: string | null }) => {
    setProblem(null);
    answer.mutate({ params: { id: item.id }, body });
  };
  if (note) {
    return (
      <p role="status" className="text-caption text-text-muted">
        {note}
      </p>
    );
  }
  const today = toCalendarDay(new Date(now));
  return (
    <section aria-labelledby="dl-title" className="flex flex-col gap-2 rounded-md bg-surface-alt p-3">
      <h2 id="dl-title" className="text-body-sm font-semibold text-text">
        {t("productDetail.delivery.title")}
      </h2>
      <p className="text-caption text-text-muted">{t("productDetail.delivery.text")}</p>
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
      <span className="flex flex-wrap gap-2">
        <Button variant="secondary" size="compact" loading={answer.isPending && answer.variables.body.answer === "TODAY"} onClick={() => send({ answer: "TODAY", day: null })}>
          {t("productDetail.delivery.today")}
        </Button>
        <Button variant="secondary" size="compact" aria-expanded={otherDay} onClick={() => setOtherDay((open) => !open)}>
          {t("productDetail.delivery.otherDay")}
        </Button>
        <Button variant="ghost" size="compact" loading={answer.isPending && answer.variables.body.answer === "NOT_YET"} onClick={() => send({ answer: "NOT_YET", day: null })}>
          {t("productDetail.delivery.notYet")}
        </Button>
      </span>
      {otherDay && (
        <span className="flex flex-wrap items-end gap-2">
          <TextField
            label={t("productDetail.delivery.day")}
            type="date"
            value={day}
            max={today}
            {...(item.purchase ? { min: item.purchase.orderedOn } : {})}
            onChange={(event) => setDay(event.target.value)}
          />
          <Button size="compact" disabled={day === ""} loading={answer.isPending && answer.variables.body.answer === "OTHER_DAY"} onClick={() => send({ answer: "OTHER_DAY", day })}>
            {t("productDetail.delivery.save")}
          </Button>
        </span>
      )}
    </section>
  );
}
