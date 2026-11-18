// My Profile — the own profile page `/profil` (modules.md Profile and Following › Profilim in
// Phase 1; architecture.md §16 COMMUNITY; pagedesign.md §8.9a design v2.1; decisions 2026-11-18).
// Shapes and the own-profile endpoints are [ASSUMPTION — shape] until §16.1 writes them out.
// Rules carried by the shapes:
// - A person row carries only what that person shares with the viewer; null = not shared
//   (the client says so: "… paylaşmıyor"). No real name, e-mail or phone, ever.
// - A link submission never carries the link, the store or the seller (hidden-seller rule).
// - Sharing permissions are read-only here; changing them comes with Discover.
import { z } from "zod";
import { CategoryRef, Cursor, Id, ImageSha256, Money, Timestamp } from "./common";

export const PrivacyLevel = z.enum(["EVERYONE", "FOLLOWERS", "ONLY_ME"]);
export type PrivacyLevel = z.infer<typeof PrivacyLevel>;

/** Badges (database.md §8 `user_badges`): "Fırsat Avcısı" after at least one verified share [ASSUMPTION]. */
export const Badges = z.object({ dealHunter: z.boolean() });

// ── Profile header ───────────────────────────────────────────────────────────

/** `GET /me/profile` — the header of Profilim. `username` null = "Profilin hazır değil". */
export const MyProfile = z.object({
  username: z.string().min(1).nullable(),
  avatarSha256: ImageSha256.nullable(),
  /** From Ayarlar › Gizlilik (`users.privacy_level`). */
  privacyLevel: PrivacyLevel,
  badges: Badges,
  counts: z.object({
    followers: z.number().int().nonnegative(),
    following: z.number().int().nonnegative(),
    /** All ongoing tracking, Aldım + Almak istiyorum [DECIDED 2026-11-18]. */
    tracking: z.number().int().nonnegative(),
    verifiedShares: z.number().int().nonnegative(),
  }),
  /** Waiting follow requests ("Takip istekleri · N"). */
  pendingRequests: z.number().int().nonnegative(),
  memberSince: Timestamp,
});
export type MyProfile = z.infer<typeof MyProfile>;

/** `GET /me/community-consents` — read-only in "Neyi kim görüyor?"; all off by default (database.md §8). */
export const CommunityConsents = z.object({
  shareTracking: z.boolean(),
  shareDeals: z.boolean(),
  shareSavings: z.boolean(),
  /** A separate consent: the price paid is shown only when this one is given. */
  sharePaidPrice: z.boolean(),
  askedAt: Timestamp.nullable(),
});
export type CommunityConsents = z.infer<typeof CommunityConsents>;

// ── People ───────────────────────────────────────────────────────────────────

/**
 * Another person in the viewer's lists. `trackingCount` and `topCategory` come from what the
 * person shares with this viewer (consent + their visibility); null = not shared.
 */
export const PersonView = z.object({
  id: Id,
  username: z.string().min(1),
  avatarSha256: ImageSha256.nullable(),
  privacyLevel: PrivacyLevel,
  badges: Badges,
  trackingCount: z.number().int().nonnegative().nullable(),
  topCategory: CategoryRef.nullable(),
  verifiedShares: z.number().int().nonnegative(),
  /** The person follows the viewer (accepted). */
  followsYou: z.boolean(),
  /** The viewer's follow of this person. */
  youFollow: z.enum(["NONE", "ACCEPTED", "PENDING"]),
});
export type PersonView = z.infer<typeof PersonView>;

/** `GET /me/followers?q=` · `/me/following?q=` · search by username. */
export const PeopleQuery = z.object({ q: z.string().trim().max(40).optional(), cursor: Cursor.optional() });

export const FollowerItem = z.object({ person: PersonView, since: Timestamp });
export const Followers = z.object({ items: z.array(FollowerItem) });
export type Followers = z.infer<typeof Followers>;

/** PENDING = "İstek gönderildi · onay bekliyor" (a private profile has not answered yet). */
export const FollowingItem = z.object({ person: PersonView, status: z.enum(["ACCEPTED", "PENDING"]), since: Timestamp });
export const Following = z.object({ items: z.array(FollowingItem) });
export type Following = z.infer<typeof Following>;

/** `GET /me/follow-requests` — newest first. */
export const FollowRequestItem = z.object({ person: PersonView, requestedAt: Timestamp });
export const FollowRequests = z.object({ items: z.array(FollowRequestItem) });
export type FollowRequests = z.infer<typeof FollowRequests>;

/** `:userId` of the other person in follow endpoints. */
export const UserParams = z.object({ userId: Id });

/**
 * The relation after a follow call. Approve/decline answer for the requester (`follower`); unfollow,
 * withdraw and their "Geri al" answer for the viewer's own follow (`following`).
 */
export const FollowChange = z.object({
  userId: Id,
  follower: z.enum(["NONE", "ACCEPTED", "PENDING"]),
  following: z.enum(["NONE", "ACCEPTED", "PENDING"]),
});
export type FollowChange = z.infer<typeof FollowChange>;

// ── Paylaştığım fırsatlar ────────────────────────────────────────────────────

export const LinkSubmissionStatus = z.enum(["PENDING", "VERIFIED", "REJECTED"]);
/** Why a link was not published (modules.md Discover › Link sharing flow). */
export const LinkRejectReason = z.enum(["NOT_CHEAPER", "DIFFERENT_MODEL", "OUT_OF_STOCK", "SECOND_HAND"]);

/**
 * One own link submission (`link_submissions`). Never the link, the store or the seller: a verified
 * one is published as a hidden-seller offer. The price always comes with its check time.
 */
export const LinkSubmissionView = z.object({
  id: Id,
  product: z.object({ id: Id, name: z.string().min(1), imageSha256: ImageSha256.nullable(), category: CategoryRef }),
  price: Money,
  checkedAt: Timestamp,
  submittedAt: Timestamp,
  status: LinkSubmissionStatus,
  /** VERIFIED: tokens earned ("+1 jeton"). */
  rewardTokens: z.number().int().nonnegative().nullable(),
  /** VERIFIED: how much below the earlier cheapest price. */
  savingVsPrevious: Money.nullable(),
  rejectReason: LinkRejectReason.nullable(),
  /** NOT_CHEAPER: the cheapest price now. */
  cheapestPrice: Money.nullable(),
  /** DIFFERENT_MODEL: the catalogue product the link turned out to be. */
  otherProductName: z.string().min(1).nullable(),
});
export type LinkSubmissionView = z.infer<typeof LinkSubmissionView>;

/** `GET /me/link-submissions?q=&category=` — search by product or category; category counts after `q`. */
export const LinkSubmissionsQuery = z.object({ q: z.string().trim().max(80).optional(), category: Id.optional(), cursor: Cursor.optional() });
export const LinkSubmissions = z.object({
  items: z.array(LinkSubmissionView),
  facets: z.object({ total: z.number().int().nonnegative(), categories: z.array(z.object({ id: Id, name: z.string().min(1), count: z.number().int().nonnegative() })) }),
});
export type LinkSubmissions = z.infer<typeof LinkSubmissions>;
