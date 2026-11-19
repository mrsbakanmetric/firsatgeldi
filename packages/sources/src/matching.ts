// Product match after link reading path 2 [DECIDED 2026-11-19] (architecture.md §10.1,
// data_test_report.md §6). Google Shopping answers a search with many offers; the first
// one is the linked product only 4 times in 16 (data test round 1). This module picks the
// linked product among the offers, or says it is not sure:
//
//   1. normalise the link reading and every offer title (lower case, Turkish letters
//      folded, punctuation dropped, part-number suffix ignored: "MXP63TU/A" = "MXP63TU");
//   2. hard filters — an offer that fails one is dropped: a Turkish listing in TL, new
//      condition, not an accessory or compatible part, same pack size, brand, model code,
//      generation and series;
//   3. score the rest on the link's name words and variant details (storage, size, colour);
//   4. confidence — HIGH: an offer names everything that identifies the product and its
//      variant details agree; it is proposed and the user still confirms it (product rule 1).
//      LOW: no such offer; the closest three are returned to choose from (+ "Adıyla ara").
//
// Store text is untrusted data: titles are only read as words, never executed or shown
// as markup. The offers carry store and seller names; they stay on the server (product
// rule 3) — this module only ranks them.
import type { ShoppingOffer } from "./google-shopping.ts";
import { isCodeWord, type LinkTextReading, MEASURE } from "./link-text.ts";

export interface MatchSettings {
  /** Weight of "how many of the link's key words the title has". */
  readonly recallWeight: number;
  /** Weight of "how few words the title adds" (a title of another product adds many). */
  readonly precisionWeight: number;
  /** Subtracted when the title states another storage, size or colour than the link. */
  readonly variantConflictPenalty: number;
  /** How many offers a LOW match returns ("Hangisi seninki?" shows three). */
  readonly closestCount: number;
}

/** Defaults; in Phase 2 they move to `system_settings` [ASSUMPTION — keys not named yet]. */
export const DEFAULT_MATCH_SETTINGS: MatchSettings = {
  recallWeight: 0.7,
  precisionWeight: 0.3,
  variantConflictPenalty: 0.5,
  closestCount: 3,
};

export type DropReason =
  /** Foreign script, foreign currency, foreign words or a price not in TL. */
  | "NOT_TURKISH"
  /** Refurbished, display unit, open box, used. */
  | "NOT_NEW"
  /** Accessory or compatible part ("uyumlu", "için", "kumanda", "dahil değildir" …). */
  | "ACCESSORY"
  /** A pack or set ("2'li", "2-pack", "set") the link does not ask for. */
  | "PACK"
  /** The link's brand is not in the title. */
  | "BRAND"
  /** The title carries another model code than the link. */
  | "MODEL_CODE"
  /** Another generation or series ("SE 2" for "SE 3", "S9" for "S8", "Pro Max" for "Pro"). */
  | "GENERATION";

export interface ScoredOffer {
  /** Position of the offer in the answer's offer list (0-based). */
  readonly index: number;
  readonly offer: ShoppingOffer;
  readonly score: number;
  /** The title names everything that identifies the linked product. */
  readonly identityComplete: boolean;
  /** The title states another storage, size or colour than the link. */
  readonly variantConflict: boolean;
}

export interface DroppedOffer {
  readonly index: number;
  readonly reason: DropReason;
}

interface MatchBase {
  /** Offers that passed every hard filter, best first. */
  readonly ranked: readonly ScoredOffer[];
  readonly dropped: readonly DroppedOffer[];
}

export type ProductMatch =
  | (MatchBase & { readonly confidence: "HIGH"; readonly proposed: ScoredOffer })
  | (MatchBase & { readonly confidence: "LOW"; readonly closest: readonly ScoredOffer[] });

// ── Word lists (folded forms) ───────────────────────────────────────────────────────

/** Words that say nothing about which product it is; dropped from the search text and the score. */
const GENERIC_WORDS = new Set(["akilli", "telefon", "telefonu", "cep", "ekran", "uydu", "alicili"]);
const STOP_WORDS = new Set(["ve", "ile", "and"]);
/** Series words: an offer with one the link does not have is another product ("Pro Max", "Plus", "Cellular", noise cancelling). */
const SERIES_WORDS = new Set(["pro", "max", "plus", "ultra", "mini", "lite", "sonic", "flow", "maxv", "cellular", "anc", "noise", "gurultu"]);
const PACK_WORDS = new Set(["pack", "paket", "set", "seti", "bundle"]);
/** "2li", "3lu" ("2'li", "3'lü" after folding). */
const PACK_COUNT = /^(?:[2-9]|\d{2,})l[iu]$/;
const ACCESSORY_WORDS = new Set(["uyumlu", "icin", "kilif", "kumanda", "kumandasi", "braket", "braketi", "yedek", "compatible", "fircasi", "dahildegildir"]);
const CONDITION_WORDS = new Set(["yenilenmis", "teshir", "vitrin", "outlet", "used", "refurbished", "acikkutu", "ikinciel", "secondhand"]);
/** Words of foreign listings seen in round 1 (Italian, German, English). */
const FOREIGN_WORDS = new Set(["con", "per", "miglior", "prezzo", "und", "mit", "with", "the", "for"]);
const NON_LATIN_SCRIPT = /[Ѐ-ӿ؀-ۿ]/;
const FOREIGN_CURRENCY = /[€$£]/;
const TL_PRICE = /₺|\bTL\b|\bTRY\b/;
/** Two-word names read as one word. */
const PHRASES: Readonly<Record<string, string>> = {
  "gece yarisi": "geceyarisi",
  "yildiz isigi": "yildizisigi",
  "uzay grisi": "uzaygrisi",
  "kum beji": "kumbeji",
  "space gray": "uzaygrisi",
  "space grey": "uzaygrisi",
  "acik kutu": "acikkutu",
  "ikinci el": "ikinciel",
  "second hand": "secondhand",
  "dahil degildir": "dahildegildir",
};
/** English colour names in titles, read as the Turkish ones the store links use. */
const SYNONYMS: Readonly<Record<string, string>> = {
  starlight: "yildizisigi",
  midnight: "geceyarisi",
  black: "siyah",
  white: "beyaz",
  blue: "mavi",
  red: "kirmizi",
  green: "yesil",
  gray: "gri",
  grey: "gri",
  silver: "gumus",
  gold: "altin",
  pink: "pembe",
  purple: "mor",
  orange: "turuncu",
  yellow: "sari",
};
const COLOURS = new Set([
  "siyah", "beyaz", "mavi", "kirmizi", "yesil", "gri", "gumus", "altin", "pembe", "mor", "bordo", "lacivert", "krem", "turuncu", "sari",
  "kahverengi", "geceyarisi", "yildizisigi", "uzaygrisi", "kumbeji",
]);
/** Units whose values must agree; storage is compared in GB. */
const DIMENSIONS: Readonly<Record<string, { readonly dimension: string; readonly factor: number }>> = {
  mb: { dimension: "storage", factor: 1 / 1024 },
  gb: { dimension: "storage", factor: 1 },
  tb: { dimension: "storage", factor: 1024 },
  mm: { dimension: "mm", factor: 1 },
  inc: { dimension: "inch", factor: 1 },
  inch: { dimension: "inch", factor: 1 },
  w: { dimension: "watt", factor: 1 },
};

// ── Normalising ─────────────────────────────────────────────────────────────────────

/** "mxp63tu/a" → "mxp63tu". */
const PART_SUFFIX = /\b([a-z0-9]{4,})\/[a-z]\b/g;
/** "36.000" → "36000". */
const THOUSANDS = /(\d)[.,](\d{3})(?!\d)/g;
/** "2'li" → "2li", "43''" → "43". */
const APOSTROPHES = /['’`]/g;
const NON_WORD = /[^a-z0-9]+/;
const DIGITS = /^\d+$/;
const LETTERS = /^[a-z]+$/;
const SINGLE_LETTER = /^[a-z]$/;
/** A short model name: letters then digits, shorter than a model code ("s8", "c211", "m3"). */
const SHORT_MODEL = /^([a-z]+)(\d+)$/;
const LEADING_DIGITS = /^(\d+)/;
const MEASURE_PARTS = /^(\d+(?:[.,]\d+)?)([a-z]+)$/;

/** Lower case with Turkish letters folded to ASCII ("İ" → "i", "ı" → "i", "ş" → "s"). */
export function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/ı/g, "i");
}

/** Words of a title or a link reading: folded, punctuation dropped, "128 gb" → "128gb", colour names unified. */
export function normaliseWords(text: string): string[] {
  const raw = fold(text).replace(PART_SUFFIX, "$1").replace(THOUSANDS, "$1$2").replace(APOSTROPHES, "").split(NON_WORD).filter(Boolean);
  const out: string[] = [];
  for (let index = 0; index < raw.length; index += 1) {
    const word = raw[index] ?? "";
    const next = raw[index + 1];
    if (next !== undefined) {
      const phrase = PHRASES[`${word} ${next}`];
      if (phrase) {
        out.push(phrase);
        index += 1;
        continue;
      }
      if (DIGITS.test(word) && LETTERS.test(next) && MEASURE.test(word + next)) {
        out.push(word + next);
        index += 1;
        continue;
      }
    }
    out.push(SYNONYMS[word] ?? word);
  }
  return out;
}

const isKeyWord = (word: string): boolean => !GENERIC_WORDS.has(word) && !STOP_WORDS.has(word) && !SINGLE_LETTER.test(word);
const compactCode = (code: string): string => fold(code).replace(/[^a-z0-9]/g, "");

/** Two model codes are the same when they differ at most by one trailing letter ("mjrr4tua" = "mjrr4tu"). */
function sameCode(a: string, b: string): boolean {
  if (a === b) return true;
  const [longer, shorter] = a.length > b.length ? [a, b] : [b, a];
  return longer.length === shorter.length + 1 && longer.startsWith(shorter) && SINGLE_LETTER.test(longer.slice(-1));
}

/** The link's name words that identify the product, as path 1 wrote them (brand and generic words left out). */
export function keyNameWords(reading: LinkTextReading): string[] {
  const brandWords = reading.brand ? reading.brand.split(" ") : [];
  const startsWithBrand = brandWords.length > 0 && brandWords.every((word, index) => reading.nameWords[index] === word);
  const words = startsWithBrand ? reading.nameWords.slice(brandWords.length) : reading.nameWords;
  return words.filter((word) => isKeyWord(fold(word)));
}

// ── The link's profile ──────────────────────────────────────────────────────────────

interface GenerationPair {
  readonly word: string;
  readonly number: string;
}

interface LinkProfile {
  readonly brand: readonly string[];
  readonly words: ReadonlySet<string>;
  /** Key words for the score; the model code is added separately. */
  readonly key: ReadonlySet<string>;
  readonly code: string | null;
  /** A name word followed by its generation number ("iphone 18", "se 3", "saros 20"). */
  readonly pairs: readonly GenerationPair[];
  readonly shortModels: readonly string[];
  readonly series: readonly string[];
  readonly colours: ReadonlySet<string>;
  readonly measures: ReadonlyMap<string, ReadonlySet<number>>;
}

function measuresOf(words: readonly string[]): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>();
  for (const word of words) {
    if (!MEASURE.test(word)) continue;
    const parts = MEASURE_PARTS.exec(word);
    const unit = parts?.[2] ? DIMENSIONS[parts[2]] : undefined;
    if (!parts?.[1] || !unit) continue;
    const value = Number(parts[1].replace(",", ".")) * unit.factor;
    const values = result.get(unit.dimension) ?? new Set<number>();
    values.add(value);
    result.set(unit.dimension, values);
  }
  return result;
}

function profileOf(reading: LinkTextReading): LinkProfile {
  const brand = normaliseWords(reading.brand ?? "");
  const words = normaliseWords([reading.brand ?? "", ...reading.nameWords].join(" "));
  const pairs: GenerationPair[] = [];
  words.forEach((word, index) => {
    const next = words[index + 1];
    if (next !== undefined && LETTERS.test(word) && word.length > 1 && isKeyWord(word) && !brand.includes(word) && DIGITS.test(next)) {
      pairs.push({ word, number: next });
    }
  });
  return {
    brand,
    words: new Set(words),
    key: new Set(words.filter(isKeyWord)),
    code: reading.modelCode ? compactCode(reading.modelCode) : null,
    pairs,
    shortModels: words.filter((word) => SHORT_MODEL.test(word) && !isCodeWord(word) && !MEASURE.test(word) && !brand.includes(word)),
    series: words.filter((word) => SERIES_WORDS.has(word)),
    colours: new Set(words.filter((word) => COLOURS.has(word))),
    measures: measuresOf(words),
  };
}

// ── One offer ───────────────────────────────────────────────────────────────────────

/** "se3" → "se", "3" when the link has the pair "se 3": titles glue generation numbers. */
function titleWordsOf(title: string, link: LinkProfile): string[] {
  const pairWords = new Set(link.pairs.map((pair) => pair.word));
  return normaliseWords(title).flatMap((word) => {
    const glued = SHORT_MODEL.exec(word);
    return glued?.[1] && glued[2] && pairWords.has(glued[1]) ? [glued[1], glued[2]] : [word];
  });
}

function carriesCode(words: readonly string[], code: string): boolean {
  return words.some((word, index) => {
    const two = word + (words[index + 1] ?? "");
    const three = two + (words[index + 2] ?? "");
    return sameCode(word, code) || sameCode(two, code) || sameCode(three, code);
  });
}

function hasNewWord(words: readonly string[], list: ReadonlySet<string>, link: LinkProfile): boolean {
  return words.some((word) => list.has(word) && !link.words.has(word));
}

function isPackWord(word: string): boolean {
  return PACK_WORDS.has(word) || PACK_COUNT.test(word);
}

function generationDiffers(words: readonly string[], link: LinkProfile): boolean {
  for (const pair of link.pairs) {
    const numbers = words.flatMap((word, index) => {
      const next = words[index + 1];
      if (word !== pair.word || next === undefined || MEASURE.test(next)) return [];
      return LEADING_DIGITS.exec(next)?.[1] ?? [];
    });
    if (numbers.length > 0 && !numbers.includes(pair.number)) return true;
  }
  for (const model of link.shortModels) {
    const prefix = SHORT_MODEL.exec(model)?.[1];
    const sameLine = words.filter((word) => SHORT_MODEL.exec(word)?.[1] === prefix && !isCodeWord(word));
    if (sameLine.length > 0 && !sameLine.includes(model)) return true;
  }
  return words.some((word) => SERIES_WORDS.has(word) && !link.words.has(word));
}

function dropReason(offer: ShoppingOffer, words: readonly string[], link: LinkProfile, hasLinkCode: boolean): DropReason | null {
  const foreignPrice = offer.priceText !== null && !TL_PRICE.test(offer.priceText);
  if (NON_LATIN_SCRIPT.test(offer.title) || FOREIGN_CURRENCY.test(offer.title) || words.some((word) => FOREIGN_WORDS.has(word)) || foreignPrice) {
    return "NOT_TURKISH";
  }
  const linkSaysUsed = [...link.words].some((word) => CONDITION_WORDS.has(word));
  if (!linkSaysUsed && (offer.condition !== null || hasNewWord(words, CONDITION_WORDS, link))) return "NOT_NEW";
  if (hasNewWord(words, ACCESSORY_WORDS, link)) return "ACCESSORY";
  const linkIsPack = [...link.words].some(isPackWord);
  if (!linkIsPack && words.some(isPackWord)) return "PACK";
  if (!link.brand.every((word) => words.includes(word))) return "BRAND";
  if (link.code !== null && !hasLinkCode && words.some(isCodeWord)) return "MODEL_CODE";
  if (generationDiffers(words, link)) return "GENERATION";
  return null;
}

function variantConflict(words: readonly string[], link: LinkProfile): boolean {
  const colours = words.filter((word) => COLOURS.has(word));
  if (colours.length > 0 && link.colours.size > 0 && !colours.some((colour) => link.colours.has(colour))) return true;
  for (const [dimension, values] of measuresOf(words)) {
    const linkValues = link.measures.get(dimension);
    if (linkValues && ![...values].some((value) => linkValues.has(value))) return true;
  }
  return false;
}

function identityComplete(present: ReadonlySet<string>, key: ReadonlySet<string>, link: LinkProfile): boolean {
  const identity = [...link.pairs.flatMap((pair) => [pair.word, pair.number]), ...link.shortModels, ...link.series];
  // A link with nothing but its brand to identify it (no generation, model name or series)
  // is identified only by all of its key words.
  const required = identity.length > 0 ? [...link.brand, ...identity] : [...key];
  return required.every((word) => present.has(word));
}

// ── The match ───────────────────────────────────────────────────────────────────────

export function matchProduct(reading: LinkTextReading, offers: readonly ShoppingOffer[], settings: MatchSettings = DEFAULT_MATCH_SETTINGS): ProductMatch {
  const link = profileOf(reading);
  const key = new Set(link.key);
  if (link.code !== null) key.add(link.code);

  const dropped: DroppedOffer[] = [];
  const candidates: ScoredOffer[] = [];
  offers.forEach((offer, index) => {
    const words = titleWordsOf(offer.title, link);
    const hasLinkCode = link.code !== null && carriesCode(words, link.code);
    const reason = dropReason(offer, words, link, hasLinkCode);
    if (reason) {
      dropped.push({ index, reason });
      return;
    }
    const present = new Set(words.filter(isKeyWord));
    if (hasLinkCode && link.code !== null) present.add(link.code);
    const hits = [...key].filter((word) => present.has(word)).length;
    const recall = key.size > 0 ? hits / key.size : 0;
    const precision = present.size > 0 ? hits / present.size : 0;
    const conflict = variantConflict(words, link);
    candidates.push({
      index,
      offer,
      score: settings.recallWeight * recall + settings.precisionWeight * precision - (conflict ? settings.variantConflictPenalty : 0),
      identityComplete: identityComplete(present, key, link),
      variantConflict: conflict,
    });
  });

  const sure = (candidate: ScoredOffer): boolean => candidate.identityComplete && !candidate.variantConflict;
  const ranked = candidates.toSorted((a, b) => Number(sure(b)) - Number(sure(a)) || b.score - a.score || a.index - b.index);
  const best = ranked[0];
  if (best && sure(best)) return { confidence: "HIGH", proposed: best, ranked, dropped };
  return { confidence: "LOW", closest: closestDistinct(ranked, settings.closestCount), ranked, dropped };
}

/**
 * The closest offers, one per product: offers from different stores often carry the same
 * title, and the user would see the same choice twice. Titles are compared normalised
 * ("Onvo Ekran Uydu Alıcılı Full Hd Qled Tv" = "ONVO ekran uydu alicili full HD QLED TV");
 * the best-ranked offer of each title is kept.
 */
function closestDistinct(ranked: readonly ScoredOffer[], count: number): ScoredOffer[] {
  const seen = new Set<string>();
  const closest: ScoredOffer[] = [];
  for (const scored of ranked) {
    if (closest.length >= count) break;
    const title = normaliseWords(scored.offer.title).join(" ");
    if (seen.has(title)) continue;
    seen.add(title);
    closest.push(scored);
  }
  return closest;
}
