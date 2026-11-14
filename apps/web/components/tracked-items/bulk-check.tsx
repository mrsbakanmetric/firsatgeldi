"use client";

// Bulk "Görünenleri kontrol et (N)" (modules.md Tracked Items, Check Now;
// design "4 Takip Ettiklerim" States 3): checks the visible active items in one
// go. When the daily allowance is short, the number to be checked is stated
// first ("Bugün 3 hakkın kaldı · ilk 3 ürün…"); then progress per item (N/M);
// the user may leave the page. At zero the button is disabled with the reason.
import type { CheckNowBulkResult, TrackedItemListItem } from "@firsatgeldi/contracts";
import type { Translator } from "@firsatgeldi/i18n";
import { Button, Icon, StatusBanner } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, LoaderCircle, RefreshCw } from "lucide-react";
import { useRef, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { apiQueryKey, useApiMutation } from "../../lib/api/hooks";

type Phase = { kind: "idle" } | { kind: "confirm" } | { kind: "running"; result: CheckNowBulkResult; requested: readonly string[]; startedAt: number };

export interface BulkCheckProps {
  t: Translator;
  /** Visible active items, in list order. */
  visible: readonly TrackedItemListItem[];
  /** Every row the list knows, for names and fresh check times while running. */
  rows: readonly TrackedItemListItem[];
  /** Checks left today; null = unlimited. */
  remaining: number | null;
}

/** The toolbar button. */
export function useBulkCheck({ t, visible, rows, remaining }: BulkCheckProps) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [problem, setProblem] = useState<string | null>(null);
  /** Client time the run started: a row is done once its check time is later. */
  const startedAt = useRef(0);
  const run = useApiMutation("checkNowBulk", {
    onMutate: () => {
      startedAt.current = Date.now();
    },
    onSuccess: ({ data }, input) => {
      setPhase({ kind: "running", result: data, requested: input.body.trackedItemIds, startedAt: startedAt.current });
      void queryClient.invalidateQueries({ queryKey: apiQueryKey("listTrackedItems") });
      void queryClient.invalidateQueries({ queryKey: apiQueryKey("getTrackedItemsSummary") });
    },
    onError: (error) => {
      setPhase({ kind: "idle" });
      setProblem(errorMessage(t, error));
    },
  });

  const ids = visible.map((item) => item.id);
  const start = () => {
    setProblem(null);
    run.mutate({ body: { trackedItemIds: ids } });
  };
  const ask = () => {
    setProblem(null);
    if (remaining !== null && remaining < ids.length) setPhase({ kind: "confirm" });
    else start();
  };
  const busy = run.isPending || phase.kind === "running";
  const none = remaining === 0;

  const button = (
    <Button variant="secondary" size="compact" icon={RefreshCw} disabled={ids.length === 0 || none || busy} loading={run.isPending} onClick={ask}>
      {t("trackedItems.bulk.action", { count: ids.length })}
    </Button>
  );

  const panel = (
    <>
      {none && phase.kind === "idle" && ids.length > 0 && <p className="text-caption text-text-muted">{t("trackedItems.bulk.none")}</p>}
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
      {phase.kind === "confirm" && remaining !== null && (
        <StatusBanner
          tone="info"
          title={t("trackedItems.bulk.short", { count: remaining })}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="compact" onClick={start} loading={run.isPending}>
                {t("trackedItems.bulk.confirm", { count: remaining })}
              </Button>
              <Button variant="ghost" size="compact" onClick={() => setPhase({ kind: "idle" })}>
                {t("trackedItems.bulk.cancel")}
              </Button>
            </div>
          }
        >
          {t("trackedItems.bulk.shortNote")}
        </StatusBanner>
      )}
      {phase.kind === "running" && <Progress t={t} phase={phase} rows={rows} onClose={() => setPhase({ kind: "idle" })} />}
    </>
  );
  return { button, panel };
}

function Progress({ t, phase, rows, onClose }: { t: Translator; phase: Extract<Phase, { kind: "running" }>; rows: readonly TrackedItemListItem[]; onClose: () => void }) {
  const { result, requested, startedAt } = phase;
  const finished = (id: string) => {
    const at = rows.find((row) => row.id === id)?.lastCheckedAt;
    return at ? Date.parse(at) >= startedAt : false;
  };
  const done = result.willCheck.filter(finished).length;
  const total = result.willCheck.length;
  const complete = done === total;
  const name = (id: string) => rows.find((row) => row.id === id)?.product.name ?? "";
  const entries = requested.map((id) => {
    if (result.skippedCached.includes(id)) return { id, text: t("trackedItems.bulk.itemCached"), state: "done" as const };
    if (!result.willCheck.includes(id)) return { id, text: t("trackedItems.bulk.itemSkipped"), state: "skipped" as const };
    return finished(id) ? { id, text: t("trackedItems.bulk.itemDone"), state: "done" as const } : { id, text: t("trackedItems.bulk.itemRunning"), state: "running" as const };
  });
  return (
    <section aria-live="polite" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-body font-semibold text-text">{complete ? t("trackedItems.bulk.finished") : t("trackedItems.bulk.progress", { done, total })}</p>
        {!complete && <p className="text-caption text-text-muted">{t("trackedItems.bulk.canLeave")}</p>}
      </div>
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-center gap-2 text-body-sm">
            <Icon
              icon={entry.state === "running" ? LoaderCircle : CircleCheck}
              size="sm"
              className={entry.state === "done" ? "text-savings" : entry.state === "running" ? "text-primary motion-safe:animate-spin" : "text-text-muted"}
            />
            <span className="min-w-0 flex-1 truncate text-text">{name(entry.id)}</span>
            <span className="shrink-0 text-caption text-text-muted">{entry.text}</span>
          </li>
        ))}
      </ul>
      {complete && (
        <div>
          <Button variant="secondary" size="compact" onClick={onClose}>
            {t("trackedItems.bulk.close")}
          </Button>
        </div>
      )}
    </section>
  );
}
