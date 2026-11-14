"use client";

// Search and Add screen (design "1 Ara ve Ekle"; modules.md Search and Add;
// pagedesign.md §8.2): Flow template — Bul → Hangisi seninki? → Emin ol, onayla.
// Desktop: the confirm panel in the right column; phone: a "Onaya geç" bar opens
// it as a sheet. Five states: loading, empty, error (input kept), stale (confirm
// panel), success. Guests search and mark freely; sign-in comes at confirmation.
import type { ApiError, IdentifyAnswer, IdentifyResult, ProductSummary } from "@firsatgeldi/contracts";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, cn, EmptyState, focusRing, Icon, MoneyDisplay, PageTemplate, ProductImage, Sheet, SkeletonBlock, SkeletonRow, StatusBanner, StepIndicator } from "@firsatgeldi/ui";
import { Camera, CircleCheck, Link2, Package, PencilLine, SearchX } from "lucide-react";
import Link from "next/link";
import { type RefObject, useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { useApiMutation, useSession } from "../../lib/api/hooks";
import { UPLOAD_TIMEOUT_TEXT } from "../../lib/api/uploads";
import { useTranslator } from "../shell/parts";
import { type Created, GuestConfirm, type Prefill, SignedInConfirm } from "./confirm";
import { clearDraft, readDraft, RESUME_PARAM, saveDraft } from "./draft";
import { formatDay, money, useNow } from "./format";
import { type AttributeChange, BulkList, type BulkState, type Candidate, Candidates, Understood } from "./mark-step";
import { PhotoArea } from "./photos";
import { imageUrl, isLink, SearchBox } from "./search-box";
import { usePhotos } from "./use-photos";

type IdentifyBody = { text?: string; uploadIds?: string[]; link?: string };

/** Search text handed over by the shell's search box (`/ara?q=…`). */
const QUERY_PARAM = "q";
const STEP_COUNT = 3;

function stepNames(t: Translator) {
  return [t("searchAdd.steps.find"), t("searchAdd.steps.mark"), t("searchAdd.steps.confirm")] as const;
}

/** A result that holds only one candidate (restored after sign-in, or one bulk item). */
function singleResult(base: IdentifyResult | null, requestId: string, candidates: readonly Candidate[]): IdentifyResult {
  return { requestId, understood: [], questions: [], candidates: [...candidates], items: [], similarCount: 0, link: base?.link ?? null };
}

function nextOpen(states: readonly BulkState[], from: number): number {
  const after = states.findIndex((state, index) => index > from && state === "next");
  return after >= 0 ? after : states.findIndex((state) => state === "next");
}

export function SearchAndAdd({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const now = useNow();
  const session = useSession();
  const signedIn = session.status === "ready" && session.me !== null;
  const photos = usePhotos();
  // The page's one file input and the search box: the file dialog opens only
  // from "Fotoğraf ekle" and the photo way card; the other cards focus the box.
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const pickPhoto = () => fileInput.current?.click();
  const focusSearch = () => searchInput.current?.focus();

  const [query, setQuery] = useState("");
  const [lastText, setLastText] = useState("");
  const [result, setResult] = useState<IdentifyResult | null>(null);
  const [marked, setMarked] = useState<Candidate | null>(null);
  const [change, setChange] = useState<AttributeChange | null>(null);
  const [linkPrefill, setLinkPrefill] = useState<Prefill | null>(null);
  const [initial, setInitial] = useState<{ pricePaid: string; orderedOn: string } | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [bulk, setBulk] = useState<{ states: BulkState[]; current: number } | null>(null);
  /** What failed, so "Tekrar dene" repeats exactly that (the input is kept). */
  const [error, setError] = useState<{ error: ApiError; kind: "identify" | "answer" | "suggest" } | null>(null);
  const lastIdentify = useRef<{ body: IdentifyBody; markProductId: string | null } | null>(null);
  const lastAnswer = useRef<{ body: IdentifyAnswer; change: AttributeChange | null } | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const identify = useApiMutation("identify");
  const answer = useApiMutation("answerIdentify");

  const showResult = useCallback((data: IdentifyResult, markProductId: string | null) => {
    setResult(data);
    setChange(null);
    setCreated(null);
    setBulk(data.items.length ? { states: data.items.map((_, index) => (index === 0 ? "current" : "next")), current: 0 } : null);
    const candidates = data.items.length ? (data.items[0]?.candidates ?? []) : data.candidates;
    setMarked(markProductId ? (candidates.find((candidate) => candidate.product.id === markProductId) ?? null) : null);
  }, []);

  const runIdentify = useCallback(
    (body: IdentifyBody, markProductId: string | null = null) => {
      setError(null);
      setLastText(body.text ?? "");
      lastIdentify.current = { body, markProductId };
      identify.mutate(
        { body },
        {
          onSuccess: ({ data }) => showResult(data, markProductId),
          onError: (failure) => setError({ error: failure, kind: "identify" }),
        },
      );
    },
    [identify, showResult],
  );

  const submit = () => {
    const text = query.trim();
    if (isLink(text)) return runIdentify({ link: text });
    runIdentify({ ...(text ? { text } : {}), ...(photos.readyIds.length ? { uploadIds: photos.readyIds } : {}) });
  };

  // The shell's search box hands over `?q=`; after sign-in `?devam=1` restores the guest's draft.
  const started = useRef(false);
  const start = useEffectEvent(() => {
    const params = new URLSearchParams(globalThis.location.search);
    const draft = params.has(RESUME_PARAM) ? readDraft() : null;
    if (draft && signedIn) {
      setQuery(draft.query);
      setResult(singleResult(null, draft.identifyRequestId ?? "", [draft.candidate]));
      setMarked(draft.candidate);
      setInitial({ pricePaid: draft.pricePaid, orderedOn: draft.orderedOn });
      clearDraft();
      return;
    }
    const handed = params.get(QUERY_PARAM)?.trim();
    if (handed) {
      setQuery(handed);
      runIdentify(isLink(handed) ? { link: handed } : { text: handed });
    }
  });
  useEffect(() => {
    if (started.current || session.status === "loading") return;
    started.current = true;
    start();
  }, [session.status]);

  // The user's own link wins; otherwise an order screen read from a photo fills the confirm panel (design cases A, B).
  const extracted = photos.extracted;
  const prefill: Prefill | null =
    linkPrefill ??
    (extracted
      ? { source: "SCREENSHOT", platformId: null, platformName: extracted.platformName, sellerName: extracted.sellerName, pricePaid: extracted.pricePaid, orderedOn: extracted.orderedOn }
      : null);

  const toggleMark = (candidate: Candidate) => {
    const next = marked?.product.id === candidate.product.id ? null : candidate;
    setMarked(next);
    setSheetOpen(false);
  };

  const onAnswer = (body: IdentifyAnswer, attributeChange: AttributeChange | null) => {
    if (!result) return;
    setError(null);
    answer.mutate(
      { params: { requestId: result.requestId }, body },
      {
        onSuccess: ({ data }) => {
          setResult(data);
          setChange(attributeChange);
          if (attributeChange?.critical || "questionId" in body) setMarked(null);
        },
        onError: (failure) => {
          lastAnswer.current = { body, change: attributeChange };
          setError({ error: failure, kind: "answer" });
        },
      },
    );
  };
  const undo = () => {
    if (!change || !result) return;
    answer.mutate({ params: { requestId: result.requestId }, body: { attributeKey: change.key, value: change.previous } }, { onSuccess: ({ data }) => (setResult(data), setChange(null)) });
  };

  const onCreated = (done: Created) => {
    clearDraft();
    setSheetOpen(false);
    if (bulk) {
      const states = bulk.states.map((state, index) => (index === bulk.current ? "done" : state)) as BulkState[];
      const next = nextOpen(states, bulk.current);
      if (next >= 0) {
        setBulk({ states: states.map((state, index) => (index === next ? "current" : state)) as BulkState[], current: next });
        setMarked(null);
        return;
      }
      setBulk({ states, current: bulk.current });
    }
    setCreated(done);
  };

  const skipBulk = () => {
    if (!bulk) return;
    const states = bulk.states.map((state, index) => (index === bulk.current ? "skipped" : state)) as BulkState[];
    const next = nextOpen(states, bulk.current);
    setBulk({ states: next >= 0 ? (states.map((state, index) => (index === next ? "current" : state)) as BulkState[]) : states, current: next >= 0 ? next : bulk.current });
    setMarked(null);
  };
  const openBulk = (index: number) => {
    if (!bulk) return;
    setBulk({ states: bulk.states.map((state, at) => (at === index ? "current" : state === "current" ? "skipped" : state)) as BulkState[], current: index });
    setMarked(null);
  };

  const reset = () => {
    setQuery("");
    setResult(null);
    setMarked(null);
    setChange(null);
    setLinkPrefill(null);
    setInitial(null);
    setCreated(null);
    setBulk(null);
    setError(null);
    photos.reset();
  };

  const chooseProduct = (product: ProductSummary) => {
    setQuery(product.name);
    runIdentify({ text: product.name }, product.id);
  };
  const continueWithLink = (data: IdentifyResult) => {
    showResult(data, data.candidates[0]?.product.id ?? null);
    if (data.link) setLinkPrefill({ source: "LINK", platformId: data.link.platformId, platformName: data.link.platformName, sellerName: data.link.sellerName, pricePaid: data.link.pricePaid, orderedOn: null });
  };

  const retry = () => {
    const failed = error?.kind;
    setError(null);
    if (failed === "identify" && lastIdentify.current) runIdentify(lastIdentify.current.body, lastIdentify.current.markProductId);
    if (failed === "answer" && lastAnswer.current) onAnswer(lastAnswer.current.body, lastAnswer.current.change);
  };

  const signInHref = `${localizedPath("/giris", locale)}?next=${encodeURIComponent(`${localizedPath("/ara", locale)}?${RESUME_PARAM}=1`)}`;
  const keepDraft = () => {
    if (marked) saveDraft({ query, identifyRequestId: result?.requestId ?? null, candidate: marked, pricePaid: "", orderedOn: "" });
  };

  const shown: IdentifyResult | null = result && bulk ? singleResult(result, result.requestId, result.items[bulk.current]?.candidates ?? []) : result;
  const step = created ? 2 : marked ? 2 : result ? 1 : 0;
  const names = stepNames(t);
  const timedOut = photos.timedOut;
  const typedOrPhotos = query.trim().length > 0 || photos.photos.length > 0;
  const noResults = shown !== null && !bulk && shown.candidates.length === 0;

  const confirmFor = (framed: boolean) =>
    marked === null ? null : session.status === "loading" ? (
      <SkeletonBlock shape="card" />
    ) : signedIn ? (
      <SignedInConfirm
        key={`${marked.product.id}:${bulk?.current ?? 0}`}
        t={t}
        locale={locale}
        candidate={marked}
        identifyRequestId={result?.requestId || null}
        prefill={prefill}
        initial={initial}
        now={now}
        framed={framed}
        onChangeProduct={() => (setMarked(null), setSheetOpen(false))}
        onCreated={onCreated}
        onAddPhoto={pickPhoto}
      />
    ) : (
      <GuestConfirm t={t} candidate={marked} framed={framed} signInHref={signInHref} onSignIn={keepDraft} onChangeProduct={() => (setMarked(null), setSheetOpen(false))} />
    );

  const side = created ? undefined : result ? (
    <div className="hidden md:block">
      {confirmFor(true) ?? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border bg-surface p-4">
          <p className="text-h3 text-text">{t("searchAdd.confirm.title")}</p>
          <p className="text-body-sm text-text-muted">{t("searchAdd.confirm.emptyHint")}</p>
        </div>
      )}
    </div>
  ) : (
    <PhotoArea t={t} photos={photos} />
  );

  return (
    <PageTemplate kind="flow" title={t("searchAdd.title")} caption={t("searchAdd.intro")} side={side} sideLabel={result ? t("searchAdd.confirm.title") : t("searchAdd.photos.title")}>
      <StepIndicator label={t("searchAdd.steps.label")} steps={names} current={step} completedLabel={t("common.stepCompleted")} className="hidden md:flex" />
      <p className="text-body-sm font-semibold text-text md:hidden">{t("searchAdd.steps.phone", { current: step + 1, total: STEP_COUNT, name: names[step] })}</p>

      {created ? (
        <Success t={t} locale={locale} created={created} onAnother={reset} />
      ) : (
        <>
          <HiddenPhotoPicker photos={photos} inputRef={fileInput} />
          <SearchBox
            t={t}
            inputRef={searchInput}
            query={query}
            onQueryChange={setQuery}
            signedIn={signedIn}
            onSubmit={submit}
            submitLabel={result ? t("searchAdd.search.again") : t("searchAdd.search.submit")}
            submitting={identify.isPending}
            canSubmit={(query.trim().length > 0 || photos.readyIds.length > 0) && !photos.busy}
            onChoose={chooseProduct}
            onSearchStores={() => runIdentify({ text: query.trim() })}
            onLink={continueWithLink}
            onAddPhoto={pickPhoto}
            onError={(failure) => setError({ error: failure, kind: "suggest" })}
          />

          {/* Phone: photos sit under the box (the right column does not exist there). */}
          {!result && (
            <div className="md:hidden">
              <PhotoArea t={t} photos={photos} />
            </div>
          )}

          {error && (
            <StatusBanner tone="danger" title={t("searchAdd.states.errorTitle")} action={<Button variant="secondary" onClick={retry}>{t("searchAdd.states.retry")}</Button>}>
              {t("searchAdd.states.errorText")}
            </StatusBanner>
          )}
          {timedOut && (
            <StatusBanner
              tone="danger"
              title={t(UPLOAD_TIMEOUT_TEXT.title)}
              action={
                <Button variant="secondary" onClick={() => photos.photos.filter((photo) => photo.state === "timedOut").forEach((photo) => photos.update(photo.localId, { state: "processing" }))}>
                  {t("searchAdd.states.retry")}
                </Button>
              }
            >
              {t(UPLOAD_TIMEOUT_TEXT.body)}
            </StatusBanner>
          )}

          {identify.isPending ? (
            <div role="status" className="flex flex-col gap-3">
              <p className="text-body-sm text-text-muted">{t("searchAdd.states.loading")}</p>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : noResults ? (
            <EmptyState
              icon={SearchX}
              title={t("searchAdd.states.noResultsTitle", { query: lastText || query.trim() })}
              description={t("searchAdd.states.noResultsText")}
              action={
                <Button variant="secondary" icon={PencilLine} onClick={() => setResult(null)}>
                  {t("searchAdd.candidates.fixSearch")}
                </Button>
              }
            />
          ) : shown ? (
            <>
              {bulk && result && <BulkList t={t} items={result.items} states={bulk.states} current={bulk.current} onSkip={skipBulk} onOpen={openBulk} />}
              <Understood t={t} result={shown} change={change} onAnswer={onAnswer} onUndo={undo} />
              <Candidates t={t} result={shown} markedId={marked?.product.id ?? null} onToggle={toggleMark} onFixSearch={() => setResult(null)} />
            </>
          ) : (
            !typedOrPhotos && !error && <Ways t={t} onType={focusSearch} onPhoto={pickPhoto} />
          )}

          {marked && (
            <div className="fixed inset-x-0 bottom-(--size-bottom-nav-height) z-(--z-index-sticky) flex items-center gap-3 border-t border-border bg-surface p-3 md:hidden">
              <span className="min-w-0 flex-1 truncate text-body-sm text-text">{t("searchAdd.candidates.markedBar", { name: marked.product.name })}</span>
              <Button onClick={() => setSheetOpen(true)}>{t("searchAdd.candidates.toConfirm")}</Button>
            </div>
          )}
          <Sheet open={sheetOpen && marked !== null} onClose={() => setSheetOpen(false)} title={t("searchAdd.confirm.title")} closeLabel={t("common.closePanel")}>
            {confirmFor(false)}
          </Sheet>
        </>
      )}
    </PageTemplate>
  );
}

/** The file input lives once on the page; "Fotoğraf ekle" anywhere opens it. */
function HiddenPhotoPicker({ photos, inputRef }: { photos: ReturnType<typeof usePhotos>; inputRef: RefObject<HTMLInputElement | null> }) {
  if (!photos.policy) return null;
  return (
    <input
      ref={inputRef}
      type="file"
      multiple
      accept={photos.policy.acceptedTypes.join(",")}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      onChange={(event) => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = "";
        if (files.length) photos.add(files);
      }}
    />
  );
}

/** Empty state (design States 2): three ways to add. Name and link focus the box; the photo way opens the file dialog. */
function Ways({ t, onType, onPhoto }: { t: Translator; onType: () => void; onPhoto: () => void }) {
  const ways = [
    { icon: PencilLine, title: t("searchAdd.states.ways.name"), text: t("searchAdd.states.ways.nameText"), onClick: onType },
    { icon: Link2, title: t("searchAdd.states.ways.link"), text: t("searchAdd.states.ways.linkText"), onClick: onType },
    { icon: Camera, title: t("searchAdd.states.ways.photo"), text: t("searchAdd.states.ways.photoText"), onClick: onPhoto },
  ];
  return (
    <section aria-labelledby="ways-title" className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <h2 id="ways-title" className="text-h3 text-text">
        {t("searchAdd.states.emptyTitle")}
      </h2>
      <ol className="grid gap-3 md:grid-cols-3">
        {ways.map((way) => (
          <li key={way.title} className="flex">
            <button type="button" onClick={way.onClick} className={cn("flex flex-1 items-start gap-3 rounded-md bg-surface-alt p-3 text-left hover:bg-primary-subtle", focusRing)}>
              <Icon icon={way.icon} className="text-primary" />
              <span className="flex flex-col">
                <span className="text-body-sm font-semibold text-text">{way.title}</span>
                <span className="text-caption text-text-muted">{way.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Success (design States 5): "Takibe eklendi" with the product image. */
function Success({ t, locale, created, onAnother }: { t: Translator; locale: Locale; created: Created; onAnother: () => void }) {
  const { item, candidate, cheaper } = created;
  return (
    <section role="status" aria-labelledby="success-title" className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Icon icon={CircleCheck} className="text-savings" />
        <h2 id="success-title" className="text-h2 text-text">
          {t("searchAdd.success.title")}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <ProductImage src={imageUrl(candidate.product.imageSha256)} size="md" fallbackIcon={Package} />
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-body font-semibold text-text">{candidate.product.name}</span>
          {candidate.variantLine && <span className="text-body-sm text-text-muted">{candidate.variantLine}</span>}
          <span className="text-caption text-text-muted">
            {[
              item.returnDeadline
                ? item.returnDeadlineStatus === "ESTIMATED"
                  ? t("searchAdd.success.lastDayEstimated", { date: formatDay(item.returnDeadline, locale) })
                  : t("searchAdd.success.lastDay", { date: formatDay(item.returnDeadline, locale) })
                : null,
              t("searchAdd.success.firstCheck"),
            ]
              .filter(Boolean)
              .join(t("common.listSeparator"))}
          </span>
        </div>
      </div>
      {cheaper && cheaper.count > 0 && cheaper.maxSaving && (
        <p className="flex flex-wrap items-baseline gap-2 text-body-sm text-text">
          <strong>{t("searchAdd.confirm.teaserHeadline", { count: cheaper.count })}</strong>
          <MoneyDisplay value={money(cheaper.maxSaving, locale)} tone="saving" size="body" suffix={t("searchAdd.confirm.saving")} />
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Link href={localizedPath("/takip/[id]", locale, { id: item.id })} className={buttonClasses("primary")}>
          {t("searchAdd.success.open")}
        </Link>
        <Button variant="secondary" onClick={onAnother}>
          {t("searchAdd.success.another")}
        </Button>
      </div>
    </section>
  );
}
