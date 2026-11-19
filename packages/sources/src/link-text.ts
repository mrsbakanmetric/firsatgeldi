// Link reading, path 1: the link text itself (architecture.md §10.1 › Link reading order
// [DECIDED 2026-11-19]). Reads the store, the store's product id, brand, name words and
// model code from the URL alone: no request to the store and no provider cost. It gives
// product identity only; seller and price come from paths 2 and 3.
//
// Store URL shapes: confirmed on real product links of all five stores (data test,
// 2026-11-19: Trendyol 6, Hepsiburada 4, Teknosa 3, Amazon 3, MediaMarkt 3). Share-link
// hosts stay [ASSUMPTION] (platforms.ts).
import { type PlatformCode, platformOfHost, platformOfShortLinkHost } from "./platforms.ts";

export type LinkTextFailure =
  /** Not an http(s) URL. */
  | "NOT_A_URL"
  /** Not one of the launch stores. */
  | "UNKNOWN_STORE"
  /** A store share link that only redirects: needs a request to read. */
  | "SHORT_LINK"
  /** A store page that is not a product page (home, category, search …). */
  | "NOT_A_PRODUCT_PAGE";

export interface LinkTextReading {
  readonly path: "LINK_TEXT";
  readonly platform: PlatformCode;
  /** The store's own product id (Trendyol content id, Hepsiburada SKU, ASIN …). */
  readonly productExternalId: string;
  /** The product page without query string and fragment (tracking parameters dropped). */
  readonly url: string;
  /**
   * Brand words: the store's own brand segment (Trendyol), otherwise the first name word —
   * the stores put the brand first ("roborock-s8-pro…", "apple-iphone-15…"). A brand
   * written with a hyphen reads as its first word ("TP-Link" → "tp"); `brandFromStore`
   * tells the two apart. Null only when the link has no name words (Amazon `/dp/{ASIN}`).
   */
  readonly brand: string | null;
  /** True when the brand comes from the store's own brand segment, false when it is the first name word. */
  readonly brandFromStore: boolean;
  /** Lower-case name words from the URL, model code excluded. Store slugs drop Turkish letters ("ayakkabisi"). */
  readonly nameWords: readonly string[];
  /** Manufacturer model code when the URL carries one ("1042A237-101"); otherwise null. */
  readonly modelCode: string | null;
  /** The store's seller id when the link names one (Trendyol `merchantId`); the user's own purchase only. */
  readonly sellerExternalId: string | null;
  /** Brand + name + model code, for the catalogue match and the path 2 search. */
  readonly searchText: string;
}

export type LinkTextResult =
  | { readonly ok: true; readonly reading: LinkTextReading }
  | { readonly ok: false; readonly reason: LinkTextFailure; readonly platform: PlatformCode | null };

interface PathMatch {
  readonly productExternalId: string;
  readonly brandSlug: string | null;
  readonly nameSlug: string;
  readonly sellerExternalId: string | null;
}

type PathReader = (url: URL) => PathMatch | null;

/** Trendyol: `/{brand}/{name}-p-{contentId}` (the brand segment may be missing); the seller is `?merchantId=`. */
const TRENDYOL_PATH = /^\/(?:([^/]+)\/)?([^/]+)-p-(\d+)\/?$/;
/** Hepsiburada: `/{name}-p-{SKU}` (one listing) or `/{name}-pm-{SKU}` (product family). */
const HEPSIBURADA_PATH = /^\/([^/]+)-pm?-([A-Za-z0-9]+)\/?$/;
/** Amazon: `/{name}/dp/{ASIN}`, `/dp/{ASIN}`, `/gp/product/{ASIN}` or the mobile `/gp/aw/d/{ASIN}`, anything after. */
const AMAZON_PATH = /^\/(?:([^/]+)\/)?(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?]|$)/i;
/** MediaMarkt: `/tr/product/_{name}-{id}.html`. */
const MEDIAMARKT_PATH = /^\/tr\/product\/_([^/]+)-(\d+)\.html$/;
/** Teknosa: `/{name}-p-{id}`. */
const TEKNOSA_PATH = /^\/([^/]+)-p-(\d+)\/?$/;

const PATH_READERS: Readonly<Record<PlatformCode, PathReader>> = {
  TRENDYOL: (url) => {
    const match = TRENDYOL_PATH.exec(url.pathname);
    if (!match?.[2] || !match[3]) return null;
    return { brandSlug: match[1] ?? null, nameSlug: match[2], productExternalId: match[3], sellerExternalId: url.searchParams.get("merchantId") };
  },
  HEPSIBURADA: (url) => {
    const match = HEPSIBURADA_PATH.exec(url.pathname);
    if (!match?.[1] || !match[2]) return null;
    return { brandSlug: null, nameSlug: match[1], productExternalId: match[2].toUpperCase(), sellerExternalId: null };
  },
  AMAZON_TR: (url) => {
    const match = AMAZON_PATH.exec(url.pathname);
    if (!match?.[2]) return null;
    return { brandSlug: null, nameSlug: match[1] ?? "", productExternalId: match[2].toUpperCase(), sellerExternalId: null };
  },
  MEDIAMARKT: (url) => {
    const match = MEDIAMARKT_PATH.exec(url.pathname);
    if (!match?.[1] || !match[2]) return null;
    return { brandSlug: null, nameSlug: match[1], productExternalId: match[2], sellerExternalId: null };
  },
  TEKNOSA: (url) => {
    const match = TEKNOSA_PATH.exec(url.pathname);
    if (!match?.[1] || !match[2]) return null;
    return { brandSlug: null, nameSlug: match[1], productExternalId: match[2], sellerExternalId: null };
  },
};

const WORD_SEPARATOR = /[-_+\s]+/;
const HAS_DIGIT = /\d/;
const HAS_LETTER = /[a-z]/;
/** A model code word mixes letters and digits and is at least this long ("1042a237", "ep2231", "1000xm5"); shorter ones are name parts ("v15", "s24"). */
const MODEL_CODE_MIN_LENGTH = 5;
/** A number with a unit is a size, capacity or resolution, never a model code ("256gb", "1tb", "40mm", "1080p"). */
const MEASURE = /^\d+(?:[.,]\d+)?(?:gb|tb|mb|mm|cm|inc|inch|w|mah|hz|mp|k|p|ml|lt|kg|gr|g)$/;
/** One inch in centimetres: a screen size is written twice, "75-190" or "40-102". */
const CM_PER_INCH = 2.54;
/** Rounding slack for the centimetre value ("75" → 190.5 → "190"). */
const SCREEN_SIZE_SLACK_CM = 1.5;

function words(slug: string): string[] {
  let text: string;
  try {
    text = decodeURIComponent(slug);
  } catch {
    text = slug;
  }
  return text.toLowerCase().split(WORD_SEPARATOR).filter(Boolean);
}

const isCodeWord = (word: string): boolean => word.length >= MODEL_CODE_MIN_LENGTH && HAS_DIGIT.test(word) && HAS_LETTER.test(word) && !MEASURE.test(word);
const isNumberWord = (word: string | undefined): boolean => word !== undefined && HAS_DIGIT.test(word) && !HAS_LETTER.test(word);

/** "75-190" / "40-102": a screen size in inches and centimetres, not part of a model code. */
function isScreenSize(inches: string | undefined, centimetres: string | undefined): boolean {
  if (!isNumberWord(inches) || !isNumberWord(centimetres)) return false;
  return Math.abs(Number(inches) * CM_PER_INCH - Number(centimetres)) <= SCREEN_SIZE_SLACK_CM;
}

/**
 * The model code and where it starts. Preferred: the code at the end of the name
 * ("…-ayakkabisi-1042a237-101" → "1042A237-101": a code word followed only by words with
 * digits). Otherwise the first code word, with the number words right after it
 * ("philips-ep2231-40-tam-…" → "EP2231-40"), stopping at a screen size ("75t8c-75-190-ekran"
 * → "75T8C"). When the brand is the first name word (`firstWordIsBrand`) that word is
 * skipped ("insta360-ace-pro-2" has no model code). Sizes and capacities ("256gb", "40mm")
 * are never model codes.
 */
function modelCodeOf(nameWords: readonly string[], firstWordIsBrand: boolean): { code: string; start: number; end: number } | null {
  const first = firstWordIsBrand ? 1 : 0;
  let runStart = nameWords.length;
  while (runStart > first && HAS_DIGIT.test(nameWords[runStart - 1] ?? "")) runStart -= 1;
  const codeAt = nameWords.slice(runStart).findIndex(isCodeWord);
  const start = codeAt >= 0 ? runStart + codeAt : nameWords.findIndex((word, index) => index >= first && isCodeWord(word));
  if (start < 0) return null;
  let end = start + 1;
  while (isNumberWord(nameWords[end]) && !isScreenSize(nameWords[end], nameWords[end + 1])) end += 1;
  return { code: nameWords.slice(start, end).join("-").toUpperCase(), start, end };
}

/** A pasted link without "https://" ("amazon.com.tr/gp/aw/d/…") is read as https. */
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const BARE_HOST_AND_PATH = /^(?:[a-z0-9-]+\.)+[a-z]{2,}\/\S*$/i;

function parseLink(link: string): URL | null {
  const text = link.trim();
  const withScheme = !SCHEME.test(text) && BARE_HOST_AND_PATH.test(text) ? `https://${text}` : text;
  try {
    return new URL(withScheme);
  } catch {
    return null;
  }
}

function startsWith(list: readonly string[], prefix: readonly string[]): boolean {
  return prefix.length > 0 && prefix.every((word, index) => list[index] === word);
}

/** Path 1: everything the link text says about the product, or why it says nothing. */
export function readLinkText(link: string): LinkTextResult {
  const url = parseLink(link);
  if (!url) return { ok: false, reason: "NOT_A_URL", platform: null };
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "NOT_A_URL", platform: null };

  const shortLink = platformOfShortLinkHost(url.hostname);
  if (shortLink) return { ok: false, reason: "SHORT_LINK", platform: shortLink.code };
  const platform = platformOfHost(url.hostname);
  if (!platform) return { ok: false, reason: "UNKNOWN_STORE", platform: null };

  const match = PATH_READERS[platform.code](url);
  if (!match) return { ok: false, reason: "NOT_A_PRODUCT_PAGE", platform: platform.code };

  const allNameWords = words(match.nameSlug);
  const brandFromStore = match.brandSlug !== null;
  const brandWords = match.brandSlug ? words(match.brandSlug) : allNameWords.slice(0, 1);
  const model = modelCodeOf(allNameWords, !brandFromStore || startsWith(allNameWords, brandWords));
  const nameWords = model ? [...allNameWords.slice(0, model.start), ...allNameWords.slice(model.end)] : allNameWords;
  const searchWords = [...(startsWith(nameWords, brandWords) ? [] : brandWords), ...nameWords, ...(model ? [model.code.toLowerCase()] : [])];

  return {
    ok: true,
    reading: {
      path: "LINK_TEXT",
      platform: platform.code,
      productExternalId: match.productExternalId,
      url: `${url.origin}${url.pathname}`,
      brand: brandWords.length ? brandWords.join(" ") : null,
      brandFromStore,
      nameWords,
      modelCode: model?.code ?? null,
      sellerExternalId: match.sellerExternalId || null,
      searchText: searchWords.join(" "),
    },
  };
}
