// Message lookup with {placeholder} interpolation and plural selection.
import { formatNumber, pluralCategory } from "@firsatgeldi/core";
import { en } from "./catalogues/en";
import { tr } from "./catalogues/tr";
import type { Locale } from "./locales";
import type { Message, MessageKey, MessageTree, MessageValues, PluralKey } from "./types";

export const catalogues = { tr, en } as const satisfies Record<Locale, MessageTree>;

export type TranslationKey = MessageKey<typeof tr>;
export type PluralTranslationKey = PluralKey<typeof tr>;

const PLACEHOLDER = /\{(\w+)\}/g;

function lookup(tree: MessageTree, key: string): Message {
  let node: Message | MessageTree | undefined = tree;
  for (const part of key.split(".")) {
    node = typeof node === "object" && !("other" in node && typeof node.other === "string") ? (node as MessageTree)[part] : undefined;
  }
  if (typeof node === "string" || (typeof node === "object" && typeof node.other === "string")) return node as Message;
  throw new Error(`Unknown message key "${key}"`);
}

/** Replaces {name} with values; numbers use the locale's number format. */
export function interpolate(template: string, values: MessageValues, locale: string): string {
  return template.replace(PLACEHOLDER, (match, name: string) => {
    const value = values[name];
    if (value === undefined) throw new Error(`Missing value "${name}" for message "${template}"`);
    return typeof value === "number" ? formatNumber(value, locale) : value;
  });
}

export interface Translator {
  readonly locale: Locale;
  (key: TranslationKey, values?: MessageValues): string;
}

/**
 * Translator for one language. Plural messages need a numeric `count`;
 * the category comes from Intl.PluralRules ("one", "other", …).
 */
export function createTranslator(locale: Locale, catalogue: MessageTree = catalogues[locale]): Translator {
  const translate = (key: TranslationKey, values: MessageValues = {}) => {
    const message = lookup(catalogue, key);
    if (typeof message === "string") return interpolate(message, values, locale);
    const count = values["count"];
    if (typeof count !== "number") throw new Error(`Plural message "${key}" needs a numeric "count"`);
    const text = message[pluralCategory(count, locale)] ?? message.other;
    return interpolate(text, values, locale);
  };
  return Object.assign(translate, { locale });
}
