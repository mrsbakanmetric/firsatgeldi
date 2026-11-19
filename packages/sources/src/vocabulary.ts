// Words and normalising shared by link reading (link-text.ts, attributes.ts) and the product
// match (matching.ts). Every list holds folded forms (lower case, Turkish letters folded to
// ASCII): store slugs drop Turkish letters ("ayakkabisi"), offer titles keep them, and both
// are folded before they are compared.
//
// These lists are the rules layer of link reading. They cover what rules read reliably:
// units, colours, series words, condition, gender. The category and anything else that
// depends on the kind of product is not guessed here.

// ── Model codes and measures ────────────────────────────────────────────────────────

const HAS_DIGIT = /\d/;
const HAS_LETTER = /[a-z]/;
/** A model code word mixes letters and digits and is at least this long ("1042a237", "ep2231", "1000xm5"); shorter ones are name parts ("v15", "s24"). */
const MODEL_CODE_MIN_LENGTH = 5;
/** A number with a unit is a size, capacity or resolution, never a model code ("256gb", "1tb", "40mm", "1080p"). */
export const MEASURE = /^\d+(?:[.,]\d+)?(?:gb|tb|mb|mm|cm|inc|inch|w|mah|hz|mp|k|p|ml|lt|kg|gr|g)$/;

export const isCodeWord = (word: string): boolean => word.length >= MODEL_CODE_MIN_LENGTH && HAS_DIGIT.test(word) && HAS_LETTER.test(word) && !MEASURE.test(word);

/** Units whose values are compared; storage in GB. */
export const DIMENSIONS: Readonly<Record<string, { readonly dimension: Dimension; readonly factor: number }>> = {
  mb: { dimension: "storage", factor: 1 / 1024 },
  gb: { dimension: "storage", factor: 1 },
  tb: { dimension: "storage", factor: 1024 },
  mm: { dimension: "mm", factor: 1 },
  inc: { dimension: "inch", factor: 1 },
  inch: { dimension: "inch", factor: 1 },
  w: { dimension: "watt", factor: 1 },
};

export type Dimension = "storage" | "mm" | "inch" | "watt";

const MEASURE_PARTS = /^(\d+(?:[.,]\d+)?)([a-z]+)$/;

/** Values per dimension in a word list ("512gb" → storage 512, "1tb" → storage 1024, "40mm" → mm 40). */
export function measuresOf(words: readonly string[]): Map<Dimension, Set<number>> {
  const result = new Map<Dimension, Set<number>>();
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

/** One inch in centimetres: a screen size is written twice, "75-190" or "40-102". */
const CM_PER_INCH = 2.54;
/** Rounding slack for the centimetre value ("75" → 190.5 → "190"). */
const SCREEN_SIZE_SLACK_CM = 1.5;
const NUMBER_WORD = /^\d+$/;

/** "75-190" / "40-102": a screen size in inches and centimetres, not part of a model code. */
export function isScreenSize(inches: string | undefined, centimetres: string | undefined): boolean {
  if (inches === undefined || centimetres === undefined || !NUMBER_WORD.test(inches) || !NUMBER_WORD.test(centimetres)) return false;
  return Math.abs(Number(inches) * CM_PER_INCH - Number(centimetres)) <= SCREEN_SIZE_SLACK_CM;
}

// ── Word lists ──────────────────────────────────────────────────────────────────────

/** Words that say nothing about which product it is; dropped from the search text and the score. */
export const GENERIC_WORDS = new Set(["akilli", "telefon", "telefonu", "cep", "ekran", "uydu", "alicili"]);
export const STOP_WORDS = new Set(["ve", "ile", "and"]);
/** Series words: an offer with one the link does not have is another product ("Pro Max", "Plus", "Cellular", noise cancelling). */
export const SERIES_WORDS = new Set(["pro", "max", "plus", "ultra", "mini", "lite", "sonic", "flow", "maxv", "cellular", "anc", "noise", "gurultu"]);
export const PACK_WORDS = new Set(["pack", "paket", "set", "seti", "bundle"]);
/** "2li", "3lu" ("2'li", "3'lü" after folding). */
export const PACK_COUNT = /^((?:[2-9]|\d{2,}))l[iu]$/;
export const ACCESSORY_WORDS = new Set(["uyumlu", "icin", "kilif", "kumanda", "kumandasi", "braket", "braketi", "yedek", "compatible", "fircasi", "dahildegildir"]);
export const CONDITION_WORDS = new Set(["yenilenmis", "teshir", "vitrin", "outlet", "used", "refurbished", "acikkutu", "ikinciel", "secondhand"]);
/** Words of foreign listings seen in round 1 (Italian, German, English). */
export const FOREIGN_WORDS = new Set(["con", "per", "miglior", "prezzo", "und", "mit", "with", "the", "for"]);

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
  // Screen resolutions, not series words: "4K Ultra HD" is not an "Ultra" model (data test, link 2).
  "ultra hd": "ultrahd",
  "full hd": "fullhd",
};

/** English colour names (titles, some store slugs), read as the Turkish ones the store links use. */
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
  burgundy: "bordo",
  bordeaux: "bordo",
  burgonya: "bordo",
  navy: "lacivert",
  beige: "bej",
  brown: "kahverengi",
  cream: "krem",
};

export type ColourKey =
  | "BLACK" | "WHITE" | "BLUE" | "RED" | "GREEN" | "GRAY" | "SILVER" | "GOLD" | "PINK" | "PURPLE" | "BURGUNDY" | "NAVY" | "CREAM"
  | "ORANGE" | "YELLOW" | "BROWN" | "BEIGE" | "MIDNIGHT" | "STARLIGHT" | "SPACE_GRAY" | "SAND_BEIGE";

/** Colour words (after synonyms and phrases) and the language-neutral key the screens translate. */
export const COLOUR_KEYS: Readonly<Record<string, ColourKey>> = {
  siyah: "BLACK",
  beyaz: "WHITE",
  mavi: "BLUE",
  kirmizi: "RED",
  yesil: "GREEN",
  gri: "GRAY",
  gumus: "SILVER",
  altin: "GOLD",
  pembe: "PINK",
  mor: "PURPLE",
  bordo: "BURGUNDY",
  lacivert: "NAVY",
  krem: "CREAM",
  turuncu: "ORANGE",
  sari: "YELLOW",
  kahverengi: "BROWN",
  bej: "BEIGE",
  geceyarisi: "MIDNIGHT",
  yildizisigi: "STARLIGHT",
  uzaygrisi: "SPACE_GRAY",
  kumbeji: "SAND_BEIGE",
};

export type Gender = "WOMEN" | "MEN" | "UNISEX" | "KIDS";

export const GENDER_WORDS: Readonly<Record<string, Gender>> = {
  kadin: "WOMEN",
  bayan: "WOMEN",
  women: "WOMEN",
  womens: "WOMEN",
  erkek: "MEN",
  men: "MEN",
  mens: "MEN",
  unisex: "UNISEX",
  cocuk: "KIDS",
  kids: "KIDS",
};

// ── Normalising ─────────────────────────────────────────────────────────────────────

/** "mxp63tu/a" → "mxp63tu". */
const PART_SUFFIX = /\b([a-z0-9]{4,})\/[a-z]\b/g;
/** "36.000" → "36000". */
const THOUSANDS = /(\d)[.,](\d{3})(?!\d)/g;
/** "2'li" → "2li", "43''" → "43". */
const APOSTROPHES = /['’`]/g;
const NON_WORD = /[^a-z0-9]+/;
export const DIGITS = /^\d+$/;
export const LETTERS = /^[a-z]+$/;
export const SINGLE_LETTER = /^[a-z]$/;

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

/** A word that says something about the product (not generic, not a stop word, not a single letter). */
export const isKeyWord = (word: string): boolean => !GENERIC_WORDS.has(word) && !STOP_WORDS.has(word) && !SINGLE_LETTER.test(word);
