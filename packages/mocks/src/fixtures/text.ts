// Fixture texts exist in every supported language (implementation_plan.md §5 rule 3).
import type { ApiLocale } from "@firsatgeldi/contracts";

export type Localized = Readonly<Record<ApiLocale, string>>;

export function text(tr: string, en: string): Localized {
  return { tr, en };
}

export function pick(value: Localized, locale: ApiLocale): string {
  return value[locale];
}
