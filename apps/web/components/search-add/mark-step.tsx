"use client";

// "Nasıl anladık" and "Hangisi seninki?" (design "1 Ara ve Ekle": Main,
// AttrEdit, Cases C/D; product_design_pattern.md §5.1, §5.27). "Nasıl anladık"
// (design v4) is one row of chips under the search box, no label; each chip says
// "Yanlışsa düzelt"; a change applies at once and a short "… değişti · Geri al"
// notice follows it. Candidates are products and variants only — no store, no
// price. Selection is a radio (design v4); the first result is pre-selected.
import type { IdentifyAnswer, IdentifyResult } from "@firsatgeldi/contracts";
import type { Translator, TranslationKey } from "@firsatgeldi/i18n";
import { AttributeChip, Button, cn, focusRing, Icon, ProductImage, SegmentedChoice, SkeletonBlock } from "@firsatgeldi/ui";
import { Check, ChevronDown, Package, RotateCcw } from "lucide-react";
import { useId, useState } from "react";
import { useApiQuery } from "../../lib/api/hooks";
import { imageUrl } from "./search-box";

export type Candidate = IdentifyResult["candidates"][number];

const HEADING_KEYS: Readonly<Record<string, TranslationKey>> = {
  type: "searchAdd.understood.headings.type",
  brand: "searchAdd.understood.headings.brand",
  model: "searchAdd.understood.headings.model",
  generation: "searchAdd.understood.headings.generation",
  color: "searchAdd.understood.headings.color",
};

export interface AttributeChange {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly previous: string;
  readonly critical: boolean;
}

export function Understood({ t, result, change, onAnswer, onUndo }: { t: Translator; result: IdentifyResult; change: AttributeChange | null; onAnswer: (answer: IdentifyAnswer, change: AttributeChange | null) => void; onUndo: () => void }) {
  if (!result.understood.length && !result.questions.length) return null;
  return (
    <section aria-label={t("searchAdd.understood.title")} className="flex flex-col gap-2">
      {result.understood.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {result.understood.map((attribute) => (
            <AttributeChip
              key={attribute.key}
              label={attribute.label}
              value={attribute.value}
              options={attribute.options}
              changed={change?.key === attribute.key}
              onPick={(value) =>
                onAnswer({ attributeKey: attribute.key, value }, { key: attribute.key, label: attribute.label, value, previous: attribute.value, critical: attribute.matchCritical })
              }
              texts={{
                ...(HEADING_KEYS[attribute.key] ? { listHeading: t(HEADING_KEYS[attribute.key] as TranslationKey) } : {}),
                typeLabel: t("searchAdd.understood.typeLabel"),
                hint: t("searchAdd.understood.hint"),
              }}
            />
          ))}
          {change && (
            <span role="status" className="inline-flex items-center gap-1 text-caption text-text">
              <span>{t("searchAdd.understood.changedShort", { label: change.label })}</span>
              <span aria-hidden="true" className="text-text-muted">
                {t("common.listSeparator")}
              </span>
              <Button variant="ghost" size="compact" icon={RotateCcw} onClick={onUndo}>
                {t("searchAdd.understood.undo")}
              </Button>
            </span>
          )}
        </div>
      )}
      {result.questions.map((question) => (
        <div key={question.id} className="flex flex-col gap-2">
          <p className="text-body-sm font-semibold text-text">{question.prompt}</p>
          <SegmentedChoice
            label={question.prompt}
            variant="chips"
            value={question.selectedOptionId ?? ""}
            options={question.options.map((option) => ({ value: option.id, label: option.label }))}
            onValueChange={(optionId) => onAnswer({ questionId: question.id, optionId }, null)}
          />
        </div>
      ))}
    </section>
  );
}

/** One result as a radio (design v4): filled circle + check when selected; no "İşaretlendi" badge. */
function CandidateCard({ candidate, name, selected, onSelect, difference, stores }: { candidate: Candidate; name: string; selected: boolean; onSelect: () => void; difference?: string | null; stores: string }) {
  const product = candidate.product;
  return (
    <div>
      <label
        className={cn(
          "flex cursor-pointer items-center gap-4 rounded-lg bg-surface p-4 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
          selected ? "border-(length:--border-width-strong) border-primary" : "border border-border hover:border-text-muted",
        )}
      >
        <input type="radio" name={name} checked={selected} onChange={onSelect} className="peer sr-only" />
        <span
          aria-hidden="true"
          className={cn(
            "flex size-(--size-icon-md) shrink-0 items-center justify-center rounded-pill border-(length:--border-width-strong)",
            selected ? "border-primary bg-primary text-on-primary" : "border-border bg-surface",
          )}
        >
          {selected && <Icon icon={Check} size="sm" />}
        </span>
        <ProductImage src={imageUrl(product.imageSha256)} size="md" fallbackIcon={Package} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-body font-semibold break-words text-text">{product.name}</span>
          {candidate.variantLine && <span className="text-body-sm text-text-muted">{candidate.variantLine}</span>}
          {difference && <span className="text-caption text-on-warning-subtle">{difference}</span>}
          <span className="text-caption text-text-muted">{stores}</span>
        </span>
      </label>
    </div>
  );
}

export function Candidates({
  t,
  result,
  markedId,
  onSelect,
  onFixSearch,
}: {
  t: Translator;
  result: IdentifyResult;
  markedId: string | null;
  onSelect: (candidate: Candidate) => void;
  onFixSearch: () => void;
}) {
  const name = useId();
  const stores = (candidate: Candidate) => t("searchAdd.suggest.stores", { count: candidate.product.storeCount });
  const exact = result.candidates.filter((candidate) => candidate.match === "EXACT");
  const close = result.candidates.filter((candidate) => candidate.match === "CLOSE");
  const lead = (exact[0] ?? close[0])?.product.id ?? null;
  return (
    <section aria-labelledby="candidates-title" className="flex flex-col gap-3">
      <h2 id="candidates-title" className="text-h2 text-text">
        {t("searchAdd.candidates.title")}
      </h2>
      {exact.length > 0 ? (
        <>
          <p className="text-body-sm text-text-muted">{t("searchAdd.candidates.summary", { count: exact.length })}</p>
          <div role="radiogroup" aria-labelledby="candidates-title" className="flex flex-col gap-3">
            {exact.map((candidate) => (
              <CandidateCard key={candidate.product.id} name={name} candidate={candidate} selected={candidate.product.id === markedId} onSelect={() => onSelect(candidate)} stores={stores(candidate)} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1 rounded-md bg-warning-subtle p-3">
            <p className="text-body font-semibold text-on-warning-subtle">{t("searchAdd.candidates.noExactTitle")}</p>
            <p className="text-body-sm text-text">{t("searchAdd.candidates.noExactText", { count: close.length })}</p>
          </div>
          <div role="radiogroup" aria-labelledby="candidates-title" className="flex flex-col gap-3">
            {close.map((candidate) => (
              <CandidateCard
                key={candidate.product.id}
                name={name}
                candidate={candidate}
                selected={candidate.product.id === markedId}
                onSelect={() => onSelect(candidate)}
                stores={stores(candidate)}
                difference={candidate.difference ? t(`searchAdd.candidates.difference.${candidate.difference}`) : null}
              />
            ))}
          </div>
          <Button variant="ghost" onClick={onFixSearch} className="self-start">
            {t("searchAdd.candidates.fixSearch")}
          </Button>
        </>
      )}
      {result.similarCount > 0 && lead && <Similar t={t} productId={lead} count={result.similarCount} />}
    </section>
  );
}

/** "Benzer ama farklı · N": other generation, bundle or accessory; collapsed, opened on request, not compared. */
function Similar({ t, productId, count }: { t: Translator; productId: string; count: number }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const similar = useApiQuery("getSimilarProducts", { params: { id: productId } }, { enabled: open });
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => setOpen((value) => !value)}
        className={cn("flex min-h-(--size-touch-target-min) items-center gap-3 p-4 text-left", focusRing)}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-body font-semibold text-text">{t("searchAdd.candidates.similar", { count })}</span>
          <span className="text-caption text-text-muted">{t("searchAdd.candidates.similarNote")}</span>
        </span>
        <Icon icon={ChevronDown} className={cn("text-text-muted", open && "rotate-180")} />
      </button>
      {open && (
        <ul id={`${id}-list`} className="flex flex-col gap-2 px-4 pb-4">
          {similar.isPending && <SkeletonBlock shape="card" />}
          {similar.data?.data.items.map((item) => (
            <li key={item.product.id} className="flex items-center gap-3">
              <ProductImage src={imageUrl(item.product.imageSha256)} size="sm" fallbackIcon={Package} />
              <span className="flex min-w-0 flex-col">
                <span className="text-body-sm text-text">{item.product.name}</span>
                <span className="text-caption text-text-muted">{t(`searchAdd.candidates.difference.${item.difference}`)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export type BulkState = "done" | "current" | "next" | "skipped";

/** Several products in one screenshot (design case C): each is marked and confirmed in turn; skipped ones stay. */
export function BulkList({ t, items, states, current, onSkip, onOpen }: { t: Translator; items: IdentifyResult["items"]; states: readonly BulkState[]; current: number; onSkip: () => void; onOpen: (index: number) => void }) {
  const stateText: Record<BulkState, string> = {
    done: t("searchAdd.bulk.done"),
    current: t("searchAdd.bulk.current"),
    next: t("searchAdd.bulk.next"),
    skipped: t("searchAdd.bulk.skipped"),
  };
  return (
    <section aria-labelledby="bulk-title" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="bulk-title" className="text-h3 text-text">
          {t("searchAdd.bulk.found", { count: items.length, current: current + 1 })}
        </h2>
        <Button variant="ghost" onClick={onSkip}>
          {t("searchAdd.bulk.skip")}
        </Button>
      </div>
      <ol className="flex flex-col gap-2">
        {items.map((item, index) => {
          const state = states[index] ?? "next";
          return (
            <li key={item.id} className={cn("flex items-center gap-3 rounded-md p-3", state === "current" ? "border-(length:--border-width-strong) border-primary" : "border border-border")}>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-(--size-step-indicator-dot) shrink-0 items-center justify-center rounded-pill text-caption font-semibold",
                  state === "done" ? "bg-primary text-on-primary" : state === "current" ? "border-(length:--border-width-strong) border-primary text-primary" : "border-(length:--border-width-strong) border-border text-text-muted",
                )}
              >
                {state === "done" ? <Icon icon={Check} size="sm" /> : index + 1}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body-sm font-semibold text-text">{item.label}</span>
                <span className="text-caption text-text-muted">{stateText[state]}</span>
              </span>
              {state === "skipped" && (
                <Button variant="ghost" onClick={() => onOpen(index)}>
                  {t("searchAdd.bulk.open")}
                </Button>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-caption text-text-muted">{t("searchAdd.bulk.note")}</p>
    </section>
  );
}
