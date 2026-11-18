"use client";

// "Göster" · "Gizle" · "Mağazaya git" for hidden offers, shared by Home (Hemen Gözat) and Product
// Detail (modules.md Hidden Seller): the seller opens in place from the reveal answer only; "Gizle"
// hides it again; "Mağazaya git" re-checks through the API and opens the store in a new tab.
// Every press is logged by the API (reveal, reveal.hide, offer.go). `overrides` holds what the user
// changed on this screen; a screen whose data already says "revealed" passes that as the base.
import type { GoResult, HiddenOfferView, RevealedOfferView } from "@firsatgeldi/contracts";
import type { Translator } from "@firsatgeldi/i18n";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation } from "../../lib/api/hooks";

/** What the user did on this screen: a reveal answer, or hidden again. */
type Override = RevealedOfferView | "hidden";

export function useOfferActions(t: Translator, { onGoResult }: { onGoResult?: (offer: HiddenOfferView, result: GoResult) => void } = {}) {
  const [overrides, setOverrides] = useState<Record<string, Override>>({});
  const [problem, setProblem] = useState<string | null>(null);
  const onError = (error: unknown) => setProblem(errorMessage(t, error));
  const reveal = useApiMutation("revealOffer", { onError });
  const hide = useApiMutation("hideOffer", { onError });
  const go = useApiMutation("goToOffer", { onError });

  return {
    problem,
    /** The revealed seller of an offer, or null; `base` = what the screen's data already revealed. */
    shown(ref: string, base: RevealedOfferView | null = null): RevealedOfferView | null {
      const override = overrides[ref];
      return override === "hidden" ? null : (override ?? base);
    },
    reveal(offer: HiddenOfferView) {
      setProblem(null);
      reveal.mutate(
        { params: { ref: offer.ref }, idempotencyKey: globalThis.crypto.randomUUID() },
        { onSuccess: ({ data }) => (data.allowed ? setOverrides((current) => ({ ...current, [offer.ref]: data.offer })) : setProblem(t("errors.limitReached"))) },
      );
    },
    hide(offer: HiddenOfferView) {
      setProblem(null);
      hide.mutate({ params: { ref: offer.ref } }, { onSuccess: () => setOverrides((current) => ({ ...current, [offer.ref]: "hidden" })) });
    },
    /** `onResult` (per press) sees the re-check answer too: price changed, or gone (Product Detail flows A–B). */
    go(offer: HiddenOfferView, onResult?: (result: GoResult) => void) {
      setProblem(null);
      go.mutate(
        { params: { ref: offer.ref } },
        {
          onSuccess: ({ data }) => {
            if (data.status === "OK") globalThis.open(data.url, "_blank", "noopener,noreferrer");
            onGoResult?.(offer, data);
            onResult?.(data);
          },
        },
      );
    },
    revealing: (ref: string) => reveal.isPending && reveal.variables.params.ref === ref,
    going: (ref: string) => go.isPending && go.variables.params.ref === ref,
  };
}
