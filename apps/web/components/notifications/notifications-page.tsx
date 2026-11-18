"use client";

// Notifications — `/[locale]/bildirimler` (design "5 Bildirimler" v2.1 Main + States;
// pagedesign.md §8.5; modules.md Notifications and Preferences; decisions 2026-11-19).
// List template with the "Senin için" column; both columns end together.
// - Title + "N okunmamış · son 30 gün · canlı güncelleniyor"; "Tümünü okundu yap" and
//   "Bildirim ayarları" (preferences live in Ayarlar › Bildirimler only).
// - Search (product name) + Kategori with counts; filters Tümü · Fırsat · İade · Aramalarım · Diğer
//   with counts; "Yalnızca okunmamışlar".
// - Groups Bugün / Dün / Bu hafta / Daha önce of `NotificationItem` rows. Opening the title or an
//   action marks the item read; the delivery question is answered in the row; only the first
//   unread deal's action is coral; a "Fırsat geldi" whose deal ended is faded.
// States: empty · empty filter · digest on / daily cap reached · live connection lost · error ·
// loading (rows in the same shape) · guest.
import type { ForYou, Money, NotificationFilter, NotificationItem as Item } from "@firsatgeldi/contracts";
import { DEFAULT_TIME_ZONE, formatAtTime, formatOnDay } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import {
  Button,
  buttonClasses,
  Checkbox,
  EmptyState,
  FilterChips,
  Icon,
  ModeBadge,
  NotificationItem,
  NotificationTile,
  PageTemplate,
  ProductImage,
  SearchField,
  Select,
  SkeletonBlock,
  StatusBanner,
} from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, LogIn, Package, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation, useApiQuery, useSession } from "../../lib/api/hooks";
import { useLiveStatus } from "../../lib/api/live-updates";
import { signInHref } from "../../lib/auth/next";
import { searchAddHref } from "../../lib/handoff";
import { settingsHref } from "../../lib/settings/sections";
import { imageUrl } from "../catalogue-search/catalogue-search-box";
import { ago, money, useNow } from "../search-add/format";
import { useTranslator } from "../shell/parts";
import { calendarDaysAgo, notificationTime, wordNotification } from "./wording";

const FILTERS = ["ALL", "DEAL", "RETURN", "SEARCH", "OTHER"] as const satisfies readonly NotificationFilter[];
const ALL = "all";
const MS_PER_MINUTE = 60_000;
type Group = "today" | "yesterday" | "week" | "earlier";
const GROUPS: readonly Group[] = ["today", "yesterday", "week", "earlier"];
const WEEK_DAYS = 7;

/** "14 Kasım" · "November 14". */
const dayMonth = (locale: Locale, day: string) => new Intl.DateTimeFormat(locale, { timeZone: DEFAULT_TIME_ZONE, day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`));

function groupOf(iso: string, now: number): Group {
  const days = calendarDaysAgo(iso, now);
  return days === 0 ? "today" : days === 1 ? "yesterday" : days < WEEK_DAYS ? "week" : "earlier";
}

/** Every read and count the page shows, refreshed after an action. */
const NOTIFICATION_QUERIES = ["getNotifications", "getUnreadCount", "getDeliveryStatus"] as const;

export function NotificationsPage({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const session = useSession();
  if (session.status === "ready" && session.me === null) {
    return (
      <PageTemplate kind="list" title={t("notifications.title")}>
        <EmptyState
          icon={LogIn}
          title={t("notifications.states.signInTitle")}
          description={t("notifications.states.signInText")}
          action={
            <Link href={signInHref(locale, localizedPath("/bildirimler", locale))} className={buttonClasses("primary")}>
              {t("shell.signIn")}
            </Link>
          }
        />
      </PageTemplate>
    );
  }
  return <SignedInNotifications locale={locale} t={t} enabled={session.status === "ready"} />;
}

function SignedInNotifications({ locale, t, enabled }: { locale: Locale; t: Translator; enabled: boolean }) {
  const now = useNow();
  const live = useLiveStatus();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotificationFilter>("ALL");
  const [text, setText] = useState("");
  const [category, setCategory] = useState(ALL);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const q = useDeferredValue(text.trim());
  const query = { ...(filter === "ALL" ? {} : { filter }), ...(q ? { q } : {}), ...(category === ALL ? {} : { category }), ...(unreadOnly ? { unread: "true" as const } : {}) };
  const list = useApiQuery("getNotifications", { query }, { enabled, placeholderData: (previous) => previous });
  const status = useApiQuery("getDeliveryStatus", {}, { enabled });
  const forYou = useApiQuery("getForYou", {}, { enabled });
  const summary = useApiQuery("getTrackedItemsSummary", {}, { enabled });
  const refresh = () => {
    for (const name of NOTIFICATION_QUERIES) void queryClient.invalidateQueries({ queryKey: [name] });
  };
  const read = useApiMutation("readNotification", { onSuccess: refresh });
  const readAll = useApiMutation("readAllNotifications", { onSuccess: refresh });
  const answer = useApiMutation("answerDeliveryPrompt", {
    onSuccess: ({ data }) => {
      setNotice(
        data.deliveredOn
          ? t("notifications.answered.yes", { date: data.returnDeadline ? dayMonth(locale, data.returnDeadline) : "" })
          : data.nextAskAt
            ? t("notifications.answered.later", { on: formatOnDay(new Date(data.nextAskAt), locale) })
            : t("notifications.answered.noMore"),
      );
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["getTrackedItem"] });
    },
  });

  const side = <ForYouColumn locale={locale} t={t} data={forYou.data?.data ?? null} now={now} />;

  if (list.isError) {
    return (
      <PageTemplate kind="list" title={t("notifications.title")} side={side} sideLabel={t("notifications.forYou.label")} endTogether>
        <StatusBanner
          tone="danger"
          title={t("notifications.states.errorTitle")}
          action={
            <Button variant="secondary" size="compact" onClick={() => void list.refetch()}>
              {t("notifications.states.retry")}
            </Button>
          }
        >
          {t("notifications.states.errorText")}
        </StatusBanner>
      </PageTemplate>
    );
  }
  if (!list.data) return <NotificationsLoading t={t} />;

  const data = list.data.data;
  const unread = data.facets.unread;
  const filtered = filter !== "ALL" || q !== "" || category !== ALL || unreadOnly;
  const caption = [unread > 0 ? t("notifications.unreadCount", { count: unread }) : t("notifications.allRead"), t("notifications.window", { count: data.listDays }), live === "lost" ? t("notifications.liveOff") : t("notifications.live")].join(t("common.listSeparator"));
  const firstUnreadDeal = data.items.find((item) => item.type === "DEAL_FOUND" && !item.read && !item.faded)?.id ?? null;
  const markRead = (item: Item) => {
    if (!item.read) read.mutate({ params: { id: item.id } });
  };
  const groups = GROUPS.map((group) => ({ group, items: data.items.filter((item) => groupOf(item.createdAt, now) === group) })).filter((entry) => entry.items.length > 0);
  const deliveryStatus = status.data?.data;
  const capReached = deliveryStatus ? deliveryStatus.cap.sentToday >= deliveryStatus.cap.limit : false;
  const listAge = Math.max(1, Math.round((now - list.dataUpdatedAt) / MS_PER_MINUTE));

  return (
    <PageTemplate
      kind="list"
      title={t("notifications.title")}
      caption={caption}
      endTogether
      actions={
        <>
          <Button variant="secondary" disabled={unread === 0} loading={readAll.isPending} onClick={() => readAll.mutate({})}>
            {t("notifications.readAll")}
          </Button>
          <Link href={settingsHref(locale, "notifications")} className={buttonClasses("ghost")}>
            {t("notifications.preferences")}
          </Link>
        </>
      }
      toolbar={
        <div className="flex w-full flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <SearchField
              size="list"
              className="min-w-0 flex-1"
              label={t("notifications.searchLabel")}
              hideLabel
              placeholder={t("notifications.search")}
              value={text}
              onChange={(event) => setText(event.target.value)}
              clearLabel={t("notifications.clearSearch")}
              onClear={() => setText("")}
            />
            <Select
              label={t("notifications.category")}
              compact
              value={category}
              onValueChange={setCategory}
              options={[{ value: ALL, label: t("notifications.all"), count: data.facets.categories.reduce((sum, entry) => sum + entry.count, 0) }, ...data.facets.categories.map((entry) => ({ value: entry.id, label: entry.name, count: entry.count }))]}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <FilterChips label={t("notifications.filtersLabel")} value={filter} onChange={setFilter} options={FILTERS.map((id) => ({ id, label: t(`notifications.filters.${id}`), count: data.facets.filters[id] }))} />
            <Checkbox label={t("notifications.unreadOnly")} checked={unreadOnly} onCheckedChange={setUnreadOnly} />
          </div>
        </div>
      }
      side={side}
      sideLabel={t("notifications.forYou.label")}
    >
      {live === "lost" && (
        <StatusBanner
          tone="warning"
          action={
            <Button variant="secondary" size="compact" onClick={() => void list.refetch()}>
              {t("notifications.states.refresh")}
            </Button>
          }
        >
          {t("notifications.states.lost", { count: listAge })}
        </StatusBanner>
      )}
      {deliveryStatus?.digest.on && <StatusBanner tone="info">{t("notifications.status.digest", { count: deliveryStatus.digest.pending, at: formatAtTime(new Date(`2000-01-01T${deliveryStatus.digest.time}:00Z`), locale, { timeZone: "UTC" }) })}</StatusBanner>}
      {deliveryStatus && capReached && (
        <StatusBanner
          tone="warning"
          action={
            <Link href={settingsHref(locale, "notifications")} className={buttonClasses("secondary", undefined, "compact")}>
              {t("notifications.status.toDigest")}
            </Link>
          }
        >
          {[t("notifications.status.cap", { count: deliveryStatus.cap.deferred, limit: deliveryStatus.cap.limit }), t("notifications.status.capCounter", { sent: deliveryStatus.cap.sentToday, limit: deliveryStatus.cap.limit })].join(t("common.listSeparator"))}
        </StatusBanner>
      )}
      {notice && <StatusBanner tone="info">{notice}</StatusBanner>}
      {(read.isError || readAll.isError || answer.isError) && <StatusBanner tone="danger">{errorMessage(t, read.error ?? readAll.error ?? answer.error)}</StatusBanner>}

      {data.items.length === 0 && !filtered ? (
        <EmptyState
          icon={Bell}
          title={t("notifications.states.emptyTitle")}
          description={t("notifications.states.emptyText")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href={searchAddHref(locale)} className={buttonClasses("primary")}>
                {t("notifications.states.addProduct")}
              </Link>
              <Link href={settingsHref(locale, "notifications")} className={buttonClasses("secondary")}>
                {t("notifications.states.editPreferences")}
              </Link>
            </div>
          }
        />
      ) : data.items.length === 0 ? (
        <EmptyFilter t={t} filter={filter} onlyFilter={q === "" && category === ALL && !unreadOnly} summary={summary.data?.data ?? null} now={now} onReset={() => (setFilter("ALL"), setText(""), setCategory(ALL), setUnreadOnly(false))} />
      ) : (
        groups.map(({ group, items }) => (
          <section key={group} aria-labelledby={`notifications-${group}`} className="flex flex-col gap-2">
            <h2 id={`notifications-${group}`} className="text-caption font-semibold text-text-muted uppercase">
              {t(`notifications.groups.${group}`)}
            </h2>
            <ul className="flex flex-col divide-y divide-divider overflow-hidden rounded-lg border border-border bg-surface">
              {items.map((item) => (
                <li key={item.id}>
                  <Row locale={locale} t={t} item={item} now={now} coral={item.id === firstUnreadDeal} onOpen={() => markRead(item)} answering={answer.isPending && answer.variables?.params.id === item.id} onAnswer={(value) => answer.mutate({ params: { id: item.id }, body: { answer: value } })} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </PageTemplate>
  );
}

function Row({ locale, t, item, now, coral, onOpen, answering, onAnswer }: { locale: Locale; t: Translator; item: Item; now: number; coral: boolean; onOpen: () => void; answering: boolean; onAnswer: (answer: "YES" | "NOT_YET") => void }) {
  const words = wordNotification(t, locale, item, now);
  const media =
    item.subject.kind === "PRODUCT" ? <ProductImage src={imageUrl(item.subject.product.imageSha256)} alt={item.subject.product.name} size="md" fallbackIcon={Package} /> : <NotificationTile icon={words.tile ?? Bell} />;
  return (
    <NotificationItem
      unread={!item.read}
      unreadLabel={t("notifications.unread")}
      faded={item.faded}
      media={media}
      badge={words.badge}
      type={words.type}
      time={{ label: notificationTime(locale, item.createdAt, now), iso: item.createdAt }}
      title={
        words.titleHref ? (
          <Link href={words.titleHref} onClick={onOpen} className="text-text hover:underline">
            {words.title}
          </Link>
        ) : (
          <span>{words.title}</span>
        )
      }
      body={words.body}
      {...(item.subject.kind === "PRODUCT" ? { mode: <ModeBadge mode={item.subject.mode} label={t(`notifications.modes.${item.subject.mode}`)} /> } : {})}
      {...(words.meta ? { meta: words.meta } : {})}
      actions={
        words.actions.length > 0 ? (
          <>
            {words.actions.map((action, index) =>
              action.kind === "link" ? (
                <Link key={action.label} href={action.href} onClick={onOpen} className={buttonClasses(coral && words.isDeal ? "deal" : action.primary && index === 0 ? "primary" : "secondary", "w-full", "compact")}>
                  {action.label}
                </Link>
              ) : (
                <Button key={action.answer} variant={action.answer === "YES" ? "secondary" : "ghost"} size="compact" className="w-full" loading={answering} onClick={() => onAnswer(action.answer)}>
                  {action.label}
                </Button>
              ),
            )}
          </>
        ) : undefined
      }
    />
  );
}

function EmptyFilter({ t, filter, onlyFilter, summary, now, onReset }: { t: Translator; filter: NotificationFilter; onlyFilter: boolean; summary: { tracking: { count: number }; lastCheckedAt: string | null } | null; now: number; onReset: () => void }) {
  const title = onlyFilter && filter !== "ALL" ? t(`notifications.states.emptyFilter.${filter}`) : t("notifications.states.noMatch");
  const text = onlyFilter && summary && summary.tracking.count > 0 && summary.lastCheckedAt ? t("notifications.states.emptyFilterText", { count: summary.tracking.count, ago: ago(t, summary.lastCheckedAt, now) }) : onlyFilter ? t("notifications.states.emptyFilterPlain") : null;
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-5">
      <p className="text-body font-semibold text-text">{title}</p>
      {text && <p className="text-body-sm text-text-muted">{text}</p>}
      <Button variant="secondary" size="compact" onClick={onReset}>
        {onlyFilter ? t("notifications.states.showAll") : t("notifications.states.clear")}
      </Button>
    </div>
  );
}

/** "Senin için": drops in the tracked list · recent searches not tracked ("Takip et") · frequent searches. Cheapest offer only. */
function ForYouColumn({ locale, t, data, now }: { locale: Locale; t: Translator; data: ForYou | null; now: number }) {
  if (!data) {
    return (
      <>
        <SkeletonBlock shape="card" />
        <SkeletonBlock shape="card" />
      </>
    );
  }
  const dropText = (drop: Money | null, pct: number | null) => (drop ? money(drop, locale) : pct !== null ? t("notifications.forYou.pct", { value: pct }) : null);
  return (
    <>
      {data.drops.length > 0 && (
        <section aria-labelledby="for-you-drops" className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="for-you-drops" className="text-body-sm font-semibold text-text">
              {t("notifications.forYou.drops")}
            </h2>
            <Link href={localizedPath("/takip", locale)} className="text-caption font-semibold text-primary underline underline-offset-4">
              {t("notifications.forYou.dropsLink")}
            </Link>
          </div>
          <ul className="flex flex-col divide-y divide-divider">
            {data.drops.map((drop) => (
              <li key={drop.trackedItemId}>
                <Link href={localizedPath("/takip/[id]", locale, { id: drop.trackedItemId })} className="flex items-center gap-3 py-2">
                  <ProductImage src={imageUrl(drop.product.imageSha256)} alt={drop.product.name} size="sm" fallbackIcon={Package} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-sm font-semibold text-text">{drop.product.name}</span>
                    <span className="text-caption text-text-muted">{[t(`notifications.modes.${drop.mode}`), ago(t, drop.at, now)].join(t("common.listSeparator"))}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end">
                    <span className="text-caption font-bold text-savings">{t("notifications.forYou.drop", { value: dropText(drop.drop, drop.dropPct) ?? "" })}</span>
                    <span className="text-body-sm font-semibold text-text tabular-nums">{money(drop.price, locale)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {data.searches.length > 0 && (
        <section aria-labelledby="for-you-searches" className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 id="for-you-searches" className="text-body-sm font-semibold text-text">
              {t("notifications.forYou.searches")}
            </h2>
            <span className="text-caption text-text-muted">{t("notifications.forYou.searchesNote")}</span>
          </div>
          <ul className="flex flex-col divide-y divide-divider">
            {data.searches.map((search) => {
              const drop = dropText(search.drop, search.dropPct);
              const line = [drop ? t("notifications.forYou.drop", { value: drop }) : t("notifications.forYou.noChange"), money(search.price, locale), ago(t, search.checkedAt, now)].join(t("common.listSeparator"));
              return (
                <li key={search.product.id} className="flex items-center gap-3 py-2">
                  <ProductImage src={imageUrl(search.product.imageSha256)} alt={search.product.name} size="sm" fallbackIcon={Package} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-sm font-semibold text-text">{search.product.name}</span>
                    <span className={drop ? "truncate text-caption font-bold text-savings" : "truncate text-caption text-text-muted"}>{line}</span>
                  </span>
                  <Link href={searchAddHref(locale, { productId: search.product.id, backToTracking: true })} className={buttonClasses("secondary", undefined, "compact")}>
                    {t("notifications.forYou.track")}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
      {data.frequent.length > 0 && (
        <section aria-labelledby="for-you-frequent" className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 md:flex-1">
          <h2 id="for-you-frequent" className="text-body-sm font-semibold text-text">
            {t("notifications.forYou.frequent")}
          </h2>
          <ul className="flex flex-wrap gap-2">
            {data.frequent.map((query) => (
              <li key={query}>
                <Link href={searchAddHref(locale, { query })} className="inline-flex min-h-(--size-touch-target-min) items-center gap-1 rounded-pill border border-border bg-surface px-3 text-body-sm text-text hover:bg-surface-alt">
                  <Icon icon={Search} size="sm" />
                  {query}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** Loading: rows in the real row's shape (design States 6). */
function NotificationsLoading({ t }: { t: Translator }) {
  return (
    <PageTemplate kind="list" title={t("notifications.title")} side={<SkeletonBlock shape="card" />} endTogether>
      <span role="status" className="sr-only">
        {t("notifications.states.loading")}
      </span>
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
          <SkeletonBlock shape="thumb" />
          <div className="flex flex-1 flex-col gap-2">
            <SkeletonBlock shape="line" width="1/4" />
            <SkeletonBlock shape="line" width="2/3" />
            <SkeletonBlock shape="line" width="1/2" />
          </div>
        </div>
      ))}
    </PageTemplate>
  );
}
