"use client";

// "Emin ol, sonra onayla" (design "1 Ara ve Ekle": ConfirmPanel, Cases A, B, E–J,
// States 4; modules.md Search and Add step 4; product_design_pattern.md §5.1).
// Everything assumed is prefilled and editable; the price paid is typed by the
// user (prefilled only from their own link or order screen); no seller list —
// the seller is typed and confirmed by exact match. Nothing is saved before
// "Evet, bunu aldım" / "Takibe al". Guests see the sign-in card instead.
// Compact UI (design v3): a quick "Evet, bu" next to "Değiştir"; the actions
// stay at the bottom of the panel with one line naming what is missing; the
// seller lookup sits inside the field; the platform list ends with "Diğer"
// (typed platform, typed seller, return last day from the user); the return
// date itself is the control and its explanation sits behind "?".
import {
  ApiError,
  type ConfirmContext,
  type CreateTrackedItemRequest,
  type Money,
  type SellerLookupResult,
  type TrackedItemCreated,
} from "@firsatgeldi/contracts";
import { formatNumber, returnDeadline, toCalendarDay } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import {
  Button,
  buttonClasses,
  cn,
  ConfirmPanel,
  ConfirmSection,
  FactTile,
  FactTiles,
  type FactVerdict,
  Flag,
  focusRing,
  FreshnessLine,
  Icon,
  ProductImage,
  SegmentedChoice,
  Select,
  SkeletonBlock,
  StatusBanner,
  TextField,
} from "@firsatgeldi/ui";
import { CircleHelp, ExternalLink, Info, LogIn, Package, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { type FormEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { useApiMutation, useApiQuery } from "../../lib/api/hooks";
import { errorMessage } from "../../lib/api/errors";
import { checkedAgo, formatDay, money, parsePrice, priceInput } from "./format";
import type { Candidate } from "./mark-step";
import { imageUrl } from "./search-box";
import { Teaser } from "./teaser";

/** Pause after the last price keystroke before the teaser is asked. */
const PRICE_PAUSE_MS = 400;
const RATING_DIGITS = { minimumFractionDigits: 1, maximumFractionDigits: 1 } as const;
/** Value of the "Diğer" entry at the end of the platform list (never a platform id). */
const OTHER_PLATFORM = "OTHER";

export interface Prefill {
  readonly source: "LINK" | "SCREENSHOT";
  readonly platformId: string | null;
  readonly platformName: string | null;
  readonly sellerName: string | null;
  readonly pricePaid: Money | null;
  readonly orderedOn: string | null;
}

export interface Created {
  readonly item: TrackedItemCreated;
  readonly candidate: Candidate;
  readonly cheaper: { count: number; maxSaving: Money | null } | null;
}

type Match = NonNullable<SellerLookupResult["match"]>;
type Mode = "BOUGHT" | "WANT";
type Duration = "1W" | "1M" | "3M" | "UNLIMITED";
type OrderStatus = "ORDERED" | "SHIPPED" | "DELIVERED";

/** The marked product with "Değiştir" and, when given, the quick "Evet, bu" (design v3). */
function ProductTop({ t, candidate, onChange, onQuick, quickBusy = false }: { t: Translator; candidate: Candidate; onChange: () => void; onQuick?: () => void; quickBusy?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ProductImage src={imageUrl(candidate.product.imageSha256)} size="sm" fallbackIcon={Package} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-body font-semibold break-words text-text">{candidate.product.name}</span>
        {candidate.variantLine && <span className="text-caption text-text-muted">{candidate.variantLine}</span>}
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="compact" onClick={onChange}>
          {t("searchAdd.confirm.change")}
        </Button>
        {onQuick && (
          <Button size="compact" onClick={onQuick} loading={quickBusy}>
            {t("searchAdd.confirm.quickConfirm")}
          </Button>
        )}
      </div>
    </div>
  );
}

/** "?" next to the return date: the explanation opens under it on click or tap (never hover-only). */
function ReturnHelp({ t, children }: { t: Translator; children: ReactNode }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={t("searchAdd.confirm.returnHelp")}
        aria-expanded={open}
        aria-controls={`${id}-help`}
        onClick={() => setOpen((value) => !value)}
        className={cn("flex size-(--size-touch-target-min) items-center justify-center rounded-pill text-text-muted hover:bg-surface-alt", focusRing)}
      >
        <Icon icon={CircleHelp} />
      </button>
      <p id={`${id}-help`} hidden={!open} className="basis-full text-caption text-text-muted">
        {children}
      </p>
    </>
  );
}

/** Rating tile (modules.md seller trust indicator): FırsatGeldi trust first, the store rating as fallback. */
function ratingTile(t: Translator, locale: Locale, match: Match): { label: string; value: string; verdict: FactVerdict; note?: string } {
  const reason = match.trust.reasonKey;
  const reasonText = (() => {
    if (!reason) return undefined;
    try {
      return t(reason as never);
    } catch {
      return undefined;
    }
  })();
  if (match.trust.verdict === "GOOD") return { label: t("searchAdd.confirm.trust"), value: t("searchAdd.confirm.trustGood"), verdict: "good", ...(reasonText ? { note: reasonText } : {}) };
  if (match.trust.verdict === "CAUTION") return { label: t("searchAdd.confirm.trust"), value: t("searchAdd.confirm.trustCaution"), verdict: "bad", ...(reasonText ? { note: reasonText } : {}) };
  if (match.sellerRating !== null && (reason === "trust.reason.storeRatingGood" || reason === "trust.reason.storeRatingLow")) {
    const value = t("searchAdd.confirm.ratingValue", { rating: formatNumber(match.sellerRating, locale, RATING_DIGITS) });
    return { label: t("searchAdd.confirm.rating"), value, verdict: reason === "trust.reason.storeRatingGood" ? "good" : "bad" };
  }
  return { label: t("searchAdd.confirm.rating"), value: t("searchAdd.confirm.noData"), verdict: "neutral" };
}

function Facts({ t, locale, match }: { t: Translator; locale: Locale; match: Match }) {
  const rating = ratingTile(t, locale, match);
  const stockVerdict: FactVerdict = match.stockState === "OUT_OF_STOCK" ? "bad" : "good";
  const warrantyVerdict: FactVerdict = match.warrantyType === "DISTRIBUTOR" ? "good" : match.warrantyType === "IMPORTER" ? "bad" : "neutral";
  const verdictLabel = (verdict: FactVerdict) => t(`searchAdd.confirm.verdict.${verdict}`);
  return (
    <FactTiles label={t("searchAdd.confirm.facts")}>
      <FactTile label={rating.label} value={rating.value} verdict={rating.verdict} verdictLabel={verdictLabel(rating.verdict)} {...(rating.note ? { note: rating.note } : {})} />
      <FactTile label={t("searchAdd.confirm.stock")} value={t(`searchAdd.confirm.stockState.${match.stockState}`)} verdict={stockVerdict} verdictLabel={verdictLabel(stockVerdict)} />
      <FactTile
        label={t("searchAdd.confirm.warranty")}
        value={t(`searchAdd.confirm.warrantyType.${match.warrantyType}`)}
        verdict={warrantyVerdict}
        verdictLabel={verdictLabel(warrantyVerdict)}
      />
    </FactTiles>
  );
}

export interface ConfirmProps {
  t: Translator;
  locale: Locale;
  candidate: Candidate;
  identifyRequestId: string | null;
  prefill: Prefill | null;
  /** Restored after sign-in (guest hand-over). */
  initial: { pricePaid: string; orderedOn: string } | null;
  now: number;
  framed: boolean;
  onChangeProduct: () => void;
  onCreated: (created: Created) => void;
  onAddPhoto: () => void;
  /** Preselected by a "Takip et" hand-over ("Bunu aldım…" / "Bu ürünü takip et"). */
  initialMode?: Mode | null;
}

export function SignedInConfirm({ t, locale, candidate, identifyRequestId, prefill, initial, now, framed, onChangeProduct, onCreated, onAddPhoto, initialMode = null }: ConfirmProps) {
  const productId = candidate.product.id;
  const context = useApiQuery("getConfirmContext", { params: { id: productId } });
  const ctx: ConfirmContext | null = context.data?.data ?? null;
  const entitlements = context.data?.meta?.entitlements ?? null;

  const [platformId, setPlatformId] = useState<string | null>(prefill?.platformId ?? null);
  const [sellerName, setSellerName] = useState(prefill?.sellerName ?? "");
  const [priceText, setPriceText] = useState(initial?.pricePaid ?? (prefill?.pricePaid ? priceInput(prefill.pricePaid, locale) : ""));
  const [orderedOn, setOrderedOn] = useState(() => initial?.orderedOn ?? prefill?.orderedOn ?? toCalendarDay(new Date()));
  const [status, setStatus] = useState<OrderStatus>("ORDERED");
  const [customLastDay, setCustomLastDay] = useState<string | null>(null);
  const [otherName, setOtherName] = useState("");
  /** After "Evet, bu" with a gap: the missing fields say so. */
  const [showMissing, setShowMissing] = useState(false);
  const otherNameRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>(initialMode ?? "BOUGHT");
  const [targetText, setTargetText] = useState("");
  const [duration, setDuration] = useState<Duration>("1M");
  const [problem, setProblem] = useState<ReactNode>(null);
  const [already, setAlready] = useState(false);
  const attempt = useRef<string>(globalThis.crypto.randomUUID());

  // Platform: from the user's own link/screen when known, otherwise the first one; "Diğer" = typed by the user.
  const platforms = ctx?.platforms ?? [];
  const isOther = platformId === OTHER_PLATFORM;
  const platform = isOther ? null : (platforms.find((item) => item.id === platformId) ?? platforms.find((item) => item.name === prefill?.platformName) ?? platforms[0] ?? null);

  const lookup = useApiMutation("sellerLookup", { onError: (error) => setProblem(errorMessage(t, error)) });
  const { mutate: runLookup, reset: resetLookup } = lookup;
  const match = lookup.data?.data.match ?? null;
  const findSeller = (event?: FormEvent) => {
    event?.preventDefault();
    if (platform && sellerName.trim()) runLookup({ params: { id: productId }, body: { platformId: platform.id, name: sellerName.trim() } });
  };
  // A seller read from the user's own link or screen is looked up once the platforms are known.
  const autoLookup = useRef(false);
  useEffect(() => {
    if (!autoLookup.current && platform && !isOther && prefill?.sellerName) {
      autoLookup.current = true;
      runLookup({ params: { id: productId }, body: { platformId: platform.id, name: prefill.sellerName } });
    }
  }, [platform, isOther, prefill, productId, runLookup]);

  const price = parsePrice(priceText, locale);
  const [settledPrice, setSettledPrice] = useState<number | null>(price);
  useEffect(() => {
    const timer = setTimeout(() => setSettledPrice(price), PRICE_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [price]);
  const teaser = useApiQuery(
    "teaser",
    { params: { id: productId }, body: { pricePaid: { amount: settledPrice ?? 0, currency: "TRY" }, sellerRef: match?.sellerRef ?? null } },
    { enabled: settledPrice !== null && ctx !== null },
  );
  const stale = Boolean(lookup.data?.meta?.sourcesMissing || teaser.data?.meta?.sourcesMissing);

  const create = useApiMutation("createTrackedItem", {
    onSuccess: ({ data }) =>
      onCreated({
        item: data,
        candidate,
        cheaper: teaser.data ? { count: teaser.data.data.summary.cheaperCount, maxSaving: teaser.data.data.summary.maxSaving } : null,
      }),
    onError: (error) => {
      attempt.current = globalThis.crypto.randomUUID();
      if (error instanceof ApiError && error.body.code === "ALREADY_TRACKING") setAlready(true);
      else setProblem(errorMessage(t, error));
    },
  });

  if (context.isPending) {
    return (
      <ConfirmPanel framed={framed} {...(framed ? { title: t("searchAdd.confirm.title") } : {})} product={<ProductTop t={t} candidate={candidate} onChange={onChangeProduct} />}>
        <SkeletonBlock shape="card" />
        <SkeletonBlock width="2/3" />
      </ConfirmPanel>
    );
  }
  if (!ctx) {
    return (
      <StatusBanner tone="danger" title={t("searchAdd.states.errorTitle")} action={<Button variant="secondary" onClick={() => void context.refetch()}>{t("searchAdd.states.retry")}</Button>}>
        {t("searchAdd.states.errorText")}
      </StatusBanner>
    );
  }

  const unsupported = ctx.warnings.includes("CATEGORY_UNSUPPORTED");
  const limitReached = entitlements !== null && entitlements.tracking.limit !== null && entitlements.tracking.used >= entitlements.tracking.limit;
  const alreadyTracking = ctx.alreadyTracking.find((item) => item.mode === mode) ?? null;
  const deadline = platform ? returnDeadline(orderedOn, platform.returnRule) : null;
  const lastDay = customLastDay ?? deadline?.day ?? null;
  // What "Evet, bunu aldım" still needs, in the order of the fields.
  const missing: { message: string; field: "platformName" | "price" }[] = [
    ...(isOther && !otherName.trim() ? [{ message: t("searchAdd.confirm.missing.platformName"), field: "platformName" as const }] : []),
    ...(price === null ? [{ message: priceText.trim() ? t("searchAdd.confirm.priceInvalid") : t("searchAdd.confirm.missing.price"), field: "price" as const }] : []),
  ];
  const priceSource: "USER_TYPED" | "USER_LINK" | "USER_SCREENSHOT" =
    prefill?.pricePaid && price === prefill.pricePaid.amount ? (prefill.source === "LINK" ? "USER_LINK" : "USER_SCREENSHOT") : "USER_TYPED";
  const fromUser = priceSource !== "USER_TYPED";
  const target = parsePrice(targetText, locale);

  const submitBought = () => {
    setProblem(null);
    if ((!platform && !isOther) || price === null || missing.length) return;
    const body: CreateTrackedItemRequest = {
      mode: "BOUGHT",
      productId,
      identifyRequestId,
      platformId: platform?.id ?? null,
      ...(isOther ? { otherPlatformName: otherName.trim(), sellerName: sellerName.trim() || null } : {}),
      sellerRef: isOther ? null : (match?.sellerRef ?? null),
      pricePaid: { amount: price, currency: "TRY" },
      pricePaidSource: priceSource,
      orderedOn,
      orderStatus: status,
      returnDeadline: customLastDay,
    };
    create.mutate({ body, idempotencyKey: attempt.current });
  };
  /** "Evet, bu": the same confirm, or straight to the first missing field. */
  const quickConfirm = () => {
    const first = missing[0];
    if (!first) return submitBought();
    setShowMissing(true);
    const field = (first.field === "platformName" ? otherNameRef : priceRef).current;
    field?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    field?.focus();
  };
  const submitWant = () => {
    setProblem(null);
    const body: CreateTrackedItemRequest = {
      mode: "WANT",
      productId,
      identifyRequestId,
      targetPrice: target === null ? null : { amount: target, currency: "TRY" },
      trackingDuration: duration,
    };
    create.mutate({ body, idempotencyKey: attempt.current });
  };

  const blockedNote = alreadyTracking || already ? (
    <div className="flex flex-col gap-2 rounded-md bg-info-subtle p-3">
      <p className="text-body font-semibold text-text">{t("searchAdd.confirm.alreadyTitle")}</p>
      {alreadyTracking && (
        <p className="text-body-sm text-text">
          {t("searchAdd.confirm.alreadyText", { product: candidate.product.name, date: formatDay(toCalendarDay(new Date(alreadyTracking.since)), locale) })}
        </p>
      )}
      {alreadyTracking && (
        <Link href={localizedPath("/takip/[id]", locale, { id: alreadyTracking.trackedItemId })} className={buttonClasses("secondary", "self-start")}>
          {t("searchAdd.confirm.alreadyOpen")}
        </Link>
      )}
    </div>
  ) : null;

  const limitNote = limitReached && entitlements?.tracking.limit != null ? (
    <StatusBanner
      tone="info"
      title={t("searchAdd.confirm.limitTitle", { used: entitlements.tracking.used, limit: entitlements.tracking.limit })}
      action={
        <Link href={localizedPath("/paketim", locale)} className={buttonClasses("secondary")}>
          {t("searchAdd.confirm.limitAction")}
        </Link>
      }
    >
      {t("searchAdd.confirm.limitText")}
    </StatusBanner>
  ) : null;

  const footer = unsupported ? null : (
    <>
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
      {limitNote}
      {blockedNote}
      {mode === "BOUGHT" ? (
        <>
          {missing[0] && !limitReached && alreadyTracking === null && (
            <p role="status" className="flex items-center gap-1 text-caption text-text-muted">
              <Icon icon={Info} size="sm" />
              <span>{missing[0].message}</span>
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => (setMode("WANT"), setAlready(false), setProblem(null))} className="flex-1">
              {t("searchAdd.confirm.wantShort")}
            </Button>
            <Button onClick={submitBought} disabled={(!platform && !isOther) || missing.length > 0 || limitReached || alreadyTracking !== null} loading={create.isPending} className="flex-1">
              {t("searchAdd.confirm.bought")}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => (setMode("BOUGHT"), setAlready(false), setProblem(null))}>
            {t("searchAdd.confirm.back")}
          </Button>
          <Button onClick={submitWant} disabled={limitReached || alreadyTracking !== null || (targetText.trim() !== "" && target === null)} loading={create.isPending} className="flex-1">
            {t("searchAdd.confirm.startTracking")}
          </Button>
        </div>
      )}
      <p className="text-caption text-text-muted">{t("searchAdd.confirm.actionsNote")}</p>
    </>
  );

  return (
    <ConfirmPanel
      framed={framed}
      {...(framed ? { title: t("searchAdd.confirm.title") } : {})}
      intro={t("searchAdd.confirm.intro")}
      product={
        <ProductTop
          t={t}
          candidate={candidate}
          onChange={onChangeProduct}
          {...(mode === "BOUGHT" && !unsupported && !limitReached && alreadyTracking === null ? { onQuick: quickConfirm, quickBusy: create.isPending } : {})}
        />
      }
      footer={footer}
    >
      {stale && (
        <StatusBanner tone="warning">
          <span className="flex flex-col gap-1">
            <span>{t("searchAdd.states.staleText")}</span>
            <span className="text-caption text-text-muted">{t("searchAdd.states.staleNote")}</span>
          </span>
        </StatusBanner>
      )}
      {prefill && (
        <p role="status" className="flex items-start gap-2 rounded-md bg-info-subtle p-3 text-body-sm text-text">
          <Icon icon={Info} size="sm" className="text-info" />
          <span>{prefill.source === "LINK" ? t("searchAdd.confirm.prefilledLink") : t("searchAdd.confirm.prefilledShot")}</span>
        </p>
      )}
      {unsupported ? (
        <StatusBanner tone="info">{t("searchAdd.confirm.unsupported")}</StatusBanner>
      ) : mode === "WANT" ? (
        <ConfirmSection title={t("searchAdd.confirm.want")}>
          <TextField
            label={t("searchAdd.confirm.targetPrice")}
            inputMode="decimal"
            suffix={t("searchAdd.confirm.currency")}
            value={targetText}
            onChange={(event) => setTargetText(event.target.value)}
            {...(targetText.trim() && target === null ? { error: t("searchAdd.confirm.priceInvalid") } : {})}
          />
          <div className="flex flex-wrap gap-2">
            {ctx.targetHints.lowest30Days && (
              <Button variant="secondary" onClick={() => setTargetText(priceInput(ctx.targetHints.lowest30Days as Money, locale))}>
                {t("searchAdd.confirm.hint30", { amount: money(ctx.targetHints.lowest30Days, locale) })}
              </Button>
            )}
            {ctx.targetHints.lowest6Months && (
              <Button variant="secondary" onClick={() => setTargetText(priceInput(ctx.targetHints.lowest6Months as Money, locale))}>
                {t("searchAdd.confirm.hint6m", { amount: money(ctx.targetHints.lowest6Months, locale) })}
              </Button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-body-sm font-semibold text-text">{t("searchAdd.confirm.duration")}</span>
            <SegmentedChoice
              label={t("searchAdd.confirm.duration")}
              value={duration}
              onValueChange={(value) => setDuration(value as Duration)}
              options={(["1W", "1M", "3M", "UNLIMITED"] as const).map((value) => ({ value, label: t(`searchAdd.confirm.durations.${value}`) }))}
            />
          </div>
          <p className="text-caption text-text-muted">{t("searchAdd.confirm.wantNote")}</p>
        </ConfirmSection>
      ) : (
        <>
          <ConfirmSection title={t("searchAdd.confirm.listing")}>
            <Select
              label={t("searchAdd.confirm.platform")}
              value={isOther ? OTHER_PLATFORM : (platform?.id ?? "")}
              onValueChange={(value) => {
                setPlatformId(value);
                setCustomLastDay(null);
                resetLookup();
              }}
              options={[...platforms.map((item) => ({ value: item.id, label: item.name })), { value: OTHER_PLATFORM, label: t("searchAdd.confirm.otherPlatform") }]}
            />
            {isOther ? (
              <>
                <TextField
                  ref={otherNameRef}
                  label={t("searchAdd.confirm.otherPlatformName")}
                  value={otherName}
                  onChange={(event) => setOtherName(event.target.value)}
                  {...(showMissing && !otherName.trim() ? { error: t("searchAdd.confirm.missing.platformName") } : {})}
                />
                <TextField label={t("searchAdd.confirm.seller")} helper={t("searchAdd.confirm.otherSellerHelp")} value={sellerName} onChange={(event) => setSellerName(event.target.value)} />
              </>
            ) : (
              <form onSubmit={findSeller}>
                <TextField
                  label={t("searchAdd.confirm.seller")}
                  helper={t("searchAdd.confirm.sellerHelp")}
                  value={sellerName}
                  onChange={(event) => setSellerName(event.target.value)}
                  onBlur={(event) => {
                    // Not when the blur goes to "Satıcıyı bul" itself: that press looks it up.
                    if (sellerName.trim() && !match && !event.currentTarget.parentElement?.contains(event.relatedTarget)) findSeller();
                  }}
                  action={
                    <Button type="submit" size="compact" variant="secondary" loading={lookup.isPending} disabled={!sellerName.trim()}>
                      {t("searchAdd.confirm.sellerFind")}
                    </Button>
                  }
                />
              </form>
            )}
            {!isOther && lookup.isSuccess && !match && (
              <p className="flex items-start gap-1 text-caption text-danger">
                <Icon icon={TriangleAlert} size="sm" />
                <span>{t("searchAdd.confirm.sellerNotFound")}</span>
              </p>
            )}
            {!isOther && match && (
              <>
                <Flag tone="success" className="self-start">
                  {t("searchAdd.confirm.sellerFound")}
                </Flag>
                <Facts t={t} locale={locale} match={match} />
                <FreshnessLine
                  stale={stale}
                  action={
                    <a href={match.listingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-4">
                      <span>{t("searchAdd.confirm.openListing")}</span>
                      <Icon icon={ExternalLink} size="sm" />
                    </a>
                  }
                >
                  {checkedAgo(t, match.lastCheckedAt, now)}
                </FreshnessLine>
              </>
            )}
            {ctx.warnings.includes("NO_BRAND_CODE") && (
              <div className="flex flex-col gap-2 rounded-md bg-warning-subtle p-3">
                <p className="text-body-sm text-text">{t("searchAdd.confirm.noBrandCode")}</p>
                <Button variant="secondary" onClick={onAddPhoto} className="self-start">
                  {t("searchAdd.confirm.addLabelPhoto")}
                </Button>
              </div>
            )}
          </ConfirmSection>

          <ConfirmSection title={t("searchAdd.confirm.purchase")}>
            <TextField
              ref={priceRef}
              label={t("searchAdd.confirm.pricePaid")}
              inputMode="decimal"
              suffix={t("searchAdd.confirm.currency")}
              value={priceText}
              onChange={(event) => setPriceText(event.target.value)}
              helper={fromUser ? (prefill?.source === "LINK" ? t("searchAdd.confirm.linkNote") : t("searchAdd.confirm.fromShot")) : t("searchAdd.confirm.priceHelp")}
              {...(priceText.trim() && price === null
                ? { error: t("searchAdd.confirm.priceInvalid") }
                : showMissing && price === null
                  ? { error: t("searchAdd.confirm.missing.price") }
                  : {})}
            />
            {fromUser && (
              <Flag tone="info" className="self-start">
                {prefill?.source === "LINK" ? t("searchAdd.confirm.fromLink") : t("searchAdd.confirm.fromShot")}
              </Flag>
            )}
            <TextField label={t("searchAdd.confirm.orderedOn")} type="date" value={orderedOn} max={toCalendarDay(new Date(now))} onChange={(event) => event.target.value && setOrderedOn(event.target.value)} />
            <div className="flex flex-col gap-2">
              <span className="text-body-sm font-semibold text-text">{t("searchAdd.confirm.orderStatus")}</span>
              <SegmentedChoice
                label={t("searchAdd.confirm.orderStatus")}
                value={status}
                onValueChange={(value) => setStatus(value as OrderStatus)}
                options={(["ORDERED", "SHIPPED", "DELIVERED"] as const).map((value) => ({ value, label: t(`searchAdd.confirm.status.${value}`) }))}
              />
            </div>
          </ConfirmSection>

          {(isOther || (platform && lastDay)) && (
            <ConfirmSection title={t("searchAdd.confirm.returnTitle")}>
              {/* The date itself is the control: picking a day applies at once (design v3). */}
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  aria-label={t("searchAdd.confirm.lastDayLabel")}
                  value={lastDay ?? ""}
                  min={orderedOn}
                  onChange={(event) => setCustomLastDay(event.target.value || null)}
                  className={cn("h-(--size-touch-target-min) rounded-md border border-border bg-surface-alt px-3 text-body font-semibold text-text", focusRing)}
                />
                {customLastDay ? (
                  <Flag tone="info">{t("searchAdd.confirm.userEntered")}</Flag>
                ) : isOther ? (
                  <Flag tone="neutral">{t("searchAdd.confirm.returnUnknown")}</Flag>
                ) : (
                  deadline?.estimated && <Flag tone="info">{t("searchAdd.confirm.estimated")}</Flag>
                )}
                <ReturnHelp t={t}>
                  {isOther
                    ? t("searchAdd.confirm.returnOtherHelp")
                    : [
                        platform?.returnRule.sourceState === "DEFAULT"
                          ? t("searchAdd.confirm.ruleDefault")
                          : platform?.returnRule.startType === "DELIVERY"
                            ? t("searchAdd.confirm.ruleDelivery", { count: platform.returnRule.days })
                            : t("searchAdd.confirm.ruleOrder", { count: platform?.returnRule.days ?? 0 }),
                        !customLastDay && deadline?.estimated ? t("searchAdd.confirm.estimatedText") : null,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                </ReturnHelp>
              </div>
              {ctx.noWithdrawalRight && (
                <p className="flex items-start gap-2 rounded-md bg-warning-subtle p-3 text-body-sm text-text">
                  <Icon icon={TriangleAlert} size="sm" className="text-on-warning-subtle" />
                  <span>{t("searchAdd.confirm.noWithdrawal")}</span>
                </p>
              )}
            </ConfirmSection>
          )}

          {teaser.data && <Teaser t={t} locale={locale} teaser={teaser.data.data} now={now} stale={stale} onError={(error) => setProblem(errorMessage(t, error))} />}
        </>
      )}
    </ConfirmPanel>
  );
}

/** Guest at the confirm step (design case F): the product stays; sign-in replaces the actions. */
export function GuestConfirm({ t, candidate, framed, signInHref, onSignIn, onChangeProduct }: { t: Translator; candidate: Candidate; framed: boolean; signInHref: string; onSignIn: () => void; onChangeProduct: () => void }) {
  return (
    <ConfirmPanel framed={framed} {...(framed ? { title: t("searchAdd.confirm.title") } : {})} product={<ProductTop t={t} candidate={candidate} onChange={onChangeProduct} />}>
      <div className="flex flex-col gap-3 rounded-md bg-primary-subtle p-4">
        <p className="text-body font-semibold text-on-primary-subtle">{t("searchAdd.confirm.guestTitle")}</p>
        <p className="text-body-sm text-text">{t("searchAdd.confirm.guestText")}</p>
        <Link href={signInHref} onClick={onSignIn} className={buttonClasses("primary")}>
          <Icon icon={LogIn} />
          <span>{t("searchAdd.confirm.guestAction")}</span>
        </Link>
      </div>
    </ConfirmPanel>
  );
}
