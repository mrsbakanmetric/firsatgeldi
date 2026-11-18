// Notifications — the page and the bell panel (modules.md Notifications and Preferences;
// architecture.md §16 NOTIFICATIONS; decisions 2026-11-19). Rows are created per user on first use
// from the fixtures. Rules:
// - The list shows the last `notify.list_days`; older rows are kept, not listed; scheduled rows
//   (a delivery question asked again) appear when their time comes.
// - No seller identity; the own store only as the user's purchase ("Hepsiburada · 1 Kasım'da aldın").
// - A "Fırsat geldi" fades when the same product's "Fırsat bitti" came later.
// - "Evet, aldım" records today as the delivery day (as Product Detail; logged `tracking.delivered`);
//   "Henüz değil" asks again in `notify.delivery_reask_days`, at most `notify.delivery_reask_max` times.
import type { DeliveryStatus, ForYou, NotificationDetail, NotificationFilter, NotificationItem, NotificationValues } from "@firsatgeldi/contracts";
import { notificationFilterOf } from "@firsatgeldi/contracts";
import { addCalendarDays, returnDeadline, toCalendarDay } from "@firsatgeldi/core";
import { PRODUCTS } from "../fixtures/catalog";
import { PLATFORMS } from "../fixtures/market";
import { FOR_YOU_DROPS, FOR_YOU_SEARCHES, FREQUENT_SEARCHES, NOTIFICATION_SEEDS, type NotificationSeed } from "../fixtures/notifications";
import { NOTIFICATIONS_TODAY } from "../fixtures/settings";
import { pick } from "../fixtures/text";
import { newId } from "../ids";
import { MockApiError, route } from "../route";
import { SYSTEM_SETTINGS } from "../settings";
import type { Actor, MockController, NotificationStateRow, TrackedItemRow } from "../state";
import { productSummary } from "../views";
import { fold, tokens } from "./shared";

type UserActor = Extract<Actor, { kind: "user" }>;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;
const iso = (date: Date) => date.toISOString();
const ago = (now: Date, minutes: number) => iso(new Date(now.getTime() - minutes * MS_PER_MINUTE));
const money = (amount: number | undefined | null) => (amount === undefined || amount === null ? null : { amount, currency: "TRY" as const });

function userActor(actor: Actor): UserActor {
  if (actor.kind !== "user") throw new MockApiError("UNAUTHENTICATED");
  return actor;
}

const seedsOf = (user: UserActor) => NOTIFICATION_SEEDS[user.userKey] ?? [];
const seedOf = (user: UserActor, key: string | null) => (key ? seedsOf(user).find((seed) => seed.key === key) : undefined);

/** The user's rows from the fixtures, once. */
function seed(controller: MockController, user: UserActor, now: Date): void {
  const { state } = controller;
  if (state.notificationsSeeded.has(user.userId)) return;
  state.notificationsSeeded.add(user.userId);
  for (const entry of seedsOf(user)) {
    state.notifications.push({
      id: newId(),
      userId: user.userId,
      type: entry.type,
      createdAt: ago(now, entry.minutesAgo),
      readAt: entry.read ? ago(now, entry.minutesAgo) : null,
      seedKey: entry.key,
      awaitingAnswer: entry.type === "DELIVERY_PROMPT",
    });
  }
}

function trackedRow(controller: MockController, user: UserActor, trackingSeed: string | null): TrackedItemRow | undefined {
  if (!trackingSeed) return undefined;
  return controller.state.trackedItems.find((row) => row.userId === user.userId && row.seedKey === trackingSeed);
}

/** Rows in the list window, newest first (scheduled ones are not here yet). */
function listed(controller: MockController, user: UserActor, now: Date): NotificationStateRow[] {
  const from = now.getTime() - SYSTEM_SETTINGS["notify.list_days"] * MS_PER_DAY;
  return controller.state.notifications
    .filter((row) => row.userId === user.userId && Date.parse(row.createdAt) <= now.getTime() && Date.parse(row.createdAt) >= from)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function values(entry: NotificationSeed | undefined, tracked: TrackedItemRow | undefined, now: Date): NotificationValues {
  const v = entry?.values ?? {};
  const rule = tracked?.platform ? PLATFORMS[tracked.platform].returnRule : null;
  const today = toCalendarDay(now);
  return {
    pricePaid: money(v.pricePaid ?? null),
    cheapest: money(v.cheapest),
    saving: money(v.saving),
    drop: money(v.drop),
    dropPct: v.dropPct ?? null,
    target: money(v.target),
    previousPrice: money(v.previousPrice),
    returnDaysLeft: v.returnDaysLeft ?? null,
    returnDeadline: tracked?.returnDeadline ?? (v.returnDaysLeft !== undefined ? addCalendarDays(today, v.returnDaysLeft) : null),
    returnPeriodDays: rule?.days ?? null,
    orderedOn: tracked?.orderedOn ?? null,
    deliveredOn: tracked?.orderStatus === "DELIVERED" && tracked.returnDeadline && rule ? addCalendarDays(tracked.returnDeadline, -rule.days) : null,
    orderStatus: tracked?.orderStatus ?? null,
    // The user's own purchase only — never a cheaper seller or its store.
    ownStore: tracked?.mode === "BOUGHT" ? (tracked.platform ? PLATFORMS[tracked.platform].name : (tracked.otherPlatformName ?? null)) : null,
    storeCount: v.storeCount ?? null,
    cheaperSellerCount: v.cheaperSellerCount ?? null,
    outOfStockDays: v.outOfStockDays ?? null,
    lowest30Days: v.lowest30Days ?? null,
    trackingDaysLeft: v.trackingDaysLeft ?? null,
    report: v.report ? { kind: v.report.kind, outcome: v.report.outcome, reportedOn: addCalendarDays(today, -v.report.reportedDaysAgo) } : null,
    device: v.device ? { browser: v.device.browser, os: v.device.os, at: ago(now, entry?.minutesAgo ?? 0) } : null,
    digest: v.digest ? { products: v.digest.products, changes: v.digest.changes, lines: [...v.digest.lines] } : null,
    checkedAt: entry && entry.checkedMinutesAgo !== null ? ago(now, entry.checkedMinutesAgo) : null,
  };
}

function itemOf(controller: MockController, user: UserActor, row: NotificationStateRow, all: readonly NotificationStateRow[], locale: "tr" | "en", now: Date): NotificationItem {
  const entry = seedOf(user, row.seedKey);
  const subjectSeed = entry?.subject;
  const tracked = subjectSeed?.kind === "PRODUCT" ? trackedRow(controller, user, subjectSeed.trackingSeed) : undefined;
  let subject: NotificationItem["subject"];
  if (subjectSeed?.kind === "PRODUCT") {
    const summary = productSummary(PRODUCTS[subjectSeed.product], locale);
    subject = {
      kind: "PRODUCT",
      product: { id: summary.id, name: summary.name, imageSha256: summary.imageSha256, category: summary.category },
      mode: tracked && tracked.state === "ACTIVE" ? tracked.mode : subjectSeed.mode,
      trackedItemId: tracked?.id ?? row.trackedItemId ?? null,
    };
  } else if (subjectSeed?.kind === "PERSON") {
    subject = { kind: "PERSON", username: subjectSeed.username };
  } else {
    subject = { kind: "ACCOUNT" };
  }
  const productId = subject.kind === "PRODUCT" ? subject.product.id : null;
  // "Fırsat geldi" fades once the same product's "Fırsat bitti" came after it.
  const faded =
    row.type === "DEAL_FOUND" &&
    productId !== null &&
    all.some((other) => other.type === "DEAL_ENDED" && other.createdAt > row.createdAt && (() => {
      const otherSeed = seedOf(user, other.seedKey)?.subject;
      return otherSeed?.kind === "PRODUCT" && PRODUCTS[otherSeed.product].id === productId;
    })());
  return {
    id: row.id,
    type: row.type,
    createdAt: row.createdAt,
    read: row.readAt !== null,
    faded,
    mandatory: entry?.mandatory ?? false,
    subject,
    values: values(entry, tracked, now),
    awaitingAnswer: row.awaitingAnswer,
  };
}

function ownRow(controller: MockController, user: UserActor, id: string, now: Date): NotificationStateRow {
  const row = listed(controller, user, now).find((entry) => entry.id === id);
  if (!row) throw new MockApiError("NOT_FOUND");
  return row;
}

export function notificationHandlers(controller: MockController) {
  const { state } = controller;
  return [
    route(controller, "getNotifications", ({ actor, query, locale, now, empty }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const rows = empty ? [] : listed(controller, user, now);
      const all = rows.map((row) => itemOf(controller, user, row, rows, locale, now));
      const wanted = tokens(query.q ?? "");
      const base = all.filter((item) => (query.unread ? !item.read : true) && wanted.every((token) => fold(item.subject.kind === "PRODUCT" ? item.subject.product.name : "").includes(token)));
      const inCategory = (item: NotificationItem) => !query.category || (item.subject.kind === "PRODUCT" && item.subject.product.category.id === query.category);
      const inFilter = (item: NotificationItem, filter: NotificationFilter | undefined) => !filter || filter === "ALL" || notificationFilterOf(item.type) === filter;
      const forFilters = base.filter(inCategory);
      const filters = { ALL: forFilters.length, DEAL: 0, RETURN: 0, SEARCH: 0, OTHER: 0 };
      for (const item of forFilters) filters[notificationFilterOf(item.type)] += 1;
      const categories = new Map<string, { id: string; name: string; count: number }>();
      for (const item of base.filter((entry) => inFilter(entry, query.filter))) {
        if (item.subject.kind !== "PRODUCT") continue;
        const entry = categories.get(item.subject.product.category.id) ?? { ...item.subject.product.category, count: 0 };
        entry.count += 1;
        categories.set(entry.id, entry);
      }
      return {
        data: {
          items: base.filter((item) => inCategory(item) && inFilter(item, query.filter)),
          facets: { filters, categories: [...categories.values()], unread: all.filter((item) => !item.read).length },
        },
      };
    }),

    route(controller, "getUnreadCount", ({ actor, now, empty }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const unread = empty ? [] : listed(controller, user, now).filter((row) => row.readAt === null);
      return { data: { unread: unread.length, unreadDeal: unread.some((row) => row.type === "DEAL_FOUND") } };
    }),

    route(controller, "getForYou", ({ actor, locale, now, empty }) => {
      const user = userActor(actor);
      if (empty) return { data: { drops: [], searches: [], frequent: [] } };
      const trackedProducts = new Set(state.trackedItems.filter((row) => row.userId === user.userId && row.state === "ACTIVE").map((row) => row.productKey));
      const data: ForYou = {
        drops: (FOR_YOU_DROPS[user.userKey] ?? []).flatMap((entry) => {
          const tracked = trackedRow(controller, user, entry.trackingSeed);
          if (!tracked || tracked.state !== "ACTIVE") return [];
          const summary = productSummary(PRODUCTS[tracked.productKey], locale);
          return [{ trackedItemId: tracked.id, product: { id: summary.id, name: summary.name, imageSha256: summary.imageSha256 }, mode: tracked.mode, drop: money(entry.drop), dropPct: entry.dropPct, price: { amount: entry.price, currency: "TRY" as const }, at: ago(now, entry.minutesAgo) }];
        }),
        // Searches not tracked (hidden searches are left out by the history itself).
        searches: (FOR_YOU_SEARCHES[user.userKey] ?? [])
          .filter((entry) => !trackedProducts.has(entry.product))
          .map((entry) => {
            const summary = productSummary(PRODUCTS[entry.product], locale);
            return { query: pick(entry.query, locale), product: { id: summary.id, name: summary.name, imageSha256: summary.imageSha256 }, drop: money(entry.drop), dropPct: entry.dropPct, price: { amount: entry.price, currency: "TRY" as const }, checkedAt: ago(now, entry.checkedMinutesAgo) };
          }),
        frequent: (FREQUENT_SEARCHES[user.userKey] ?? []).map((entry) => pick(entry, locale)),
      };
      return { data };
    }),

    route(controller, "getDeliveryStatus", ({ actor, now }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const prefs = state.notificationPrefs.get(user.userId);
      const today = toCalendarDay(now);
      const todays = listed(controller, user, now).filter((row) => toCalendarDay(new Date(row.createdAt)) === today);
      const limit = SYSTEM_SETTINGS["notify.daily_cap"];
      const sentToday = NOTIFICATIONS_TODAY[user.userKey] ?? todays.length;
      const data: DeliveryStatus = {
        digest: { on: prefs?.delivery === "DIGEST", time: SYSTEM_SETTINGS["notify.digest_time"], pending: prefs?.delivery === "DIGEST" ? todays.filter((row) => row.readAt === null).length : 0 },
        cap: { limit, sentToday, deferred: Math.max(0, sentToday - limit) },
      };
      return { data };
    }),

    route(controller, "readAllNotifications", ({ actor, now, note }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const unread = listed(controller, user, now).filter((row) => row.readAt === null);
      for (const row of unread) row.readAt = iso(now);
      note({ metadata: { updated: unread.length } });
      return { data: { updated: unread.length } };
    }),

    route(controller, "getNotification", ({ actor, params, locale, now }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const rows = listed(controller, user, now);
      const row = ownRow(controller, user, params.id, now);
      const entry = seedOf(user, row.seedKey);
      const today = toCalendarDay(now);
      const history = entry?.history ? entry.history.map((amount, index) => ({ day: addCalendarDays(today, index - (entry.history?.length ?? 0) + 1), cheapest: { amount, currency: "TRY" as const } })) : null;
      const data: NotificationDetail = { ...itemOf(controller, user, row, rows, locale, now), history };
      return { data };
    }),

    route(controller, "readNotification", ({ actor, params, now, note }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const row = ownRow(controller, user, params.id, now);
      row.readAt ??= iso(now);
      note({ targetType: "notification", targetId: row.id, metadata: { type: row.type } });
      return { data: { id: row.id, read: true as const } };
    }),

    route(controller, "answerDeliveryPrompt", ({ actor, params, body, now, note }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const row = ownRow(controller, user, params.id, now);
      const subject = seedOf(user, row.seedKey)?.subject;
      const tracked = subject?.kind === "PRODUCT" ? trackedRow(controller, user, subject.trackingSeed) : undefined;
      if (row.type !== "DELIVERY_PROMPT" || !row.awaitingAnswer || !tracked || tracked.state !== "ACTIVE" || tracked.mode !== "BOUGHT" || !tracked.orderedOn) {
        throw new MockApiError("VALIDATION", { fields: { id: "errors.validation" } });
      }
      row.awaitingAnswer = false;
      row.readAt ??= iso(now);
      // Every ask of this item: the first one and the ones scheduled after "Henüz değil" (no extra column).
      const asked = state.notifications.filter((entry) => entry.userId === user.userId && entry.type === "DELIVERY_PROMPT" && entry.seedKey === row.seedKey).length;
      const max = SYSTEM_SETTINGS["notify.delivery_reask_max"];

      if (body.answer === "YES") {
        // Today is the delivery day; the return deadline starts from it (changeable on Product Detail).
        const today = toCalendarDay(now);
        const rule = tracked.platform ? PLATFORMS[tracked.platform].returnRule : null;
        const deadline = rule ? returnDeadline(tracked.orderedOn, rule, today).day : (tracked.returnDeadline ?? null);
        const index = state.trackedItems.indexOf(tracked);
        state.trackedItems[index] = { ...tracked, orderStatus: "DELIVERED", returnDeadline: deadline, returnDeadlineStatus: rule ? "CONFIRMED" : (tracked.returnDeadlineStatus ?? null) };
        note({ targetType: "tracked_item", targetId: tracked.id, metadata: { answer: "TODAY", source: "notification" } });
        return { data: { trackedItemId: tracked.id, deliveredOn: today, returnDeadline: deadline, nextAskAt: null, asksLeft: 0 } };
      }

      // "Henüz değil": asked again later, within the limit.
      const asksLeft = Math.max(0, max - asked);
      const nextAskAt = asksLeft > 0 ? iso(new Date(now.getTime() + SYSTEM_SETTINGS["notify.delivery_reask_days"] * MS_PER_DAY)) : null;
      if (nextAskAt) state.notifications.push({ id: newId(), userId: user.userId, type: "DELIVERY_PROMPT", createdAt: nextAskAt, readAt: null, seedKey: row.seedKey, trackedItemId: tracked.id, awaitingAnswer: true });
      note({ action: "notification.delivery_later", targetType: "tracked_item", targetId: tracked.id, metadata: { asksLeft, nextAskAt } });
      return { data: { trackedItemId: tracked.id, deliveredOn: null, returnDeadline: tracked.returnDeadline ?? null, nextAskAt, asksLeft } };
    }),
  ];
}
