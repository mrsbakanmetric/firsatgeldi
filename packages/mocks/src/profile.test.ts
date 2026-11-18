// Profilim on the mock API (step 21a PR 1): the header, the people lists, follow requests and
// their notification, "Geri al" within its window, blocks, data isolation between users, what
// other people share, the hidden-seller rule on own shares, and the activity row of every write.
import { ApiError, type ApiErrorBody } from "@firsatgeldi/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PLATFORMS, SELLERS } from "./fixtures/market";
import { PEOPLE } from "./fixtures/profile";
import { USERS } from "./fixtures/users";
import { SYSTEM_SETTINGS } from "./settings";
import { createTestApi } from "./test/harness";

const t = createTestApi({ seedTracking: true });
const { api, controller } = t;
const MINUTE_MS = 60_000;

beforeAll(() => t.server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  t.signInAs("user");
  t.resetClock();
  const { state } = controller;
  state.follows.length = 0;
  state.blocks.length = 0;
  state.profileSeeded.clear();
  state.removedFollows.length = 0;
  state.notifications.length = 0;
});
afterAll(() => t.server.close());

async function failure(promise: Promise<unknown>): Promise<ApiErrorBody> {
  const error = await promise.then(() => undefined, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return (error as ApiError).body as ApiErrorBody;
}
const last = () => controller.state.activity.at(-1);
const usernames = (items: readonly { person: { username: string } }[]) => items.map((item) => item.person.username);

describe("Profilim header (GET /me/profile)", () => {
  it("username, visibility from Settings, the four counts, badge, waiting requests, member since", async () => {
    const { data } = await api.call("getMyProfile", {});
    expect(data.username).toBe(USERS.user.username);
    expect(data.privacyLevel).toBe("ONLY_ME");
    // Followers: ayse, emre, mert (the blocked person never counts); following: accepted only.
    expect(data.counts.followers).toBe(3);
    expect(data.counts.following).toBe(3);
    expect(data.counts.tracking).toBe(controller.state.trackedItems.filter((row) => row.userId === USERS.user.id && row.state === "ACTIVE").length);
    expect(data.counts.verifiedShares).toBe(1);
    expect(data.badges.dealHunter).toBe(true);
    expect(data.pendingRequests).toBe(2);
    expect(Date.parse(data.memberSince)).toBeLessThan(Date.now());
  });

  it("follows the visibility chosen in Ayarlar › Gizlilik", async () => {
    await api.call("updateMe", { body: { privacyLevel: "FOLLOWERS" } });
    expect((await api.call("getMyProfile", {})).data.privacyLevel).toBe("FOLLOWERS");
    await api.call("updateMe", { body: { privacyLevel: "ONLY_ME" } });
  });

  it("a new account: no username yet, nothing to count, no badge", async () => {
    t.signInAs("newUser");
    const { data } = await api.call("getMyProfile", {});
    expect(data.username).toBeNull();
    expect(data.counts).toEqual({ followers: 0, following: 0, tracking: 0, verifiedShares: 0 });
    expect(data.badges.dealHunter).toBe(false);
  });

  it("sharing permissions are read: all off by default", async () => {
    expect((await api.call("getCommunityConsents", {})).data).toEqual({ shareTracking: false, shareDeals: false, shareSavings: false, sharePaidPrice: false, askedAt: null });
  });

  it("guests are asked to sign in", async () => {
    t.signInAs("guest");
    expect((await failure(api.call("getMyProfile", {}))).code).toBe("UNAUTHENTICATED");
    expect((await failure(api.call("getFollowers", { query: {} }))).code).toBe("UNAUTHENTICATED");
  });
});

describe("people lists", () => {
  it("followers newest first; searchable by username; the blocked person is never there", async () => {
    const { data } = await api.call("getFollowers", { query: {} });
    expect(usernames(data.items)).toEqual(["mert_k", "emre.y", "ayse_d"]);
    expect(JSON.stringify(data)).not.toContain(PEOPLE.spam.username);
    expect(usernames((await api.call("getFollowers", { query: { q: "AYSE" } })).data.items)).toEqual(["ayse_d"]);
  });

  it("following shows accepted follows and the request still waiting", async () => {
    const { data } = await api.call("getFollowing", { query: {} });
    expect(data.items.map((item) => [item.person.username, item.status])).toEqual([
      ["selin.k", "PENDING"],
      ["emre.y", "ACCEPTED"],
      ["mert_k", "ACCEPTED"],
      ["ayse_d", "ACCEPTED"],
    ]);
  });

  it("a row carries only what the person shares with this viewer", async () => {
    const people = new Map((await api.call("getFollowing", { query: {} })).data.items.map((item) => [item.person.username, item.person]));
    // Followers-only profile the user follows: visible.
    expect(people.get("ayse_d")?.trackingCount).toBe(PEOPLE.ayse.trackingCount);
    // Only-me profile, request pending: nothing shared.
    expect(people.get("selin.k")).toMatchObject({ trackingCount: null, topCategory: null, youFollow: "PENDING" });
    const requests = new Map((await api.call("getFollowRequests", {})).data.items.map((item) => [item.person.username, item.person]));
    // Public profile without the tracking consent: not shared.
    expect(requests.get("nil.a")).toMatchObject({ trackingCount: null, badges: { dealHunter: true }, verifiedShares: 9 });
    for (const person of [...people.values(), ...requests.values()]) expect(Object.keys(person).sort()).toEqual(["avatarSha256", "badges", "followsYou", "id", "privacyLevel", "topCategory", "trackingCount", "username", "verifiedShares", "youFollow"]);
  });

  it("another user sees only their own lists", async () => {
    await api.call("getFollowers", { query: {} });
    t.signInAs("secondUser");
    expect((await api.call("getFollowers", { query: {} })).data.items).toEqual([]);
    expect((await api.call("getFollowing", { query: {} })).data.items).toEqual([]);
    expect((await api.call("getFollowRequests", {})).data.items).toEqual([]);
    expect((await api.call("getMyLinkSubmissions", { query: {} })).data.items).toEqual([]);
    // Nor can they act on the user's rows.
    expect((await failure(api.call("approveFollow", { params: { userId: PEOPLE.burak.id } }))).code).toBe("NOT_FOUND");
  });
});

describe("follow requests", () => {
  it("\"Onayla\": the requester becomes a follower and gets the in-app notification; logged", async () => {
    const { data } = await api.call("approveFollow", { params: { userId: PEOPLE.burak.id } });
    expect(data).toEqual({ userId: PEOPLE.burak.id, follower: "ACCEPTED", following: "NONE" });
    expect(last()).toMatchObject({ action: "follow.approve", targetType: "user", targetId: PEOPLE.burak.id, outcome: "OK" });
    expect(controller.state.notifications).toEqual([expect.objectContaining({ userId: PEOPLE.burak.id, type: "FOLLOW_ACCEPTED", actorId: USERS.user.id })]);
    expect(usernames((await api.call("getFollowers", { query: {} })).data.items)).toContain("burak_t");
    expect((await api.call("getMyProfile", {})).data.pendingRequests).toBe(1);
  });

  it("\"Reddet\": the request goes away, silently; logged", async () => {
    await api.call("declineFollow", { params: { userId: PEOPLE.nil.id } });
    expect(last()).toMatchObject({ action: "follow.decline", targetId: PEOPLE.nil.id });
    expect(controller.state.notifications).toEqual([]);
    expect(usernames((await api.call("getFollowRequests", {})).data.items)).toEqual(["burak_t"]);
  });

  it("a blocked person's request cannot be approved", async () => {
    expect((await failure(api.call("approveFollow", { params: { userId: PEOPLE.spam.id } }))).code).toBe("NOT_FOUND");
    expect(usernames((await api.call("getFollowRequests", {})).data.items)).not.toContain(PEOPLE.spam.username);
  });
});

describe("remove, unfollow, withdraw and \"Geri al\"", () => {
  it("\"Takipten çıkar\" removes a follower silently; \"Geri al\" brings them back; both logged", async () => {
    const removed = (await api.call("removeFollower", { params: { userId: PEOPLE.emre.id } })).data;
    expect(removed.follower).toBe("NONE");
    expect(last()).toMatchObject({ action: "follower.remove", targetId: PEOPLE.emre.id });
    expect(controller.state.notifications).toEqual([]);
    expect(usernames((await api.call("getFollowers", { query: {} })).data.items)).not.toContain("emre.y");
    const restored = (await api.call("restoreFollower", { params: { userId: PEOPLE.emre.id } })).data;
    expect(restored.follower).toBe("ACCEPTED");
    expect(last()).toMatchObject({ action: "follower.restore" });
  });

  it("\"Takipten çık\" and \"İsteği geri al\": \"Geri al\" restores each as it was", async () => {
    expect((await api.call("unfollow", { params: { userId: PEOPLE.ayse.id } })).data.following).toBe("NONE");
    expect(last()).toMatchObject({ action: "follow.delete", metadata: { previous: "ACCEPTED" } });
    expect((await api.call("unfollow", { params: { userId: PEOPLE.selin.id } })).data.following).toBe("NONE");
    expect(last()).toMatchObject({ action: "follow.delete", metadata: { previous: "PENDING" } });
    // An accepted follow of a followers-only profile comes back accepted, not as a new request.
    expect((await api.call("restoreFollow", { params: { userId: PEOPLE.ayse.id } })).data.following).toBe("ACCEPTED");
    expect((await api.call("restoreFollow", { params: { userId: PEOPLE.selin.id } })).data.following).toBe("PENDING");
    expect(last()).toMatchObject({ action: "follow.restore" });
  });

  it("\"Geri al\" works only within the window and only for what this user removed", async () => {
    await api.call("removeFollower", { params: { userId: PEOPLE.mert.id } });
    t.advanceClock((SYSTEM_SETTINGS["community.follow_undo_minutes"] + 1) * MINUTE_MS);
    expect((await failure(api.call("restoreFollower", { params: { userId: PEOPLE.mert.id } }))).code).toBe("NOT_FOUND");
    // Nothing removed → nothing to restore (cannot force a follow of a private profile).
    expect((await failure(api.call("restoreFollow", { params: { userId: PEOPLE.burak.id } }))).code).toBe("NOT_FOUND");
  });
});

describe("Paylaştığım fırsatlar (GET /me/link-submissions)", () => {
  it("one of each status with its details; every price has its check time; category counts after the search", async () => {
    const { data } = await api.call("getMyLinkSubmissions", { query: {} });
    expect(data.items.map((item) => item.status)).toEqual(["VERIFIED", "PENDING", "REJECTED", "REJECTED"]);
    expect(data.items[0]).toMatchObject({ rewardTokens: 1, savingVsPrevious: { amount: 49_800 } });
    expect(data.items[2]).toMatchObject({ rejectReason: "NOT_CHEAPER", cheapestPrice: { amount: 799_900 } });
    expect(data.items[3]).toMatchObject({ rejectReason: "DIFFERENT_MODEL", otherProductName: "GoPro Hero 12 Black" });
    for (const item of data.items) expect(Date.parse(item.checkedAt)).toBeLessThanOrEqual(Date.now());
    expect(data.facets.total).toBe(4);
    const filtered = (await api.call("getMyLinkSubmissions", { query: { q: "airfryer" } })).data;
    expect(filtered.items).toHaveLength(1);
    expect(filtered.facets.categories).toEqual([expect.objectContaining({ count: 1 })]);
    const category = data.items[0]?.product.category.id ?? "";
    expect((await api.call("getMyLinkSubmissions", { query: { category } })).data.items.every((item) => item.product.category.id === category)).toBe(true);
  });

  it("never carries a link, a store or a seller (hidden-seller rule)", async () => {
    for (const locale of ["tr", "en"] as const) {
      t.useLocale(locale);
      const text = JSON.stringify((await api.call("getMyLinkSubmissions", { query: {} })).data);
      expect(text).not.toMatch(/https?:\/\//);
      for (const seller of Object.values(SELLERS)) expect(text).not.toContain(seller.name);
      for (const platform of Object.values(PLATFORMS)) for (const secret of [platform.name, platform.domain]) expect(text).not.toContain(secret);
    }
    t.useLocale("tr");
  });
});

describe("the \"empty\" scenario", () => {
  it("lists come back empty", async () => {
    controller.config = { ...controller.config, scenario: "empty" };
    expect((await api.call("getFollowers", { query: {} })).data.items).toEqual([]);
    expect((await api.call("getFollowing", { query: {} })).data.items).toEqual([]);
    expect((await api.call("getFollowRequests", {})).data.items).toEqual([]);
    expect((await api.call("getMyLinkSubmissions", { query: {} })).data.items).toEqual([]);
    controller.config = { ...controller.config, scenario: "success" };
  });
});
