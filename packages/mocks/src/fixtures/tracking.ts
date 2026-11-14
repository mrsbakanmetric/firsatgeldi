// Tracked items of the signed-in fixture user, as drawn in design "4 Takip Ettiklerim"
// (Main: four active rows + one ended row; States: stale row, allowance short).
// Dates are relative to "now" (implementation_plan.md §5 rule 6). The 14-day series
// are the drawn ones; their last value is the cheapest current offer in `market.ts`.
import { addCalendarDays, toCalendarDay } from "@firsatgeldi/core";
import { newId } from "../ids";
import type { MockState, TrackedItemRow } from "../state";
import type { ProductKey } from "./catalog";
import { OFFERS, type PlatformKey, type SellerKey } from "./market";
import { USERS } from "./users";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 1440;
const KURUS = 100;

/** Stock per day: i = in stock · l = low stock · o = out of stock · - = no data. */
type StockCode = "i" | "l" | "o" | "-";

export interface TrackingSeed {
  readonly key: string;
  readonly productKey: ProductKey;
  readonly row: Omit<TrackedItemRow, "id" | "userId" | "productKey" | "createdAt" | "seedKey" | "sellerOfferId" | "orderedOn" | "returnDeadline" | "trackingEndsAt" | "endedAt">;
  readonly seller: SellerKey | null;
  readonly createdDaysAgo: number;
  readonly orderedDaysAgo: number | null;
  readonly returnInDays: number | null;
  readonly endedDaysAgo: number | null;
  /** Tracking duration in days (want mode), from the creation day. */
  readonly durationDays: number | null;
  readonly checkedMinutesAgo: number;
  /** In the "stale" scenario this row's store does not answer (design States 4). */
  readonly staleInScenario: boolean;
  /** Cheapest price per day in TL, oldest first (14 values; null = no data). */
  readonly cheapestTl: readonly (number | null)[];
  readonly stock: string;
  readonly stockSubject: "CHEAPEST" | "OWN_SELLER";
  readonly conclusion: { kind: "DROPPED"; minutesAgo: number } | { kind: "NO_CHEAPER" } | { kind: "LOWEST_IN_DAYS"; days: number } | null;
}

const NO_HISTORY = Array.from({ length: 14 }, () => null);

export const TRACKING_SEEDS: readonly TrackingSeed[] = [
  {
    key: "ace-pro-2",
    productKey: "acePro2FlashPrint",
    row: { mode: "BOUGHT", platform: "HEPSIBURADA", pricePaidMinor: 28_999 * KURUS, state: "ACTIVE", orderStatus: "DELIVERED", returnDeadlineStatus: "CONFIRMED" },
    seller: "kameraDunyasi",
    createdDaysAgo: 13, orderedDaysAgo: 13, returnInDays: 4, endedDaysAgo: null, durationDays: null,
    checkedMinutesAgo: 4, staleInScenario: false,
    cheapestTl: [29_499, 29_499, 28_999, 28_999, 28_499, 28_499, 27_999, 27_999, 27_499, 27_499, 26_999, 26_999, 26_999, 25_997],
    stock: "iiiilooiiiiiii", stockSubject: "CHEAPEST",
    conclusion: { kind: "DROPPED", minutesAgo: 180 },
  },
  {
    key: "winter-coat",
    productKey: "winterCoat",
    // "Diğer" platform: typed by the user; no return day entered → unknown.
    row: { mode: "BOUGHT", platform: null, otherPlatformName: "LC Waikiki", pricePaidMinor: 3_299 * KURUS, state: "ACTIVE", orderStatus: "SHIPPED", returnDeadlineStatus: null },
    seller: null,
    createdDaysAgo: 5, orderedDaysAgo: 5, returnInDays: null, endedDaysAgo: null, durationDays: null,
    checkedMinutesAgo: 12, staleInScenario: true,
    cheapestTl: [3_399, 3_399, 3_399, 3_399, 3_399, 3_299, 3_299, 3_299, 3_299, 3_299, 3_299, 3_299, 2_999, 2_999],
    stock: "iiiiiiiiiiiiii", stockSubject: "CHEAPEST",
    conclusion: { kind: "DROPPED", minutesAgo: MINUTES_PER_DAY },
  },
  {
    key: "dyson-v15",
    productKey: "dysonV15",
    row: { mode: "BOUGHT", platform: "TEKNOSA", pricePaidMinor: 30_999 * KURUS, state: "ACTIVE", orderStatus: "DELIVERED", returnDeadlineStatus: "CONFIRMED" },
    seller: "teknosaMagaza",
    createdDaysAgo: 11, orderedDaysAgo: 11, returnInDays: 2, endedDaysAgo: null, durationDays: null,
    checkedMinutesAgo: 6, staleInScenario: false,
    cheapestTl: [32_499, 32_499, 31_999, 31_999, 31_999, 31_499, 31_499, 31_499, 31_499, 31_499, 31_499, 31_499, 30_999, 30_999],
    stock: "iiiiiiiiiiiiii", stockSubject: "OWN_SELLER",
    conclusion: { kind: "NO_CHEAPER" },
  },
  {
    key: "airpods-pro-2",
    productKey: "airPodsPro2",
    row: { mode: "WANT", platform: null, pricePaidMinor: null, state: "ACTIVE", targetPriceMinor: 7_500 * KURUS, trackingDuration: "1M" },
    seller: null,
    createdDaysAgo: 12, orderedDaysAgo: null, returnInDays: null, endedDaysAgo: null, durationDays: 30,
    checkedMinutesAgo: 9, staleInScenario: false,
    cheapestTl: [8_699, 8_699, 8_599, 8_599, 8_499, 8_499, 8_499, 8_399, 8_399, 8_299, 8_299, 8_150, 8_150, 8_150],
    stock: "iiiiiiilllliii", stockSubject: "CHEAPEST",
    conclusion: { kind: "LOWEST_IN_DAYS", days: 30 },
  },
  {
    key: "wh-1000xm5",
    productKey: "wh1000xm5",
    // "Biten takipler": ended by the user, saving recorded.
    row: { mode: "BOUGHT", platform: "HEPSIBURADA", pricePaidMinor: 11_499 * KURUS, state: "ENDED", orderStatus: "DELIVERED", returnDeadlineStatus: null, endReason: "USER", savingMinor: 650 * KURUS },
    seller: null,
    createdDaysAgo: 30, orderedDaysAgo: 30, returnInDays: null, endedDaysAgo: 12, durationDays: null,
    checkedMinutesAgo: 12 * MINUTES_PER_DAY, staleInScenario: false,
    cheapestTl: NO_HISTORY, stock: "-".repeat(14), stockSubject: "OWN_SELLER",
    conclusion: null,
  },
];

/** Checks already used today by the fixture user: 3 of 10 left, so the "allowance short" state shows (design States 3). */
export const SEED_CHECKS_USED_TODAY = 7;

export function seedByKey(key: string | undefined): TrackingSeed | undefined {
  return key ? TRACKING_SEEDS.find((seed) => seed.key === key) : undefined;
}

export function stockCodeToState(code: string): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | null {
  const states: Record<StockCode, "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | null> = { i: "IN_STOCK", l: "LOW_STOCK", o: "OUT_OF_STOCK", "-": null };
  return states[code as StockCode] ?? null;
}

function minutesAgo(now: Date, minutes: number): string {
  return new Date(now.getTime() - minutes * MS_PER_MINUTE).toISOString();
}

/** Writes the seeded rows for the fixture user ("user" session). */
export function seedTrackedItems(state: MockState, now: Date): void {
  const user = USERS.user;
  const today = toCalendarDay(now);
  for (const seed of TRACKING_SEEDS) {
    const sellerOffer = seed.seller ? OFFERS.find((offer) => offer.product === seed.productKey && offer.seller === seed.seller) : undefined;
    const created = minutesAgo(now, seed.createdDaysAgo * MINUTES_PER_DAY);
    state.trackedItems.push({
      ...seed.row,
      id: newId(),
      userId: user.id,
      productKey: seed.productKey,
      platform: seed.row.platform as PlatformKey | null,
      sellerOfferId: sellerOffer?.id ?? null,
      orderedOn: seed.orderedDaysAgo === null ? null : addCalendarDays(today, -seed.orderedDaysAgo),
      returnDeadline: seed.returnInDays === null ? null : addCalendarDays(today, seed.returnInDays),
      trackingEndsAt: seed.durationDays === null ? null : minutesAgo(now, (seed.createdDaysAgo - seed.durationDays) * MINUTES_PER_DAY),
      endedAt: seed.endedDaysAgo === null ? null : minutesAgo(now, seed.endedDaysAgo * MINUTES_PER_DAY),
      createdAt: created,
      seedKey: seed.key,
    });
  }
  for (let index = 0; index < SEED_CHECKS_USED_TODAY; index += 1) {
    state.checkNowUsage.push({ userId: user.id, trackedItemId: null, consumed: true, createdAt: now.toISOString() });
  }
}
