"use client";

// "Yanlış fiyat bildir" / "Farklı ürün bildir" (design v1 case I, kept in v2; modules.md Trust and
// Accuracy): a side panel — for a wrong price the offer by its rank, an optional note, "Bildirimi
// gönder"; the answer comes later as a notification. The report names the offer by its ref only, so
// the seller is never written anywhere on this side (the API logs it by rank).
import { type DetailOffer, REPORT_NOTE_MAX } from "@firsatgeldi/contracts";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { Button, Select, Sheet, StatusBanner, TextField } from "@firsatgeldi/ui";
import { useRef, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation } from "../../lib/api/hooks";
import { money } from "../search-add/format";

export function ReportSheet({
  t,
  locale,
  trackedItemId,
  kind,
  offers,
  onClose,
}: {
  t: Translator;
  locale: Locale;
  trackedItemId: string;
  kind: "WRONG_PRICE" | "DIFFERENT_PRODUCT";
  offers: readonly DetailOffer[];
  onClose: () => void;
}) {
  const [offerRef, setOfferRef] = useState(offers[0]?.ref ?? "");
  const [note, setNote] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const attempt = useRef(globalThis.crypto.randomUUID());
  const report = useApiMutation("createReport", {
    onSuccess: () => setSent(true),
    onError: (error) => {
      attempt.current = globalThis.crypto.randomUUID();
      setProblem(errorMessage(t, error));
    },
  });
  const wrongPrice = kind === "WRONG_PRICE";
  const canSend = !wrongPrice || offerRef !== "";
  const send = () => {
    setProblem(null);
    report.mutate({
      body: { trackedItemId, kind, offerRef: wrongPrice ? offerRef : null, note: note.trim() || null },
      idempotencyKey: attempt.current,
    });
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={wrongPrice ? t("productDetail.report.wrongPrice") : t("productDetail.report.differentProduct")}
      closeLabel={t("common.close")}
      footer={
        sent ? (
          <Button onClick={onClose}>{t("common.close")}</Button>
        ) : (
          <Button onClick={send} disabled={!canSend} loading={report.isPending}>
            {t("productDetail.report.send")}
          </Button>
        )
      }
    >
      {sent ? (
        <StatusBanner tone="info">{t("productDetail.report.sent")}</StatusBanner>
      ) : (
        <div className="flex flex-col gap-4">
          {wrongPrice &&
            (offers.length ? (
              <Select
                label={t("productDetail.report.offer")}
                value={offerRef}
                onValueChange={setOfferRef}
                options={offers.map((offer) => ({
                  value: offer.ref,
                  label: [offer.rank === 1 ? t("trackedItems.v4.rankFirst") : t("trackedItems.v4.rank", { rank: offer.rank }), money(offer.price, locale)].join(t("common.listSeparator")),
                }))}
              />
            ) : (
              <StatusBanner tone="info">{t("productDetail.report.noOffers")}</StatusBanner>
            ))}
          {canSend && (
            <TextField label={t("productDetail.report.note")} helper={t("productDetail.report.answerLater")} maxLength={REPORT_NOTE_MAX} value={note} onChange={(event) => setNote(event.target.value)} />
          )}
          {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
        </div>
      )}
    </Sheet>
  );
}
