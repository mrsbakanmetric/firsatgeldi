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
  /** The model as the name writes it, from the line to the last series word ("airpods pro 3", "iphone 18 pro max"). */
  readonly model: string | null;
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

interface ModelReading {
  readonly generation: ProductAttributes["generation"];
  readonly model: string | null;
}

/**
 * The model line, its generation number and the model as written. Series words may sit
 * between the line and the number ("airpods pro 3": line "airpods", generation 3) or after
 * the number ("iphone 18 pro max"); the model keeps them in place ("airpods pro 3",
 * "iphone 18 pro max"). The brand is never the line.
 */
function modelOf(words: readonly string[], brand: readonly string[]): ModelReading {
  for (let index = 1; index < words.length; index += 1) {
    const number = words[index] ?? "";
    if (!DIGITS.test(number)) continue;
    let start = index - 1;
    while (start > 0 && SERIES_WORDS.has(words[start] ?? "")) start -= 1;
    const line = words[start] ?? "";
    if (!LETTERS.test(line) || line.length < 2 || !isKeyWord(line) || brand.includes(line) || SERIES_WORDS.has(line)) continue;
    let end = index + 1;
    while (end < words.length && SERIES_WORDS.has(words[end] ?? "")) end += 1;
    return { generation: { line, number }, model: words.slice(start, end).join(" ") };
  }
  return { generation: null, model: null };
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
  const { generation, model } = modelOf(words, brand);
  return {
    generation,
    model,
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
