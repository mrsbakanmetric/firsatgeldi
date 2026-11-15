// Product Detail fixtures (design "2 Ürün Detayı v2"): the price history before tracking
// started (another user's tracking — drawn dimmed), the seller-less product rating, and the
// texts the server writes (price-difference message, calendar entry) in every language.
// Values from the canvas where it draws them: 6-month lowest 24.899 TL (want chips
// "6 ay ↓ 24.899"), "4,5 · 4 mağazada 3.850 değerlendirme · 2 saat önce okundu".
import type { ProductKey } from "./catalog";
import { type Localized, text } from "./text";

function repeat(days: number, tl: number): number[] {
  return Array.from({ length: days }, () => tl);
}

export interface EarlierHistory {
  /** Cheapest per day in TL, oldest first, ending the day before the 14-day tracking seed starts. */
  readonly tl: readonly number[];
  /** Days (index into `tl`) when the cheapest was not today's cheapest seller: its rank then. */
  readonly rankThen: Readonly<Record<number, number>>;
}

/** Seed key (fixtures/tracking.ts) → its history before the 14 drawn days. */
export const EARLIER_HISTORY: Readonly<Record<string, EarlierHistory>> = {
  // 166 days before the 14-day seed → 180 days in all; a three-day dip to 24.899 TL about four months ago.
  "ace-pro-2": {
    tl: [...repeat(54, 30_499), ...repeat(3, 24_899), ...repeat(60, 29_999), ...repeat(49, 29_699)],
    rankThen: { 54: 2, 55: 2, 56: 2 },
  },
};

/**
 * When the stores' product ratings were last read ("2 saat önce okundu"); the figure itself is
 * computed from each offer's `productRating` (fixtures/market.ts) with `crossStoreRating`.
 */
export const RATINGS_READ_MINUTES_AGO: Readonly<Partial<Record<ProductKey, number>>> = {
  acePro2FlashPrint: 120,
  airPodsPro2: 300,
};

/**
 * The ready price-difference message (modules.md Product Detail › v1 helpers), as in the canvas:
 * "Merhaba, 1 Kasım 2026'da 28.999 TL'ye aldığım … ürününün fiyatı şu an 25.997 TL. Aradaki
 * 3.002 TL farkın iadesini rica ederim." It goes to the user's own seller and never names another.
 */
export const PRICE_DIFFERENCE_TEXT: Localized = text(
  "Merhaba, {date} tarihinde {paid} fiyatla aldığım {product} ürününün fiyatı şu an {now}. Aradaki {difference} farkın iadesini rica ederim.",
  "Hello, I bought {product} on {date} for {paid}. Its price is now {now}. I kindly ask for a refund of the {difference} difference.",
);

/** "Takvime ekle": the last return day, reminder one day before (modules.md Product Detail › v1 helpers). */
export const CALENDAR_TEXT: { readonly summary: Localized; readonly description: Localized } = {
  summary: text("İade için son gün · {product}", "Last day to return · {product}"),
  description: text("{platform} iade süren bugün bitiyor.", "Your {platform} return window ends today."),
};

/** Fills `{name}` placeholders. */
export function fill(template: string, values: Readonly<Record<string, string>>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}
