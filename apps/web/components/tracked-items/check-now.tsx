"use client";

// "Şimdi kontrol et" for one tracked item (modules.md Check Now), shared by Home (Hemen Gözat) and
// Product Detail: the remaining allowance beside the button; a check within the cache window is
// shown at once without using the allowance; a running check ends when the item's check time moves
// past the request (the live update refreshes the data). No allowance left → disabled with the reason.
import type { TrackedItemListItem } from "@firsatgeldi/contracts";
import type { Translator } from "@firsatgeldi/i18n";
import { Button } from "@firsatgeldi/ui";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation } from "../../lib/api/hooks";

/** A check counts as finished when the item's check time is this close to the request, or later. */
const CLOCK_SKEW_MS = 1000;

export function CheckNowControls({ t, item, remaining }: { t: Translator; item: Pick<TrackedItemListItem, "id" | "lastCheckedAt">; remaining: number | null }) {
  const [note, setNote] = useState<{ kind: "checking" | "cached"; at: number } | { kind: "error"; text: string } | null>(null);
  const check = useApiMutation("checkNow", {
    onSuccess: ({ data }) => setNote({ kind: data.status === "CACHED" ? "cached" : "checking", at: Date.now() }),
    onError: (error) => setNote({ kind: "error", text: errorMessage(t, error) }),
  });
  const checking = note?.kind === "checking" && !(item.lastCheckedAt && Date.parse(item.lastCheckedAt) >= note.at - CLOCK_SKEW_MS);
  const done = note?.kind === "checking" && !checking;
  const status = checking
    ? t("home.featured.checking")
    : note?.kind === "cached"
      ? t("home.featured.checkCached")
      : done
        ? t("home.featured.checkDone")
        : note?.kind === "error"
          ? note.text
          : remaining === null
            ? null
            : remaining === 0
              ? t("home.featured.checksNone")
              : t("home.featured.checksLeft", { count: remaining });
  return (
    <span className="flex flex-wrap items-center gap-3">
      <span role="status" className="text-caption text-text-muted">
        {status}
      </span>
      <Button
        variant="secondary"
        size="compact"
        icon={RefreshCw}
        loading={check.isPending || checking}
        disabled={remaining === 0}
        onClick={() => {
          setNote(null);
          check.mutate({ params: { id: item.id }, idempotencyKey: globalThis.crypto.randomUUID() });
        }}
      >
        {t("home.featured.checkNow")}
      </Button>
    </span>
  );
}
