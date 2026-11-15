"use client";

// Home (design "3 Ana Sayfa" v2; modules.md Home; pagedesign.md §8.1; product_spect.md §5.1):
// Summary template — greeting + one summary line (tracked count · amount protected · open
// deals · last check) → search box + recent searches → Hemen Gözat → return reminder strip →
// "Takip ettiklerin" (up to four small cards) → "Şu an en çok düşenler". A new user sees the
// search box, the three steps and the general top drops. With anything tracked the screen
// opens from the cache at once and refreshes in the background; a finished check refreshes
// it through the live updates. States: new user · no deal · no big drop in the user's
// categories · stale (sources missing) · error · loading (skeleton in the same layout) · guest.
import { RETURN_REMINDER_DAYS } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, EmptyState, Icon, PageTemplate, SkeletonBlock, StatusBanner } from "@firsatgeldi/ui";
import { CircleAlert, LogIn } from "lucide-react";
import Link from "next/link";
import { useApiQuery, useSession } from "../../lib/api/hooks";
import { ago, money, useNow } from "../search-add/format";
import { useTranslator } from "../shell/parts";
import { TrackedCards } from "./cards";
import { Featured } from "./featured";
import { HomeSearch } from "./search";
import { TopDropsSection } from "./top-drops";

const STEPS = ["add", "track", "gain"] as const;
/** Loading skeleton: two small cards and three top-drop cards, as laid out on the page. */
const LOADING_CARDS = 2;
const LOADING_DROPS = 3;

/** First word of the display name ("Sena B." → "Sena"); none → the greeting without a name. */
function firstName(displayName: string | null | undefined): string | null {
  return displayName?.trim().split(/\s+/)[0] || null;
}

export function Home({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const session = useSession();

  if (session.status === "ready" && session.me === null) {
    // Guests: the Landing Page belongs here (step 17); until then, sign in.
    return (
      <PageTemplate kind="summary" title={t("pages.home")}>
        <EmptyState
          icon={LogIn}
          title={t("home.states.signInTitle")}
          description={t("home.states.signInText")}
          action={
            <Link href={`${localizedPath("/giris", locale)}?next=${encodeURIComponent(localizedPath("/", locale))}`} className={buttonClasses("primary")}>
              {t("home.states.signIn")}
            </Link>
          }
        />
      </PageTemplate>
    );
  }
  return <SignedInHome t={t} locale={locale} enabled={session.status === "ready"} name={firstName(session.me?.displayName)} />;
}

function SignedInHome({ t, locale, enabled, name }: { t: Translator; locale: Locale; enabled: boolean; name: string | null }) {
  const now = useNow();
  const home = useApiQuery("getHome", {}, { enabled });

  if (home.isPending) return <Loading t={t} />;
  if (home.isError) {
    return (
      <PageTemplate kind="summary" title={name ? t("home.greeting", { name }) : t("home.greetingNoName")}>
        <StatusBanner
          tone="danger"
          title={t("home.states.errorTitle")}
          action={
            <Button variant="secondary" onClick={() => void home.refetch()}>
              {t("home.states.retry")}
            </Button>
          }
        >
          {t("home.states.errorText")}
        </StatusBanner>
      </PageTemplate>
    );
  }

  const { data, meta } = home.data;
  const entitlements = meta?.entitlements;
  const remaining = !entitlements || entitlements.checkNow.limit === null ? null : Math.max(0, entitlements.checkNow.limit - entitlements.checkNow.used);
  const total = meta?.total ?? data.summary.tracking.count;
  const newUser = total === 0;
  const drops = data.topDrops ? <TopDropsSection t={t} locale={locale} drops={data.topDrops} now={now} /> : null;

  if (newUser) {
    return (
      <PageTemplate kind="summary" title={name ? t("home.welcome", { name }) : t("home.welcomeNoName")} caption={t("home.welcomeText")}>
        <HomeSearch t={t} locale={locale} />
        <ol aria-label={t("home.steps.label")} className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step} className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4">
              <span aria-hidden="true" className="flex size-(--size-step-indicator-dot) shrink-0 items-center justify-center rounded-pill bg-primary-subtle text-caption font-bold text-on-primary-subtle">
                {index + 1}
              </span>
              <span className="flex flex-col">
                <span className="text-body font-semibold text-text">{t(`home.steps.${step}.title`)}</span>
                <span className="text-caption text-text-muted">{t(`home.steps.${step}.text`)}</span>
              </span>
            </li>
          ))}
        </ol>
        {drops}
      </PageTemplate>
    );
  }

  const summary = data.summary;
  const sep = <span aria-hidden="true">{t("common.listSeparator")}</span>;
  const caption = (
    <>
      {t("home.summary.tracking", { count: summary.tracking.count })}
      {data.protectedTotal && (
        <>
          {sep}
          <strong className="font-semibold text-text">{t("home.summary.protected", { amount: money(data.protectedTotal, locale) })}</strong>
        </>
      )}
      {summary.deals.count > 0 && (
        <>
          {sep}
          <strong className="font-semibold text-savings">{t("home.summary.deals", { count: summary.deals.count })}</strong>
        </>
      )}
      {summary.lastCheckedAt && (
        <>
          {sep}
          {t("home.summary.checked", { ago: ago(t, summary.lastCheckedAt, now) })}
        </>
      )}
    </>
  );
  const soon = data.returnsSoon;
  const [firstSoon] = soon.items;

  return (
    <PageTemplate kind="summary" title={name ? t("home.greeting", { name }) : t("home.greetingNoName")} caption={caption}>
      <HomeSearch t={t} locale={locale} />
      {meta?.sourcesMissing && <StatusBanner tone="warning">{t("home.states.sourcesMissing")}</StatusBanner>}
      {data.featured && <Featured t={t} locale={locale} item={data.featured} now={now} remaining={remaining} />}
      {soon.count > 0 && firstSoon && (
        <div role="note" className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-warning-subtle px-4 py-3 text-on-warning-subtle">
          <span className="inline-flex items-center gap-2 text-body-sm font-medium">
            <Icon icon={CircleAlert} size="sm" />
            {t("home.returns.text", { count: soon.count, days: RETURN_REMINDER_DAYS })}
          </span>
          <Link
            href={soon.count === 1 ? localizedPath("/takip/[id]", locale, { id: firstSoon.id }) : localizedPath("/takip", locale)}
            className="text-body-sm font-semibold text-on-warning-subtle underline underline-offset-4"
          >
            {soon.count === 1 ? t("home.returns.one") : t("home.returns.many")}
          </Link>
        </div>
      )}
      <TrackedCards t={t} locale={locale} cards={data.cards} total={total} now={now} />
      {drops}
    </PageTemplate>
  );
}

/** Loading (design States 2): a skeleton in the same layout — title, line, search box, Hemen Gözat, cards, top drops. */
function Loading({ t }: { t: Translator }) {
  return (
    <div role="status" aria-label={t("home.states.loading")} className="mx-auto flex w-full max-w-(--size-content-max-width) flex-col gap-6 px-4 py-6 md:px-6 md:py-8">
      <SkeletonBlock shape="title" width="1/3" />
      <SkeletonBlock width="1/2" />
      <SkeletonBlock shape="card" />
      <span aria-hidden="true" className="flex h-(--size-chart-summary-height) rounded-lg bg-surface-alt" />
      <span aria-hidden="true" className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {Array.from({ length: LOADING_CARDS }, (_, index) => (
          <SkeletonBlock key={index} shape="card" />
        ))}
      </span>
      <span aria-hidden="true" className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: LOADING_DROPS }, (_, index) => (
          <SkeletonBlock key={index} shape="card" />
        ))}
      </span>
    </div>
  );
}
