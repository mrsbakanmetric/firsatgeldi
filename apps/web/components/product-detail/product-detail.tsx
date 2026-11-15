"use client";

// Product Detail, bought mode (design "2 Ürün Detayı v2"; pagedesign.md §8.3; modules.md Product
// Detail; implementation_plan.md step 11, PR 2 of 3). Detail template: the header card (h1) → two
// columns that end together — price history | "Kazancı almak için" + price-difference message —
// → the offers (by rank until Göster) with the user's own seller as the reference row → stock
// history. Five states: loading · no cheaper seller · error · stale (per-offer age) · success after
// "Şimdi kontrol et". Want-to-buy mode, the full "Takibi bitir" dialog and the edge cases come in
// PR 3; until then a want-to-buy item shows the "coming soon" note.
import type { EndTrackingResult, HistoryRange, TrackedItemDetail } from "@firsatgeldi/contracts";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, EmptyState, PageTemplate, SkeletonBlock, StatusBanner } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, Hourglass, LogIn, SearchX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { apiQueryKey, useApiMutation, useApiQuery, useSession } from "../../lib/api/hooks";
import { ago, money, useNow } from "../search-add/format";
import { useTranslator } from "../shell/parts";
import { EndTrackingDialog } from "../tracked-items/end-dialog";
import { BoughtAside } from "./aside";
import { DetailHeader } from "./header";
import { DEFAULT_RANGE, PriceSection } from "./history";
import { OffersSection } from "./offers";
import { ReportSheet } from "./report";
import { StockSection } from "./stock";

/** Queries this page reads; every write refreshes them (and the list and Home, which show the same item). */
const PAGE_QUERIES = ["getTrackedItem", "getTrackedItemOffers", "getPriceHistory", "getStockHistory", "getPriceDifferenceMessage", "listTrackedItems", "getTrackedItemsSummary", "getHome", "getEntitlements"] as const;

function Breadcrumb({ t, locale, name }: { t: Translator; locale: Locale; name: string }) {
  return (
    <nav aria-label={t("productDetail.breadcrumb")} className="text-caption text-text-muted">
      <Link href={localizedPath("/takip", locale)} className="underline-offset-4 hover:underline">
        {t("pages.tracking")}
      </Link>
      <span aria-hidden="true"> {t("productDetail.breadcrumbSeparator")} </span>
      <span>{name}</span>
    </nav>
  );
}

function Loading({ t }: { t: Translator }) {
  return (
    <PageTemplate kind="detail" title={t("productDetail.title")} header={<SkeletonBlock shape="card" className="h-(--size-thumb-lg)" />} side={<SkeletonBlock shape="card" />} sideLabel={t("productDetail.steps.title")}>
      <div role="status" aria-label={t("productDetail.states.loading")} className="flex flex-col gap-3">
        <SkeletonBlock shape="card" className="h-(--size-chart-summary-height)" />
        <SkeletonBlock shape="line" width="2/3" />
      </div>
    </PageTemplate>
  );
}

export function ProductDetail({ locale, id }: { locale: Locale; id: string }) {
  const t = useTranslator(locale);
  const session = useSession();
  if (session.status === "ready" && session.me === null) {
    const here = localizedPath("/takip/[id]", locale, { id });
    return (
      <PageTemplate kind="detail" title={t("productDetail.title")}>
        <EmptyState
          icon={LogIn}
          title={t("home.states.signInTitle")}
          description={t("home.states.signInText")}
          action={
            <Link href={`${localizedPath("/giris", locale)}?next=${encodeURIComponent(here)}`} className={buttonClasses("primary")}>
              {t("home.states.signIn")}
            </Link>
          }
        />
      </PageTemplate>
    );
  }
  return <SignedIn t={t} locale={locale} id={id} enabled={session.status === "ready"} />;
}

function SignedIn({ t, locale, id, enabled }: { t: Translator; locale: Locale; id: string; enabled: boolean }) {
  const detail = useApiQuery("getTrackedItem", { params: { id } }, { enabled, retry: false });
  if (detail.isPending) return <Loading t={t} />;
  if (detail.isError) {
    if (detail.error.body.code === "NOT_FOUND") {
      return (
        <PageTemplate kind="detail" title={t("productDetail.title")}>
          <EmptyState
            icon={SearchX}
            title={t("productDetail.states.notFoundTitle")}
            description={t("productDetail.states.notFoundText")}
            action={
              <Link href={localizedPath("/takip", locale)} className={buttonClasses("secondary")}>
                {t("productDetail.back")}
              </Link>
            }
          />
        </PageTemplate>
      );
    }
    return (
      <PageTemplate kind="detail" title={t("productDetail.title")}>
        <StatusBanner
          tone="danger"
          icon={CircleAlert}
          title={t("productDetail.states.errorTitle")}
          action={
            <Button variant="secondary" onClick={() => void detail.refetch()}>
              {t("home.states.retry")}
            </Button>
          }
        >
          {t("productDetail.states.errorText")}
        </StatusBanner>
      </PageTemplate>
    );
  }
  const item = detail.data.data;
  if (item.mode === "WANT") {
    // Want-to-buy mode is PR 3 of this step (implementation_plan.md step 11).
    return (
      <PageTemplate kind="detail" title={item.product.name}>
        <EmptyState
          icon={Hourglass}
          title={t("productDetail.soonTitle")}
          description={t("productDetail.soonText")}
          action={
            <Link href={localizedPath("/takip", locale)} className={buttonClasses("secondary")}>
              {t("productDetail.back")}
            </Link>
          }
        />
      </PageTemplate>
    );
  }
  return <Bought t={t} locale={locale} item={item} />;
}

function Bought({ t, locale, item }: { t: Translator; locale: Locale; item: TrackedItemDetail }) {
  const now = useNow();
  const queryClient = useQueryClient();
  const [range, setRange] = useState<HistoryRange>(DEFAULT_RANGE);
  const [ending, setEnding] = useState(false);
  const [ended, setEnded] = useState<EndTrackingResult | null>(null);
  const [report, setReport] = useState<"WRONG_PRICE" | "DIFFERENT_PRODUCT" | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const offers = useApiQuery("getTrackedItemOffers", { params: { id: item.id } });
  const ratings = useApiQuery("getProductRatings", { params: { id: item.product.id } });
  const entitlements = useApiQuery("getEntitlements", {});
  const refresh = () => Promise.all(PAGE_QUERIES.map((name) => queryClient.invalidateQueries({ queryKey: apiQueryKey(name) }))).then(() => undefined);
  const restore = useApiMutation("restoreTracking", {
    onSuccess: () => {
      setEnded(null);
      void refresh();
    },
    onError: (error) => setProblem(errorMessage(t, error)),
  });

  const allowance = entitlements.data?.data.checkNow;
  const remaining = !allowance || allowance.limit === null ? null : Math.max(0, allowance.limit - allowance.used);
  const active = item.state === "ACTIVE";
  const offerData = offers.data?.data;
  const sourcesMissing = offers.data?.meta?.sourcesMissing === true || item.stale;
  const noCheaper = active && !item.stale && item.deal === null && offerData !== undefined && offerData.offers.length === 0;

  const header = (
    <>
      <Breadcrumb t={t} locale={locale} name={item.product.name} />
      <DetailHeader t={t} locale={locale} item={item} ratings={ratings.data?.data ?? null} now={now} remaining={remaining} onEnd={() => setEnding(true)} onReport={setReport} />
      {ended && (
        <StatusBanner
          tone="info"
          action={
            new Date(ended.restorableUntil).getTime() > now ? (
              <Button variant="secondary" size="compact" loading={restore.isPending} onClick={() => restore.mutate({ params: { id: item.id }, idempotencyKey: globalThis.crypto.randomUUID() })}>
                {t("trackedItems.v3.restore")}
              </Button>
            ) : undefined
          }
        >
          {ended.saving ? t("productDetail.end.endedSaving", { amount: money(ended.saving, locale) }) : t("productDetail.end.ended")}
        </StatusBanner>
      )}
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
      {sourcesMissing && active && <StatusBanner tone="warning">{t("productDetail.states.stale")}</StatusBanner>}
    </>
  );

  const sections = (
    <>
      {active && offers.isError && <StatusBanner tone="danger">{t("productDetail.states.sectionError")}</StatusBanner>}
      {active && !offerData && !offers.isError && <SkeletonBlock shape="card" />}
      {noCheaper && offerData && item.purchase && (
        // Design States 2: no deal block, no offer list, no step 2; the chart says "Senin fiyatın en ucuz".
        <section aria-labelledby="nc-title" className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 md:p-5">
          <h2 id="nc-title" className="text-h3 text-text">
            {t("home.featured.cheapestNow")}
          </h2>
          <p className="text-body-sm text-text">
            {[money(item.purchase.pricePaid, locale), t("productDetail.offers.checkedCount", { count: offerData.checkedCount }), item.lastCheckedAt ? ago(t, item.lastCheckedAt, now) : null].filter(Boolean).join(t("common.listSeparator"))}
          </p>
          <p className="text-caption text-text-muted">{t("productDetail.offers.noCheaperNote")}</p>
        </section>
      )}
      {active && offerData && offerData.offers.length > 0 && <OffersSection t={t} locale={locale} item={item} offers={offerData} now={now} />}
      <StockSection t={t} locale={locale} item={item} />
    </>
  );

  return (
    <>
      <PageTemplate
        kind="detail"
        title={item.product.name}
        header={header}
        {...(active ? { side: <BoughtAside t={t} locale={locale} item={item} now={now} onChanged={() => void refresh()} />, sideLabel: t("productDetail.steps.title") } : {})}
        sections={sections}
      >
        <PriceSection t={t} locale={locale} item={item} range={range} onRange={setRange} />
      </PageTemplate>
      {ending && (
        <EndTrackingDialog
          t={t}
          locale={locale}
          item={item}
          onClose={() => setEnding(false)}
          onEnded={(_, result) => {
            setEnding(false);
            setEnded(result);
            void refresh();
          }}
        />
      )}
      {report && <ReportSheet t={t} locale={locale} trackedItemId={item.id} kind={report} offers={offerData?.offers ?? []} onClose={() => setReport(null)} />}
    </>
  );
}
