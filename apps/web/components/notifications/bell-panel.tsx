"use client";

// Bell panel + preview (design "5 Bildirimler" v2.1 Panel; pagedesign.md §8.5; modules.md
// Notifications › Bell panel + preview; product_design_pattern.md §5.29; decisions 2026-11-19).
// - The panel (side panel; full screen on phones): "Bildirimler" + "N okunmamış · son 10
//   bildirim", "Tümünü okundu yap", the last 10 items, "Tümünü gör", "Bildirim ayarları".
// - Clicking an item marks it read and opens its preview to the left of the panel (on phones in
//   the panel's place, with "Geri"): image, mode, message, three values for the type, the 14-day
//   cheapest price where it applies, the check time and the actions. The preview's "Fırsatı gör"
//   is the only coral element; the counter turns neutral once the deal is read.
import type { NotificationDetail, NotificationItem as Item } from "@firsatgeldi/contracts";
import { formatOnDay } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, cn, focusRing, ModeBadge, NotificationItem, NotificationPreview, NotificationTile, PriceSparkline, ProductImage, Sheet, SkeletonBlock, StatusBanner } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Package } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation, useApiQuery } from "../../lib/api/hooks";
import { settingsHref } from "../../lib/settings/sections";
import { useIsPhoneWidth } from "../../lib/viewport";
import { imageUrl } from "../catalogue-search/catalogue-search-box";
import { money, useNow } from "../search-add/format";
import { notificationTime, productHref, wordNotification } from "./wording";

/** The panel lists the last 10 notifications [DECIDED] (modules.md › Where). */
export const PANEL_SIZE = 10;

/** The panel's title-row action and subtitle need the unread count; the shell passes them in. */
export function bellPanelSubtitle(t: Translator, unread: number | null): string {
  return unread && unread > 0 ? t("notifications.panel.subtitle", { count: unread, last: PANEL_SIZE }) : t("notifications.panel.subtitleAllRead", { count: PANEL_SIZE });
}

/** Refetch everything that shows notifications after a change. */
function useRefreshNotifications() {
  const queryClient = useQueryClient();
  return () => {
    for (const name of ["getNotifications", "getUnreadCount", "getDeliveryStatus", "getNotification"]) void queryClient.invalidateQueries({ queryKey: [name] });
  };
}

/** "Tümünü okundu yap" in the panel's title row. */
export function BellReadAll({ t, disabled }: { t: Translator; disabled: boolean }) {
  const refresh = useRefreshNotifications();
  const readAll = useApiMutation("readAllNotifications", { onSuccess: refresh });
  return (
    <Button variant="ghost" size="compact" disabled={disabled} loading={readAll.isPending} onClick={() => readAll.mutate({})}>
      {t("notifications.readAll")}
    </Button>
  );
}

/** The panel's footer: "Tümünü gör" and "Bildirim ayarları". */
export function BellFooter({ locale, t, onNavigate }: { locale: Locale; t: Translator; onNavigate: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href={localizedPath("/bildirimler", locale)} onClick={onNavigate} className={cn("text-body font-semibold text-primary underline-offset-4 hover:underline", focusRing)}>
        {t("shell.bell.seeAll")}
      </Link>
      <Link href={settingsHref(locale, "notifications")} onClick={onNavigate} className={cn("text-body-sm text-text-muted underline-offset-4 hover:underline", focusRing)}>
        {t("notifications.preferences")}
      </Link>
    </div>
  );
}

export interface BellPanelState {
  selected: string | null;
  select: (id: string | null) => void;
}

export function useBellPanelState(): BellPanelState {
  const [selected, select] = useState<string | null>(null);
  return { selected, select };
}

/** The list of the last 10 (on phones the preview replaces it). */
export function BellPanelList({ locale, t, state }: { locale: Locale; t: Translator; state: BellPanelState }) {
  const now = useNow();
  const refresh = useRefreshNotifications();
  const list = useApiQuery("getNotifications", { query: {} });
  const read = useApiMutation("readNotification", { onSuccess: refresh });
  if (list.isPending) {
    return (
      <div className="flex flex-col gap-3">
        <span role="status" className="sr-only">
          {t("notifications.states.loading")}
        </span>
        {[0, 1, 2].map((index) => (
          <SkeletonBlock key={index} shape="card" />
        ))}
      </div>
    );
  }
  if (list.isError) return <StatusBanner tone="danger">{t("notifications.states.errorTitle")}</StatusBanner>;
  const items = list.data.data.items.slice(0, PANEL_SIZE);
  if (items.length === 0) return <p className="p-4 text-body-sm text-text-muted">{t("notifications.panel.empty")}</p>;

  return (
    <div>
      <ul aria-label={t("notifications.panel.listLabel", { count: items.length })} className="-mx-4 -mt-4 flex flex-col divide-y divide-divider">
        {items.map((item) => {
          const words = wordNotification(t, locale, item, now);
          const pressed = state.selected === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={pressed}
                onClick={() => {
                  state.select(item.id);
                  // Opening the preview marks it read [DECIDED 2026-11-19].
                  if (!item.read) read.mutate({ params: { id: item.id } });
                }}
                className={cn("block w-full text-left hover:bg-surface-alt", pressed && "bg-primary-subtle", focusRing)}
              >
                <NotificationItem
                  compact
                  unread={!item.read}
                  unreadLabel={t("notifications.unread")}
                  faded={item.faded}
                  media={item.subject.kind === "PRODUCT" ? <ProductImage src={imageUrl(item.subject.product.imageSha256)} alt={item.subject.product.name} size="sm" fallbackIcon={Package} /> : <NotificationTile icon={words.tile ?? Bell} size="panel" />}
                  badge={words.badge}
                  type={words.type}
                  time={{ label: notificationTime(locale, item.createdAt, now), iso: item.createdAt }}
                  title={words.title}
                  body={words.body}
                  {...(item.subject.kind === "PRODUCT" ? { mode: <ModeBadge mode={item.subject.mode} label={t(`notifications.modes.${item.subject.mode}`)} /> } : {})}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The preview of the selected item: beside the panel from breakpoint.md, in its place on phones. */
export function BellPreview({ locale, t, state, onNavigate, inPanel = false }: { locale: Locale; t: Translator; state: BellPanelState; onNavigate: () => void; inPanel?: boolean }) {
  const now = useNow();
  const refresh = useRefreshNotifications();
  const detail = useApiQuery("getNotification", { params: { id: state.selected ?? "" } }, { enabled: state.selected !== null });
  const [notice, setNotice] = useState<string | null>(null);
  const answer = useApiMutation("answerDeliveryPrompt", {
    onSuccess: ({ data }) => {
      setNotice(data.deliveredOn ? t("notifications.answered.yes", { date: data.returnDeadline ? dayMonth(locale, data.returnDeadline) : "" }) : data.nextAskAt ? t("notifications.answered.later", { on: formatOnDay(new Date(data.nextAskAt), locale) }) : t("notifications.answered.noMore"));
      refresh();
    },
  });
  if (!state.selected) return null;
  const close = () => {
    setNotice(null);
    state.select(null);
  };
  const back = inPanel ? (
    <Button variant="ghost" size="compact" icon={ArrowLeft} onClick={close}>
      {t("notifications.panel.back")}
    </Button>
  ) : null;
  if (!detail.data) {
    return (
      <div className={cn("flex flex-col gap-3", !inPanel && "p-5")}>
        {back}
        {detail.isError ? <StatusBanner tone="danger">{errorMessage(t, detail.error)}</StatusBanner> : <SkeletonBlock shape="card" />}
      </div>
    );
  }
  const item = detail.data.data;
  const words = wordNotification(t, locale, item, now);
  const facts = previewFacts(t, locale, item);
  const detailHref = productHref(locale, item);
  const actions = words.actions.map((action) =>
    action.kind === "link" ? (
      <Link key={action.label} href={action.href} onClick={onNavigate} className={buttonClasses(words.isDeal ? "deal" : action.primary ? "primary" : "secondary", undefined, "compact")}>
        {action.label}
      </Link>
    ) : (
      <Button key={action.answer} variant={action.answer === "YES" ? "primary" : "secondary"} size="compact" loading={answer.isPending && answer.variables?.body.answer === action.answer} onClick={() => answer.mutate({ params: { id: item.id }, body: { answer: action.answer } })}>
        {action.label}
      </Button>
    ),
  );
  // A second text action: the product detail, or "Bu bendim" on a new-device item (read already).
  const secondary =
    item.type === "NEW_DEVICE_SIGNIN" ? (
      <Button key="its-me" variant="secondary" size="compact" onClick={close}>
        {t("notifications.actions.itsMe")}
      </Button>
    ) : detailHref && !words.actions.some((action) => action.kind === "link" && action.label === t("notifications.actions.product")) ? (
      <Link key="detail" href={detailHref} onClick={onNavigate} className={buttonClasses("secondary", undefined, "compact")}>
        {t("notifications.panel.detail")}
      </Link>
    ) : null;

  return (
    <div className="flex flex-col">
      {back && <div className="pb-2">{back}</div>}
      <NotificationPreview
        type={words.type}
        time={{ label: notificationTime(locale, item.createdAt, now), iso: item.createdAt }}
        onClose={close}
        closeLabel={t("notifications.panel.closePreview")}
        media={item.subject.kind === "PRODUCT" ? <ProductImage src={imageUrl(item.subject.product.imageSha256)} alt={item.subject.product.name} size="lg" fallbackIcon={Package} /> : <NotificationTile icon={words.tile ?? Bell} />}
        {...(item.subject.kind === "PRODUCT" ? { mode: <ModeBadge mode={item.subject.mode} label={t(`notifications.modes.${item.subject.mode}`)} /> } : {})}
        title={words.title}
        {...(previewSub(t, locale, item) ? { sub: previewSub(t, locale, item) ?? "" } : {})}
        body={words.body}
        facts={facts}
        {...(item.history ? { chart: <PreviewChart t={t} locale={locale} item={item} /> } : {})}
        checked={
          item.type === "NEW_DEVICE_SIGNIN" ? (
            <Link href={settingsHref(locale, "security")} onClick={onNavigate} className="font-semibold text-primary underline underline-offset-4">
              {t("notifications.panel.manageSecurity")}
            </Link>
          ) : (
            words.meta
          )
        }
        actions={
          <>
            {notice && <StatusBanner tone="info">{notice}</StatusBanner>}
            {answer.isError && <StatusBanner tone="danger">{errorMessage(t, answer.error)}</StatusBanner>}
            {actions}
            {secondary}
          </>
        }
      />
    </div>
  );
}

/** "Aksiyon kamerası · Hepsiburada · 1 Kasım'da aldın" · "· 9 mağazada" · "· 18 gün takip kaldı". */
function previewSub(t: Translator, locale: Locale, item: Item): string | null {
  if (item.subject.kind === "ACCOUNT") return item.mandatory ? t("notifications.meta.mandatory") : null;
  if (item.subject.kind !== "PRODUCT") return null;
  const v = item.values;
  const parts = [
    item.subject.product.category.name,
    // The own store without a suffix [DECIDED 2026-11-19]; the day keeps its suffix.
    v.ownStore && v.orderedOn ? t("notifications.preview.bought", { store: v.ownStore, on: formatOnDay(new Date(`${v.orderedOn}T12:00:00Z`), locale) }) : null,
    v.storeCount !== null ? t("notifications.preview.atStores", { count: v.storeCount }) : null,
    v.trackingDaysLeft !== null ? t("notifications.preview.trackingLeft", { count: v.trackingDaysLeft }) : null,
  ];
  return parts.filter((part): part is string => part !== null).join(t("common.listSeparator"));
}

const dayMonth = (locale: Locale, day: string) => new Intl.DateTimeFormat(locale, { timeZone: "Europe/Istanbul", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00Z`));

/** The three values for the type (modules.md › Bell panel + preview); none for the rest. */
function previewFacts(t: Translator, locale: Locale, item: Item): { label: string; value: string; highlight?: boolean }[] {
  const v = item.values;
  const m = (value: typeof v.cheapest) => (value ? money(value, locale) : "");
  const f = (key: Parameters<typeof t>[0]) => t(key);
  switch (item.type) {
    case "DEAL_FOUND":
      return [
        { label: f("notifications.preview.facts.paid"), value: m(v.pricePaid) },
        { label: f("notifications.preview.facts.cheapestNow"), value: m(v.cheapest) },
        { label: f("notifications.preview.facts.saving"), value: m(v.saving), highlight: true },
      ];
    case "SEARCHED_PRODUCT_DROP":
      return [
        { label: f("notifications.preview.facts.cheapestNow"), value: m(v.cheapest) },
        { label: f("notifications.preview.facts.drop"), value: m(v.drop), highlight: true },
        ...(v.lowest30Days ? [{ label: f("notifications.preview.facts.last30"), value: f("notifications.preview.facts.lowest") }] : []),
      ];
    case "DEADLINE_SOON":
      return [
        ...(v.deliveredOn ? [{ label: f("notifications.preview.facts.delivered"), value: dayMonth(locale, v.deliveredOn) }] : []),
        ...(v.returnDeadline ? [{ label: f("notifications.preview.facts.lastReturnDay"), value: dayMonth(locale, v.returnDeadline) }] : []),
        ...(v.returnDaysLeft !== null ? [{ label: f("notifications.preview.facts.left"), value: t("notifications.preview.facts.days", { count: v.returnDaysLeft }) }] : []),
      ];
    case "DELIVERY_PROMPT":
      return [
        ...(v.orderedOn ? [{ label: f("notifications.preview.facts.ordered"), value: dayMonth(locale, v.orderedOn) }] : []),
        ...(v.orderStatus ? [{ label: f("notifications.preview.facts.seenStatus"), value: t(`notifications.preview.status.${v.orderStatus}`) }] : []),
        ...(v.returnPeriodDays !== null ? [{ label: f("notifications.preview.facts.returnPeriod"), value: t("notifications.preview.facts.afterDelivery", { count: v.returnPeriodDays }) }] : []),
      ];
    case "PRICE_DROP":
    case "TARGET_REACHED":
      return v.target && v.cheapest
        ? [
            { label: f("notifications.preview.facts.target"), value: m(v.target) },
            { label: f("notifications.preview.facts.cheapestNow"), value: m(v.cheapest) },
            { label: f("notifications.preview.facts.toTarget"), value: money({ amount: Math.max(0, v.cheapest.amount - v.target.amount), currency: v.cheapest.currency }, locale) },
          ]
        : [];
    case "BACK_IN_STOCK":
      return [
        { label: f("notifications.preview.facts.cheapest"), value: m(v.cheapest) },
        { label: f("notifications.preview.facts.stock"), value: f("notifications.preview.facts.inStock"), highlight: true },
        ...(v.outOfStockDays !== null ? [{ label: f("notifications.preview.facts.outBefore"), value: t("notifications.preview.facts.atLeastDays", { count: v.outOfStockDays }) }] : []),
      ];
    case "NEW_DEVICE_SIGNIN":
      return v.device
        ? [
            { label: f("notifications.preview.facts.device"), value: v.device.browser },
            { label: f("notifications.preview.facts.system"), value: v.device.os },
            { label: f("notifications.preview.facts.when"), value: new Intl.DateTimeFormat(locale, { timeZone: "Europe/Istanbul", day: "numeric", month: "short" }).format(new Date(v.device.at)) },
          ]
        : [];
    default:
      return [];
  }
}

/** "Son 14 gün · en ucuz fiyat" + the note + the sparkline (paid solid, target dotted, cheapest dashed) + the legend. */
function PreviewChart({ t, locale, item }: { t: Translator; locale: Locale; item: NotificationDetail }) {
  const history = item.history ?? [];
  const v = item.values;
  const paid = item.type === "DEAL_FOUND" && v.pricePaid ? v.pricePaid.amount : null;
  const target = v.target ? v.target.amount : null;
  const cheapest = history.map((point) => point.cheapest.amount);
  const price = (amount: number) => money({ amount, currency: "TRY" }, locale);
  const note = v.cheaperSellerCount !== null ? t("notifications.preview.cheaperSellers", { count: v.cheaperSellerCount }) : v.lowest30Days ? t("notifications.preview.lowest30") : v.storeCount !== null ? t("notifications.preview.stores", { count: v.storeCount }) : null;
  const name = item.subject.kind === "PRODUCT" ? item.subject.product.name : "";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-caption">
        <span className="font-semibold text-text">{t("notifications.preview.chartTitle", { count: history.length })}</span>
        {note && <span className="text-text-muted">{note}</span>}
      </div>
      <PriceSparkline
        cheapest={cheapest}
        {...(paid !== null ? { paid } : {})}
        {...(target !== null ? { target } : {})}
        readout={(index, value) => t("notifications.preview.readout", { day: history[index] ? dayMonth(locale, history[index].day) : "", price: price(value) })}
        labels={{
          min: t("notifications.preview.min", { price: price(Math.min(...cheapest)) }),
          max: t("notifications.preview.max", { price: price(Math.max(...cheapest)) }),
          cheapest: t("notifications.preview.cheapest"),
          ...(paid !== null ? { paid: t("notifications.preview.paid", { price: price(paid) }) } : {}),
          ...(target !== null ? { target: t("notifications.preview.target", { price: price(target) }) } : {}),
        }}
        label={t("notifications.preview.chartLabel", { name, count: history.length })}
      />
      <span className="text-caption text-text-muted">{paid !== null ? t("notifications.preview.legendPaid") : target !== null ? t("notifications.preview.legendTarget") : t("notifications.preview.legendCheapest")}</span>
    </div>
  );
}

/**
 * The signed-in bell panel: the list, "Tümünü okundu yap" in the title row, the footer links,
 * and the preview beside the panel (desktop) or in its place (phone). Closing it clears the preview.
 */
export function SessionBellPanel({ locale, t, open, onClose, unread }: { locale: Locale; t: Translator; open: boolean; onClose: () => void; unread: number | null }) {
  const state = useBellPanelState();
  // Phone width: the preview replaces the list inside the full-screen panel (design v2.1).
  const phone = useIsPhoneWidth();
  const close = () => {
    state.select(null);
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      fullOnPhone
      title={t("shell.bell.panelTitle")}
      subtitle={bellPanelSubtitle(t, unread)}
      closeLabel={t("common.closePanel")}
      headerAction={<BellReadAll t={t} disabled={!unread} />}
      footer={<BellFooter locale={locale} t={t} onNavigate={close} />}
      {...(state.selected && !phone ? { beside: <BellPreview locale={locale} t={t} state={state} onNavigate={close} /> } : {})}
    >
      {phone && state.selected ? <BellPreview locale={locale} t={t} state={state} onNavigate={close} inPanel /> : <BellPanelList locale={locale} t={t} state={state} />}
    </Sheet>
  );
}
