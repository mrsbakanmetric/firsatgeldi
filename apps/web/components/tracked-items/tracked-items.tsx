"use client";

// Tracked Items screen (design "4 Takip Ettiklerim" v2–v3; pagedesign.md §8.4;
// modules.md Tracked Items): List template — title + one meta line + compact
// "Ürün ekle" (→ Search and Add) · one thin row of four figures · the shared
// SearchBox (filters this list; a photo or link goes to Search and Add) + filter
// chips Tümü · Fırsat var · Biten + "Kategori" and "Sırala" + "Görünenleri kontrol
// et (N)" · the "Fırsat geldi" group first (the page's one coral badge) · other
// rows · "Biten takipler (N)" collapsed. Rows link to Product Detail; ⋯ → "Takibi
// bitir" with "Geri al" for 7 days. States: empty · empty filter · bulk check ·
// stale row · error · loading. Cheaper sellers are never named here (no "Göster").
import type { TrackedItemFilter, TrackedItemListItem, TrackedItemSort } from "@firsatgeldi/contracts";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import {
  Button,
  buttonClasses,
  CategoryFilter,
  EmptyState,
  FilterChips,
  Flag,
  Icon,
  PageTemplate,
  SearchBox,
  SkeletonBlock,
  SortSelect,
  StatTile,
  StatTiles,
  StatusBanner,
} from "@firsatgeldi/ui";
import { keepPreviousData } from "@tanstack/react-query";
import type { EndTrackingResult } from "@firsatgeldi/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, ChevronDown, CircleCheck, ListChecks, LogIn, Plus, RotateCcw, SearchX, Zap } from "lucide-react";
import Link from "next/link";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { apiQueryKey, useApiMutation, useApiQuery, useSession } from "../../lib/api/hooks";
import { isLink, PhotoInput, useHandOverToSearchAdd } from "../input-source/input-source";
import { HANDOFF_PARAMS, searchAddHref } from "../../lib/handoff";
import { ago, money, useNow } from "../search-add/format";
import { useTranslator } from "../shell/parts";
import { useBulkCheck } from "./bulk-check";
import { EndTrackingDialog } from "./end-dialog";
import { shortDay } from "./format";
import { TrackedRow } from "./row";

/** Time after the last keystroke before the list is asked again. */
const TYPING_PAUSE_MS = 250;
const MS_PER_HOUR = 3_600_000;
/** v3: no "Aldım" / "Almak istiyorum" chips; each row carries its status instead. */
const FILTERS: readonly TrackedItemFilter[] = ["all", "deal", "ended"];
const SORTS: readonly TrackedItemSort[] = ["priority", "deadline", "saving"];
const LOADING_ROWS = 4;

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

export function TrackedItems({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const session = useSession();
  const signedIn = session.status === "ready" && session.me !== null;

  if (session.status === "ready" && session.me === null) {
    const next = localizedPath("/takip", locale);
    return (
      <PageTemplate kind="list" title={t("trackedItems.title")}>
        <EmptyState
          icon={LogIn}
          title={t("trackedItems.states.signInTitle")}
          description={t("trackedItems.states.signInText")}
          action={
            <Link href={`${localizedPath("/giris", locale)}?next=${encodeURIComponent(next)}`} className={buttonClasses("primary")}>
              {t("trackedItems.states.signIn")}
            </Link>
          }
        />
      </PageTemplate>
    );
  }
  return <SignedInList t={t} locale={locale} enabled={signedIn} />;
}

function SignedInList({ t, locale, enabled }: { t: Translator; locale: Locale; enabled: boolean }) {
  const now = useNow();
  const [filter, setFilter] = useState<TrackedItemFilter>("all");
  const [sort, setSort] = useState<TrackedItemSort>("priority");
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const typed = search.trim();
  const debounced = useDebounced(typed);
  /** "Ara" / Enter applies the text at once; a link is not a filter (it goes to Search and Add). */
  const [applied, setApplied] = useState<string | null>(null);
  const q = isLink(typed) ? "" : applied === typed ? typed : debounced;
  const handOver = useHandOverToSearchAdd(locale);
  const fileInput = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [ending, setEnding] = useState<TrackedItemListItem | null>(null);
  const [notice, setNotice] = useState<{ kind: "ended"; item: TrackedItemListItem; result: EndTrackingResult } | { kind: "restored"; item: TrackedItemListItem } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: apiQueryKey("listTrackedItems") });
    void queryClient.invalidateQueries({ queryKey: apiQueryKey("getTrackedItemsSummary") });
  };
  const restore = useApiMutation("restoreTracking", {
    onSuccess: (_data, input) => {
      const item = items.find((entry) => entry.id === input.params.id);
      setNotice(item ? { kind: "restored", item } : null);
      refresh();
    },
    onError: (error) => setProblem(errorMessage(t, error)),
  });
  const onEnded = (item: TrackedItemListItem, result: EndTrackingResult) => {
    setEnding(null);
    setProblem(null);
    setNotice({ kind: "ended", item, result });
    refresh();
  };
  const runRestore = (item: TrackedItemListItem) => {
    setProblem(null);
    restore.mutate({ params: { id: item.id } });
  };
  const [endedOpen, setEndedOpen] = useState(false);

  const list = useApiQuery(
    "listTrackedItems",
    { query: { filter, sort, ...(q ? { q } : {}), ...(category ? { category } : {}) } },
    { enabled, placeholderData: keepPreviousData },
  );
  const summary = useApiQuery("getTrackedItemsSummary", {}, { enabled });
  const entitlements = summary.data?.meta?.entitlements ?? list.data?.meta?.entitlements ?? null;
  const items = list.data?.data.items ?? [];
  const facets = list.data?.data.facets ?? null;
  const active = items.filter((item) => item.state === "ACTIVE");
  const ended = items.filter((item) => item.state !== "ACTIVE");
  const remaining = entitlements?.checkNow.limit === null || !entitlements ? null : Math.max(0, entitlements.checkNow.limit - entitlements.checkNow.used);
  const bulk = useBulkCheck({ t, visible: active, rows: items, remaining });

  // Back from Search and Add: say once which product was added, then drop the parameter.
  const [addedId, setAddedId] = useState<string | null>(null);
  const read = useRef(false);
  const readAdded = useEffectEvent(() => {
    const url = new URL(globalThis.location.href);
    const id = url.searchParams.get(HANDOFF_PARAMS.added);
    if (!id) return;
    setAddedId(id);
    url.searchParams.delete(HANDOFF_PARAMS.added);
    globalThis.history.replaceState(globalThis.history.state, "", url.toString());
  });
  useEffect(() => {
    if (read.current) return;
    read.current = true;
    readAdded();
  }, []);
  const added = addedId ? items.find((item) => item.id === addedId) : undefined;

  const addLink = (
    <Link href={searchAddHref(locale, { backToTracking: true })} className={buttonClasses("primary", "gap-2", "compact")}>
      <Icon icon={Plus} />
      {t("trackedItems.add")}
    </Link>
  );

  const caption = entitlements
    ? [
        entitlements.tracking.limit === null
          ? t("trackedItems.trackingCountUnlimited", { used: entitlements.tracking.used })
          : t("trackedItems.trackingCount", { used: entitlements.tracking.used, limit: entitlements.tracking.limit }),
        remaining === null ? null : t("trackedItems.checksLeft", { count: remaining }),
      ]
        .filter(Boolean)
        .join(t("common.listSeparator"))
    : undefined;

  const figures = summary.data?.data;
  const summaryRow = figures ? (
    <StatTiles label={t("trackedItems.summary.label")}>
      <StatTile
        label={t("trackedItems.summary.tracked")}
        value={t("trackedItems.summary.products", { count: figures.tracking.count })}
        detail={t("trackedItems.summary.trackedDetail", { bought: figures.tracking.bought, want: figures.tracking.want })}
      />
      <StatTile
        label={t("trackedItems.summary.deals")}
        value={t("trackedItems.summary.products", { count: figures.deals.count })}
        tone={figures.deals.count ? "saving" : "default"}
        {...(figures.deals.maxSavingTotal ? { detail: t("trackedItems.summary.dealsDetail", { amount: money(figures.deals.maxSavingTotal, locale) }) } : {})}
      />
      <StatTile
        label={t("trackedItems.summary.returnsSoon")}
        value={t("trackedItems.summary.products", { count: figures.returnsSoon.count })}
        {...(figures.returnsSoon.nearest ? { detail: t("trackedItems.summary.returnsDetail", { date: shortDay(figures.returnsSoon.nearest, locale) }) } : {})}
      />
      <StatTile label={t("trackedItems.summary.lastCheck")} value={figures.lastCheckedAt ? ago(t, figures.lastCheckedAt, now) : t("trackedItems.summary.lastCheckNone")} />
    </StatTiles>
  ) : summary.isPending && enabled ? (
    <SkeletonBlock shape="title" width="3/4" />
  ) : undefined;

  const counts = facets?.filters;
  const hasAny = (counts?.all ?? 0) > 0 || typed.length > 0 || category !== "" || filter !== "all";
  /** Nothing tracked yet: the empty state is the page (one action, no zero figures). */
  const firstRun = list.isSuccess && !hasAny;
  const toolbar = hasAny ? (
    <>
      <div className="w-full">
        <PhotoInput inputRef={fileInput} onFiles={handOver.files} />
        {/* The shared SearchBox (v3): here it filters this list; a photo or a link goes to Search and Add. */}
        <SearchBox
          label={t("trackedItems.search.label")}
          placeholder={t("trackedItems.search.placeholder")}
          value={search}
          onValueChange={setSearch}
          onSubmit={() => (isLink(typed) ? handOver.link(typed) : setApplied(typed))}
          submitLabel={t("searchAdd.search.submit")}
          submitDisabled={typed.length === 0}
          addPhotoLabel={t("searchAdd.search.addPhoto")}
          onAddPhoto={() => fileInput.current?.click()}
          clearLabel={t("trackedItems.search.clear")}
        />
      </div>
      <FilterChips
        label={t("trackedItems.filters.label")}
        options={FILTERS.map((id) => ({ id, label: t(`trackedItems.filters.${id}`), count: counts?.[id] ?? 0 }))}
        value={filter}
        onChange={setFilter}
      />
      <CategoryFilter
        label={t("trackedItems.category.label")}
        options={[{ id: "", label: t("trackedItems.category.all") }, ...(facets?.categories ?? []).map((entry) => ({ id: entry.id, label: entry.name, count: entry.count }))]}
        value={category}
        onChange={setCategory}
      />
      <SortSelect label={t("trackedItems.sort.label")} options={SORTS.map((id) => ({ id, label: t(`trackedItems.sort.${id}`) }))} value={sort} onChange={setSort} />
      <span className="md:ml-auto">{bulk.button}</span>
    </>
  ) : undefined;

  const clearAll = () => {
    setSearch("");
    setApplied(null);
    setCategory("");
    setFilter("all");
  };

  const rowProps = { t, locale, now, onEnd: setEnding, onRestore: runRestore, restoringId: restore.isPending ? (restore.variables?.params.id ?? null) : null };
  const notices = (
    <>
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
      {notice?.kind === "ended" && (
        <StatusBanner
          tone="info"
          icon={CircleCheck}
          action={
            <Button variant="ghost" size="compact" icon={RotateCcw} loading={restore.isPending} onClick={() => runRestore(notice.item)}>
              {t("trackedItems.v3.restore")}
            </Button>
          }
        >
          {[t("trackedItems.v3.ended", { name: notice.item.product.name }), notice.result.saving ? t("trackedItems.v3.endedSaving", { amount: money(notice.result.saving, locale) }) : null]
            .filter(Boolean)
            .join(t("common.listSeparator"))}
        </StatusBanner>
      )}
      {notice?.kind === "restored" && (
        <StatusBanner tone="info" icon={CircleCheck}>
          {t("trackedItems.v3.restored", { name: notice.item.product.name })}
        </StatusBanner>
      )}
    </>
  );

  let content;
  if (list.isPending) {
    content = <Loading t={t} />;
  } else if (list.isError) {
    content = (
      <StatusBanner
        tone="danger"
        title={t("trackedItems.states.errorTitle")}
        action={
          <Button variant="secondary" onClick={() => (void list.refetch(), void summary.refetch())}>
            {t("trackedItems.states.retry")}
          </Button>
        }
      >
        {t("trackedItems.states.errorText")}
      </StatusBanner>
    );
  } else if (!hasAny) {
    const limit = entitlements?.tracking.limit ?? null;
    content = (
      <EmptyState
        icon={ListChecks}
        title={t("trackedItems.states.emptyTitle")}
        description={t("trackedItems.states.emptyText")}
        action={
          <div className="flex flex-col items-center gap-2">
            <Link href={searchAddHref(locale, { backToTracking: true })} className={buttonClasses("primary")}>
              {t("trackedItems.states.emptyAction")}
            </Link>
            {limit !== null && <p className="text-caption text-text-muted">{t("trackedItems.states.emptyAllowance", { count: limit })}</p>}
          </div>
        }
      />
    );
  } else if (items.length === 0) {
    const searching = typed.length > 0 || category !== "";
    content = (
      <div className="flex flex-col gap-3">
        {/* v3: nothing in the list matches → search the catalogue for it. */}
        {typed.length > 0 && (
          <Link
            href={`${searchAddHref(locale, { backToTracking: true })}&q=${encodeURIComponent(typed)}`}
            className="flex min-h-(--size-touch-target-min) items-center gap-3 rounded-lg border border-border bg-surface p-3 text-body-sm font-semibold text-primary hover:bg-surface-alt"
          >
            <Icon icon={ArrowRight} />
            {t("trackedItems.v3.searchAdd", { query: typed })}
          </Link>
        )}
        <EmptyState
          icon={SearchX}
          title={searching ? t("trackedItems.states.searchEmpty") : t(`trackedItems.states.filterEmpty.${filter}`)}
          description={figures?.lastCheckedAt ? t("trackedItems.states.filterEmptyText", { ago: ago(t, figures.lastCheckedAt, now) }) : ""}
          action={
            <Button variant="secondary" size="compact" onClick={clearAll}>
              {searching ? t("trackedItems.states.clearFilters") : t("trackedItems.states.showAll")}
            </Button>
          }
        />
      </div>
    );
  } else {
    const deals = active.filter((item) => item.deal !== null && !item.stale);
    const others = active.filter((item) => !deals.includes(item));
    const stale = active.filter((item) => item.stale);
    const oldest = stale.map((item) => item.lastCheckedAt).filter((at): at is string => at !== null).sort()[0];
    content = (
      <div className="flex flex-col gap-3">
        {added && !notice && (
          <StatusBanner tone="info" icon={CircleCheck}>
            {t("trackedItems.added", { name: added.product.name })}
          </StatusBanner>
        )}
        {bulk.panel}
        {stale.length > 0 && oldest && (
          <StatusBanner tone="warning">{t("trackedItems.states.stale", { count: stale.length, hours: Math.floor((now - Date.parse(oldest)) / MS_PER_HOUR) })}</StatusBanner>
        )}
        {active.length > 0 && <ColumnHeads t={t} />}
        {filter === "ended" ? (
          <Rows {...rowProps} items={ended} />
        ) : (
          <>
            {deals.length > 0 && (
              // v3: rows with a current deal first; the group heading carries the page's one coral badge.
              <section aria-labelledby="deal-group" className="flex flex-col gap-2">
                <h2 id="deal-group" className="flex items-center gap-2">
                  <Flag tone="deal" icon={Zap}>
                    {t("trackedItems.row.flags.deal")}
                  </Flag>
                  <span className="sr-only">{t("trackedItems.v3.dealGroup")}</span>
                </h2>
                <Rows {...rowProps} items={deals} />
              </section>
            )}
            <Rows {...rowProps} items={others} />
            {ended.length > 0 && (
              <section className="flex flex-col gap-3">
                <button
                  type="button"
                  aria-expanded={endedOpen}
                  aria-controls="ended-rows"
                  onClick={() => setEndedOpen((open) => !open)}
                  className={buttonClasses("ghost", "self-start", "compact")}
                >
                  <Icon icon={ChevronDown} {...(endedOpen ? { className: "rotate-180" } : {})} />
                  {t("trackedItems.ended.title", { count: ended.length })}
                </button>
                <div id="ended-rows" hidden={!endedOpen}>
                  {endedOpen && <Rows {...rowProps} items={ended} />}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <PageTemplate
      kind="list"
      title={t("trackedItems.title")}
      {...(caption ? { caption } : {})}
      {...(firstRun ? {} : { actions: addLink })}
      {...(summaryRow && !firstRun ? { summary: summaryRow } : {})}
      {...(toolbar ? { toolbar } : {})}
    >
      {notices}
      {content}
      {ending && <EndTrackingDialog t={t} locale={locale} item={ending} onClose={() => setEnding(null)} onEnded={onEnded} />}
    </PageTemplate>
  );
}

interface RowsProps {
  t: Translator;
  locale: Locale;
  items: readonly TrackedItemListItem[];
  now: number;
  onEnd: (item: TrackedItemListItem) => void;
  onRestore: (item: TrackedItemListItem) => void;
  restoringId: string | null;
}

function Rows({ t, locale, items, now, onEnd, onRestore, restoringId }: RowsProps) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <TrackedRow t={t} locale={locale} item={item} now={now} onEnd={onEnd} onRestore={onRestore} restoring={restoringId === item.id} />
        </li>
      ))}
    </ul>
  );
}

/** Column titles from breakpoint.md, lined up with the row columns (decorative: each row says its values). */
function ColumnHeads({ t }: { t: Translator }) {
  return (
    <div aria-hidden="true" className="hidden gap-4 px-3 text-caption text-text-muted md:flex">
      <span className="flex-1">{t("trackedItems.columns.product")}</span>
      <span className="w-1/4 shrink-0">{t("trackedItems.columns.price")}</span>
      <span className="w-1/6 shrink-0">{t("trackedItems.columns.stock")}</span>
      <span className="w-1/5 shrink-0">{t("trackedItems.columns.state")}</span>
      {/* Same width as the row's ⋯ button (button.compact, icon only). */}
      <span className="min-w-(--component-button-compact-height-touch) shrink-0 md:pointer-fine:min-w-(--component-button-compact-height)" />
    </div>
  );
}

/** Loading (design States 6): skeleton rows with the same column sizes. */
function Loading({ t }: { t: Translator }) {
  return (
    <div role="status" aria-label={t("trackedItems.states.loading")} className="flex flex-col gap-2">
      {Array.from({ length: LOADING_ROWS }, (_, index) => (
        <span key={index} aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 md:flex-row md:items-center md:gap-4">
          <span className="flex items-center gap-3 md:flex-1">
            <SkeletonBlock shape="thumb" />
            <span className="flex flex-1 flex-col gap-2">
              <SkeletonBlock shape="pill" width="1/3" />
              <SkeletonBlock shape="title" width="3/4" />
              <SkeletonBlock width="1/2" />
            </span>
          </span>
          <SkeletonBlock shape="title" className="md:w-1/4" />
          <SkeletonBlock className="md:w-1/6" />
          <SkeletonBlock width="2/3" className="md:w-1/5" />
        </span>
      ))}
    </div>
  );
}
