// Profilim — the own profile page (modules.md Profile and Following › Profilim in Phase 1;
// architecture.md §16 COMMUNITY; decisions 2026-11-18). Per-user follow rows are created on first
// use from the fixtures. Rules:
// - A blocked person (either way) is in no list and no count, and cannot be approved.
// - A person row carries only what that person shares with this viewer (consent + visibility).
// - Approving a request writes the requester's in-app FOLLOW_ACCEPTED notification; declining,
//   removing a follower, unfollowing and withdrawing notify no one.
// - "Geri al" restores a removed row as it was, only within `community.follow_undo_minutes`.
// - Link submissions never carry the link, the store or the seller.
import type { CommunityConsents, FollowChange, LinkSubmissionView, MyProfile, PersonView } from "@firsatgeldi/contracts";
import { CATEGORIES, PRODUCTS } from "../fixtures/catalog";
import { FOLLOW_SEEDS, LINK_SUBMISSION_SEEDS, MEMBER_SINCE_DAYS, PEOPLE, type PersonFixture } from "../fixtures/profile";
import { pick } from "../fixtures/text";
import { newId } from "../ids";
import { MockApiError, route } from "../route";
import { SYSTEM_SETTINGS } from "../settings";
import type { Actor, FollowRow, MockController } from "../state";
import { productSummary } from "../views";
import { activeTrackingCount, fold, profileOf, tokens } from "./shared";

type UserActor = Extract<Actor, { kind: "user" }>;
type Relation = FollowChange["follower"];

const MS_PER_MINUTE = 60_000;
const iso = (date: Date) => date.toISOString();
const ago = (now: Date, minutes: number) => iso(new Date(now.getTime() - minutes * MS_PER_MINUTE));
const PEOPLE_BY_ID = new Map<string, PersonFixture>(Object.values(PEOPLE).map((person) => [person.id, person]));

/** Sharing permissions stay at their defaults in this step: all off (changing them comes with Discover). */
const DEFAULT_CONSENTS: CommunityConsents = { shareTracking: false, shareDeals: false, shareSavings: false, sharePaidPrice: false, askedAt: null };

function userActor(actor: Actor): UserActor {
  if (actor.kind !== "user") throw new MockApiError("UNAUTHENTICATED");
  return actor;
}

/** Creates the user's follow and block rows from the fixtures, once. */
function seed(controller: MockController, user: UserActor, now: Date): void {
  const { state } = controller;
  if (state.profileSeeded.has(user.userId)) return;
  state.profileSeeded.add(user.userId);
  const seeds = FOLLOW_SEEDS[user.userKey];
  if (!seeds) return;
  for (const row of seeds.followers) state.follows.push({ followerId: PEOPLE[row.person].id, followeeId: user.userId, status: row.status, createdAt: ago(now, row.minutesAgo) });
  for (const row of seeds.following) state.follows.push({ followerId: user.userId, followeeId: PEOPLE[row.person].id, status: row.status, createdAt: ago(now, row.minutesAgo) });
  for (const key of seeds.blocked) state.blocks.push({ blockerId: user.userId, blockedId: PEOPLE[key].id });
}

function blocked(controller: MockController, userId: string, otherId: string): boolean {
  return controller.state.blocks.some((row) => (row.blockerId === userId && row.blockedId === otherId) || (row.blockerId === otherId && row.blockedId === userId));
}

function rowOf(controller: MockController, followerId: string, followeeId: string): FollowRow | undefined {
  return controller.state.follows.find((row) => row.followerId === followerId && row.followeeId === followeeId);
}

function relation(controller: MockController, followerId: string, followeeId: string): Relation {
  return rowOf(controller, followerId, followeeId)?.status ?? "NONE";
}

function change(controller: MockController, userId: string, otherId: string): FollowChange {
  return { userId: otherId, follower: relation(controller, otherId, userId), following: relation(controller, userId, otherId) };
}

/** The people in the user's rows: known, not blocked either way. */
function visiblePerson(controller: MockController, userId: string, otherId: string): PersonFixture | null {
  const person = PEOPLE_BY_ID.get(otherId);
  return person && !blocked(controller, userId, otherId) ? person : null;
}

/** What `person` shows this viewer: shared at all, and their visibility lets the viewer see it. */
function personView(controller: MockController, viewerId: string, person: PersonFixture, locale: "tr" | "en"): PersonView {
  const youFollow = relation(controller, viewerId, person.id);
  const canSee = person.privacyLevel === "EVERYONE" || (person.privacyLevel === "FOLLOWERS" && youFollow === "ACCEPTED");
  const shares = person.sharesTracking && canSee;
  const category = shares && person.topCategory ? CATEGORIES[person.topCategory] : null;
  return {
    id: person.id,
    username: person.username,
    avatarSha256: null,
    privacyLevel: person.privacyLevel,
    badges: { dealHunter: person.verifiedShares > 0 },
    trackingCount: shares ? person.trackingCount : null,
    topCategory: category ? { id: category.id, name: pick(category.name, locale) } : null,
    verifiedShares: person.verifiedShares,
    followsYou: relation(controller, person.id, viewerId) === "ACCEPTED",
    youFollow,
  };
}

const newestFirst = (a: { createdAt: string }, b: { createdAt: string }) => b.createdAt.localeCompare(a.createdAt);
const byUsername = (q: string | undefined) => {
  const wanted = tokens(q ?? "");
  return (person: PersonFixture) => wanted.every((token) => fold(person.username).includes(token));
};

function followersOf(controller: MockController, userId: string) {
  return controller.state.follows
    .filter((row) => row.followeeId === userId && row.status === "ACCEPTED")
    .flatMap((row) => {
      const person = visiblePerson(controller, userId, row.followerId);
      return person ? [{ row, person }] : [];
    })
    .sort((a, b) => newestFirst(a.row, b.row));
}

function followingOf(controller: MockController, userId: string) {
  return controller.state.follows
    .filter((row) => row.followerId === userId)
    .flatMap((row) => {
      const person = visiblePerson(controller, userId, row.followeeId);
      return person ? [{ row, person }] : [];
    })
    .sort((a, b) => newestFirst(a.row, b.row));
}

function requestsOf(controller: MockController, userId: string) {
  return controller.state.follows
    .filter((row) => row.followeeId === userId && row.status === "PENDING")
    .flatMap((row) => {
      const person = visiblePerson(controller, userId, row.followerId);
      return person ? [{ row, person }] : [];
    })
    .sort((a, b) => newestFirst(a.row, b.row));
}

function submissionsOf(user: UserActor, locale: "tr" | "en", now: Date): LinkSubmissionView[] {
  const money = (amount: number | null) => (amount === null ? null : { amount, currency: "TRY" as const });
  return (LINK_SUBMISSION_SEEDS[user.userKey] ?? []).map((seed) => {
    const summary = productSummary(PRODUCTS[seed.product], locale);
    return {
      id: seed.id,
      product: { id: summary.id, name: summary.name, imageSha256: summary.imageSha256, category: summary.category },
      price: { amount: seed.price, currency: "TRY" as const },
      checkedAt: ago(now, seed.checkedMinutesAgo),
      submittedAt: ago(now, seed.submittedMinutesAgo),
      status: seed.status,
      rewardTokens: seed.rewardTokens,
      savingVsPrevious: money(seed.savingVsPrevious),
      rejectReason: seed.rejectReason,
      cheapestPrice: money(seed.cheapestPrice),
      otherProductName: seed.otherProduct ? pick(PRODUCTS[seed.otherProduct].name, locale) : null,
    };
  });
}

/** Removes a row and keeps it for "Geri al". */
function removeRow(controller: MockController, row: FollowRow, userId: string, now: Date): void {
  const { state } = controller;
  state.follows.splice(state.follows.indexOf(row), 1);
  state.removedFollows.push({ row, removedBy: userId, removedAt: iso(now) });
}

/** Puts a row removed by this user back as it was, within the undo window; otherwise NOT_FOUND. */
function restoreRow(controller: MockController, userId: string, followerId: string, followeeId: string, now: Date): void {
  const { state } = controller;
  const windowMs = SYSTEM_SETTINGS["community.follow_undo_minutes"] * MS_PER_MINUTE;
  const index = state.removedFollows.findIndex(
    (entry) => entry.removedBy === userId && entry.row.followerId === followerId && entry.row.followeeId === followeeId && now.getTime() - Date.parse(entry.removedAt) <= windowMs,
  );
  const entry = state.removedFollows[index];
  if (!entry || rowOf(controller, followerId, followeeId) || blocked(controller, followerId, followeeId)) throw new MockApiError("NOT_FOUND");
  state.removedFollows.splice(index, 1);
  state.follows.push(entry.row);
}

export function profileHandlers(controller: MockController) {
  const { state } = controller;
  return [
    route(controller, "getMyProfile", ({ actor, now }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const profile = profileOf(controller, user);
      const verifiedShares = (LINK_SUBMISSION_SEEDS[user.userKey] ?? []).filter((row) => row.status === "VERIFIED").length;
      const data: MyProfile = {
        username: profile.username,
        avatarSha256: profile.avatarSha256,
        privacyLevel: profile.privacyLevel,
        badges: { dealHunter: verifiedShares > 0 },
        counts: {
          followers: followersOf(controller, user.userId).length,
          following: followingOf(controller, user.userId).filter((entry) => entry.row.status === "ACCEPTED").length,
          tracking: activeTrackingCount(controller, user.userId),
          verifiedShares,
        },
        pendingRequests: requestsOf(controller, user.userId).length,
        memberSince: ago(now, MEMBER_SINCE_DAYS[user.userKey] * 24 * 60),
      };
      return { data };
    }),

    route(controller, "getFollowers", ({ actor, query, locale, now, empty }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const rows = empty ? [] : followersOf(controller, user.userId).filter((entry) => byUsername(query.q)(entry.person));
      return { data: { items: rows.map(({ row, person }) => ({ person: personView(controller, user.userId, person, locale), since: row.createdAt })) } };
    }),

    route(controller, "getFollowing", ({ actor, query, locale, now, empty }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const rows = empty ? [] : followingOf(controller, user.userId).filter((entry) => byUsername(query.q)(entry.person));
      return { data: { items: rows.map(({ row, person }) => ({ person: personView(controller, user.userId, person, locale), status: row.status, since: row.createdAt })) } };
    }),

    route(controller, "getFollowRequests", ({ actor, locale, now, empty }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const rows = empty ? [] : requestsOf(controller, user.userId);
      return { data: { items: rows.map(({ row, person }) => ({ person: personView(controller, user.userId, person, locale), requestedAt: row.createdAt })) } };
    }),

    route(controller, "approveFollow", ({ actor, params, now, note }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const row = rowOf(controller, params.userId, user.userId);
      if (!row || row.status !== "PENDING" || !visiblePerson(controller, user.userId, params.userId)) throw new MockApiError("NOT_FOUND");
      row.status = "ACCEPTED";
      // The requester learns it in the app; nothing else is sent [DECIDED 2026-11-18].
      state.notifications.push({ id: newId(), userId: params.userId, type: "FOLLOW_ACCEPTED", actorId: user.userId, createdAt: iso(now) });
      note({ targetType: "user", targetId: params.userId });
      return { data: change(controller, user.userId, params.userId) };
    }),

    route(controller, "declineFollow", ({ actor, params, now, note }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const row = rowOf(controller, params.userId, user.userId);
      if (!row || row.status !== "PENDING" || !visiblePerson(controller, user.userId, params.userId)) throw new MockApiError("NOT_FOUND");
      state.follows.splice(state.follows.indexOf(row), 1);
      note({ targetType: "user", targetId: params.userId });
      return { data: change(controller, user.userId, params.userId) };
    }),

    route(controller, "unfollow", ({ actor, params, now, note }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const row = rowOf(controller, user.userId, params.userId);
      if (!row) throw new MockApiError("NOT_FOUND");
      removeRow(controller, row, user.userId, now);
      note({ targetType: "user", targetId: params.userId, metadata: { previous: row.status } });
      return { data: change(controller, user.userId, params.userId) };
    }),

    route(controller, "restoreFollow", ({ actor, params, now, note }) => {
      const user = userActor(actor);
      restoreRow(controller, user.userId, user.userId, params.userId, now);
      note({ targetType: "user", targetId: params.userId });
      return { data: change(controller, user.userId, params.userId) };
    }),

    route(controller, "removeFollower", ({ actor, params, now, note }) => {
      const user = userActor(actor);
      seed(controller, user, now);
      const row = rowOf(controller, params.userId, user.userId);
      if (!row || row.status !== "ACCEPTED") throw new MockApiError("NOT_FOUND");
      removeRow(controller, row, user.userId, now);
      note({ targetType: "user", targetId: params.userId });
      return { data: change(controller, user.userId, params.userId) };
    }),

    route(controller, "restoreFollower", ({ actor, params, now, note }) => {
      const user = userActor(actor);
      restoreRow(controller, user.userId, params.userId, user.userId, now);
      note({ targetType: "user", targetId: params.userId });
      return { data: change(controller, user.userId, params.userId) };
    }),

    route(controller, "getMyLinkSubmissions", ({ actor, query, locale, now, empty }) => {
      const user = userActor(actor);
      const all = empty ? [] : submissionsOf(user, locale, now);
      const wanted = tokens(query.q ?? "");
      const matched = all.filter((row) => wanted.every((token) => fold(`${row.product.name} ${row.product.category.name}`).includes(token)));
      const counts = new Map<string, { id: string; name: string; count: number }>();
      for (const row of matched) {
        const entry = counts.get(row.product.category.id) ?? { ...row.product.category, count: 0 };
        entry.count += 1;
        counts.set(entry.id, entry);
      }
      const items = query.category ? matched.filter((row) => row.product.category.id === query.category) : matched;
      return { data: { items, facets: { total: matched.length, categories: [...counts.values()] } } };
    }),

    route(controller, "getCommunityConsents", ({ actor }) => {
      userActor(actor);
      return { data: DEFAULT_CONSENTS };
    }),
  ];
}
