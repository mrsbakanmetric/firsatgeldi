// Product attributes from words — the rules layer of link reading. Reads only what rules
// read reliably in any category: the model line and its generation number, series words,
// storage, screen size, sizes in mm, power, colours, gender and pack size. The category and
// category-specific fields (clothing size, material …) are not guessed here.
//
// Works on normalised words (vocabulary.ts `normaliseWords`), so the same reader serves a
// link reading and an offer title.
import {
  COLOUR_KEYS,
  type ColourKey,
  DIGITS,
  type Gender,
  GENDER_WORDS,
  isKeyWord,
  isScreenSize,
  LETTERS,
  measuresOf,
  PACK_COUNT,
  PACK_WORDS,
  SERIES_WORDS,
} from "./vocabulary.ts";

export interface ProductAttributes {
  /** The model line and its generation number ("iphone" 18, "se" 3, "saros" 20, "dedicate" 8). */
  readonly generation: { readonly line: string; readonly number: string } | null;
  /** Series words in reading order ("pro", "max"). */
  readonly series: readonly string[];
  readonly storageGb: number | null;
  /** From "65 inç" or the inch–centimetre pair stores write ("75-190"). */
  readonly screenInch: number | null;
  readonly sizeMm: number | null;
  readonly powerW: number | null;
  /** Language-neutral keys; screens translate them. */
  readonly colours: readonly ColourKey[];
  readonly gender: Gender | null;
  /** Items in the pack ("2'li", "2-pack"); null for a single item. */
  readonly packCount: number | null;
}

const first = (values: ReadonlySet<number> | undefined): number | null => (values && values.size > 0 ? ([...values][0] ?? null) : null);
const unique = <T>(values: readonly T[]): T[] => [...new Set(values)];

function generationOf(words: readonly string[], brand: readonly string[]): ProductAttributes["generation"] {
  for (let index = 0; index < words.length - 1; index += 1) {
    const line = words[index] ?? "";
    const number = words[index + 1] ?? "";
    if (LETTERS.test(line) && line.length > 1 && isKeyWord(line) && !brand.includes(line) && DIGITS.test(number)) return { line, number };
  }
  return null;
}

function screenInchOf(words: readonly string[], inches: number | null): number | null {
  if (inches !== null) return inches;
  for (let index = 0; index < words.length - 1; index += 1) {
    if (isScreenSize(words[index], words[index + 1])) return Number(words[index]);
  }
  return null;
}

function packCountOf(words: readonly string[]): number | null {
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index] ?? "";
    const counted = PACK_COUNT.exec(word)?.[1];
    if (counted) return Number(counted);
    const next = words[index + 1];
    if (DIGITS.test(word) && Number(word) > 1 && next !== undefined && PACK_WORDS.has(next)) return Number(word);
  }
  return null;
}

function genderOf(words: readonly string[]): Gender | null {
  const genders = words.map((word) => GENDER_WORDS[word]).filter((gender): gender is Gender => gender !== undefined);
  if (genders.includes("KIDS")) return "KIDS";
  return genders[0] ?? null;
}

/** Attributes read from normalised words; `brand` words are never a model line. */
export function readAttributes(words: readonly string[], brand: readonly string[] = []): ProductAttributes {
  const measures = measuresOf(words);
  return {
    generation: generationOf(words, brand),
    series: unique(words.filter((word) => SERIES_WORDS.has(word))),
    storageGb: first(measures.get("storage")),
    screenInch: screenInchOf(words, first(measures.get("inch"))),
    sizeMm: first(measures.get("mm")),
    powerW: first(measures.get("watt")),
    colours: unique(words.map((word) => COLOUR_KEYS[word]).filter((colour): colour is ColourKey => colour !== undefined)),
    gender: genderOf(words),
    packCount: packCountOf(words),
  };
}
