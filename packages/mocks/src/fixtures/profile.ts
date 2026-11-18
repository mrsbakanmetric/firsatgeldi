// Profilim fixtures (design "13 Keşfet ve Profil" v2.1 Me + MeStates): other people, who follows
// whom, follow requests, a block and the own link submissions. Made-up usernames only; no real
// name, e-mail or phone. Shares never hold a link, store or seller (hidden-seller rule).
import { uuidFor } from "../ids";
import type { CATEGORIES, PRODUCTS } from "./catalog";
import type { UserKey } from "./users";

const MINUTE = 1;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export interface PersonFixture {
  readonly key: string;
  readonly id: string;
  readonly username: string;
  readonly privacyLevel: "EVERYONE" | "FOLLOWERS" | "ONLY_ME";
  /** Community consents of this person: what they share at all (their visibility still applies). */
  readonly sharesTracking: boolean;
  readonly trackingCount: number;
  readonly topCategory: keyof typeof CATEGORIES | null;
  readonly verifiedShares: number;
}

function person(username: string, values: Omit<PersonFixture, "key" | "id" | "username">): PersonFixture {
  return { key: username, id: uuidFor(`person:${username}`), username, ...values };
}

export const PEOPLE = {
  ayse: person("ayse_d", { privacyLevel: "FOLLOWERS", sharesTracking: true, trackingCount: 14, topCategory: "actionCamera", verifiedShares: 3 }),
  emre: person("emre.y", { privacyLevel: "EVERYONE", sharesTracking: true, trackingCount: 12, topCategory: null, verifiedShares: 0 }),
  mert: person("mert_k", { privacyLevel: "EVERYONE", sharesTracking: true, trackingCount: 7, topCategory: "overEarHeadphones", verifiedShares: 0 }),
  selin: person("selin.k", { privacyLevel: "ONLY_ME", sharesTracking: true, trackingCount: 41, topCategory: null, verifiedShares: 0 }),
  burak: person("burak_t", { privacyLevel: "EVERYONE", sharesTracking: true, trackingCount: 32, topCategory: "smartwatch", verifiedShares: 0 }),
  nil: person("nil.a", { privacyLevel: "EVERYONE", sharesTracking: false, trackingCount: 5, topCategory: null, verifiedShares: 9 }),
  /** Blocked by the user: never in any list, whatever the follow rows say. */
  spam: person("firsat.reklam", { privacyLevel: "EVERYONE", sharesTracking: true, trackingCount: 90, topCategory: null, verifiedShares: 0 }),
} as const satisfies Record<string, PersonFixture>;

export type PersonKey = keyof typeof PEOPLE;

/** Follow rows per signed-in user, created on first use. Minutes since the row was made. */
export const FOLLOW_SEEDS: Partial<
  Record<UserKey, { followers: readonly { person: PersonKey; status: "ACCEPTED" | "PENDING"; minutesAgo: number }[]; following: readonly { person: PersonKey; status: "ACCEPTED" | "PENDING"; minutesAgo: number }[]; blocked: readonly PersonKey[] }>
> = {
  user: {
    followers: [
      { person: "ayse", status: "ACCEPTED", minutesAgo: 20 * DAY },
      { person: "emre", status: "ACCEPTED", minutesAgo: 9 * DAY },
      { person: "mert", status: "ACCEPTED", minutesAgo: 3 * DAY },
      { person: "burak", status: "PENDING", minutesAgo: 5 * HOUR },
      { person: "nil", status: "PENDING", minutesAgo: 2 * DAY },
      { person: "spam", status: "PENDING", minutesAgo: 30 * MINUTE },
    ],
    following: [
      { person: "ayse", status: "ACCEPTED", minutesAgo: 19 * DAY },
      { person: "mert", status: "ACCEPTED", minutesAgo: 12 * DAY },
      { person: "selin", status: "PENDING", minutesAgo: 1 * DAY },
      { person: "emre", status: "ACCEPTED", minutesAgo: 6 * DAY },
    ],
    blocked: ["spam"],
  },
  manager: {
    followers: [{ person: "emre", status: "ACCEPTED", minutesAgo: 30 * DAY }],
    following: [],
    blocked: [],
  },
};

/** Days since the account was created ("Ekim 2026'dan beri üye"). */
export const MEMBER_SINCE_DAYS: Record<UserKey, number> = { user: 46, secondUser: 20, newUser: 0, manager: 80 };

export interface LinkSubmissionFixture {
  readonly id: string;
  readonly product: keyof typeof PRODUCTS;
  readonly status: "PENDING" | "VERIFIED" | "REJECTED";
  /** Price on the link, kuruş; checked `checkedMinutesAgo` minutes ago. */
  readonly price: number;
  readonly checkedMinutesAgo: number;
  readonly submittedMinutesAgo: number;
  readonly rewardTokens: number | null;
  readonly savingVsPrevious: number | null;
  readonly rejectReason: "NOT_CHEAPER" | "DIFFERENT_MODEL" | "OUT_OF_STOCK" | "SECOND_HAND" | null;
  readonly cheapestPrice: number | null;
  readonly otherProduct: keyof typeof PRODUCTS | null;
}

function share(key: string, values: Omit<LinkSubmissionFixture, "id">): LinkSubmissionFixture {
  return { id: uuidFor(`link-submission:${key}`), ...values };
}

/** "Paylaştığım fırsatlar" (sample shares until Discover [DECIDED 2026-11-18]): one of each status. */
export const LINK_SUBMISSION_SEEDS: Partial<Record<UserKey, readonly LinkSubmissionFixture[]>> = {
  user: [
    share("user:ace-pro-2", { product: "acePro2Standard", status: "VERIFIED", price: 2_549_900, checkedMinutesAgo: 1 * HOUR, submittedMinutesAgo: 2 * HOUR, rewardTokens: 1, savingVsPrevious: 49_800, rejectReason: null, cheapestPrice: null, otherProduct: null }),
    share("user:wh-1000xm5", { product: "wh1000xm5", status: "PENDING", price: 1_099_900, checkedMinutesAgo: 20 * MINUTE, submittedMinutesAgo: 20 * MINUTE, rewardTokens: null, savingVsPrevious: null, rejectReason: null, cheapestPrice: null, otherProduct: null }),
    share("user:airfryer", { product: "airfryerXxl", status: "REJECTED", price: 819_900, checkedMinutesAgo: 1 * DAY, submittedMinutesAgo: 1 * DAY, rewardTokens: null, savingVsPrevious: null, rejectReason: "NOT_CHEAPER", cheapestPrice: 799_900, otherProduct: null }),
    share("user:hero-13", { product: "goProHero13", status: "REJECTED", price: 1_499_900, checkedMinutesAgo: 3 * DAY, submittedMinutesAgo: 3 * DAY, rewardTokens: null, savingVsPrevious: null, rejectReason: "DIFFERENT_MODEL", cheapestPrice: null, otherProduct: "goProHero12" }),
  ],
};
