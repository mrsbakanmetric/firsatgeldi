// Link reading, path 1: the link text itself (architecture.md §10.1 › Link reading order
// [DECIDED 2026-11-19]). Reads the store, the store's product id, brand, name words and
// model code from the URL alone: no request to the store and no provider cost. It gives
// product identity only; seller and price come from paths 2 and 3.
//
// Store URL shapes: Trendyol is confirmed on a real product link (2026-11-19); Hepsiburada,
// Amazon, MediaMarkt and Teknosa are [ASSUMPTION — confirm on real links in the data test].
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
  /** Brand words when the store puts the brand in its own path segment (Trendyol); otherwise null — never guessed. */
  readonly brand: string | null;
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

/** Trendyol: `/{brand}/{name}-p-{contentId}`; the seller is `?merchantId=`. */
const TRENDYOL_PATH = /^\/([^/]+)\/([^/]+)-p-(\d+)\/?$/;
/** Hepsiburada: `/{name}-p-{SKU}` (one listing) or `/{name}-pm-{SKU}` (product family). */
const HEPSIBURADA_PATH = /^\/([^/]+)-pm?-([A-Za-z0-9]+)\/?$/;
/** Amazon: `/{name}/dp/{ASIN}`, `/dp/{ASIN}` or `/gp/product/{ASIN}`, anything after. */
const AMAZON_PATH = /^\/(?:([^/]+)\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})(?:[/?]|$)/i;
/** MediaMarkt: `/tr/product/_{name}-{id}.html`. */
const MEDIAMARKT_PATH = /^\/tr\/product\/_([^/]+)-(\d+)\.html$/;
/** Teknosa: `/{name}-p-{id}`. */
const TEKNOSA_PATH = /^\/([^/]+)-p-(\d+)\/?$/;

const PATH_READERS: Readonly<Record<PlatformCode, PathReader>> = {
  TRENDYOL: (url) => {
    const match = TRENDYOL_PATH.exec(url.pathname);
    if (!match?.[1] || !match[2] || !match[3]) return null;
    return { brandSlug: match[1], nameSlug: match[2], productExternalId: match[3], sellerExternalId: url.searchParams.get("merchantId") };
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

function words(slug: string): string[] {
  let text: string;
  try {
    text = decodeURIComponent(slug);
  } catch {
    text = slug;
  }
  return text.toLowerCase().split(WORD_SEPARATOR).filter(Boolean);
}

const isCodeWord = (word: string): boolean => word.length >= MODEL_CODE_MIN_LENGTH && HAS_DIGIT.test(word) && HAS_LETTER.test(word);

/**
 * The model code and where it starts. Preferred: the code at the end of the name
 * ("…-ayakkabisi-1042a237-101" → "1042A237-101": a code word followed only by words with
 * digits). Otherwise the first code word after the first name word, with the number words
 * right after it ("philips-ep2231-40-tam-…" → "EP2231-40"). The first word is skipped there
 * because it is usually the brand ("insta360-ace-pro-2" has no model code).
 */
function modelCodeOf(nameWords: readonly string[]): { code: string; start: number; end: number } | null {
  let runStart = nameWords.length;
  while (runStart > 0 && HAS_DIGIT.test(nameWords[runStart - 1] ?? "")) runStart -= 1;
  const codeAt = nameWords.slice(runStart).findIndex(isCodeWord);
  const start = codeAt >= 0 ? runStart + codeAt : nameWords.findIndex((word, index) => index > 0 && isCodeWord(word));
  if (start < 0) return null;
  let end = start + 1;
  while (end < nameWords.length && HAS_DIGIT.test(nameWords[end] ?? "") && !HAS_LETTER.test(nameWords[end] ?? "")) end += 1;
  return { code: nameWords.slice(start, end).join("-").toUpperCase(), start, end };
}

function startsWith(list: readonly string[], prefix: readonly string[]): boolean {
  return prefix.length > 0 && prefix.every((word, index) => list[index] === word);
}

/** Path 1: everything the link text says about the product, or why it says nothing. */
export function readLinkText(link: string): LinkTextResult {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return { ok: false, reason: "NOT_A_URL", platform: null };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, reason: "NOT_A_URL", platform: null };

  const shortLink = platformOfShortLinkHost(url.hostname);
  if (shortLink) return { ok: false, reason: "SHORT_LINK", platform: shortLink.code };
  const platform = platformOfHost(url.hostname);
  if (!platform) return { ok: false, reason: "UNKNOWN_STORE", platform: null };

  const match = PATH_READERS[platform.code](url);
  if (!match) return { ok: false, reason: "NOT_A_PRODUCT_PAGE", platform: platform.code };

  const brandWords = match.brandSlug ? words(match.brandSlug) : [];
  const allNameWords = words(match.nameSlug);
  const model = modelCodeOf(allNameWords);
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
      nameWords,
      modelCode: model?.code ?? null,
      sellerExternalId: match.sellerExternalId || null,
      searchText: searchWords.join(" "),
    },
  };
}
