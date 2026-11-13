// Catalogue shape. The Turkish catalogue is the reference; every other
// language must have exactly the same keys (checked by the compiler, so a
// missing key breaks typecheck, build and CI).

/** A plural message: one text per CLDR plural category; "other" is always required. */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

export type Message = string | PluralMessage;

export interface MessageTree {
  readonly [key: string]: Message | MessageTree;
}

/** Same keys as T, any text (used to type the other languages against Turkish). */
export type CatalogueShape<T> = T extends string
  ? string
  : T extends { other: string }
    ? PluralMessage
    : { readonly [K in keyof T]: CatalogueShape<T[K]> };

/** Dotted paths to every message in T ("meta.title"). */
export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends string ? K : T[K] extends { other: string } ? K : `${K}.${MessageKey<T[K]>}`;
}[keyof T & string];

/** Dotted paths to plural messages only (they need a count). */
export type PluralKey<T> = {
  [K in keyof T & string]: T[K] extends string ? never : T[K] extends { other: string } ? K : `${K}.${PluralKey<T[K]>}`;
}[keyof T & string];

export type MessageValues = Readonly<Record<string, string | number>>;
