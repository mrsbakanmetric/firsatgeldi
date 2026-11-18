// After "Hesabımı sil" the user is signed out and Home opens with an information banner
// (modules.md Settings and Account [DECIDED 2026-11-18]); the restore date travels in the address.

/** The Home banner's query parameter: the restore date, YYYY-MM-DD. */
export const DELETION_PARAM = "deletion";

/** `/tr` → `/tr?deletion=2026-12-18`. */
export function deletionHomeHref(home: string, purgeAfter: string): string {
  return `${home}?${new URLSearchParams({ [DELETION_PARAM]: purgeAfter.slice(0, 10) }).toString()}`;
}

/** The restore date from an address query, or null when there is none or it is not a date. */
export function deletionDate(search: string | null): Date | null {
  const value = search === null ? null : new URLSearchParams(search).get(DELETION_PARAM);
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  // Noon UTC: the same calendar day in every time zone the app formats in.
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}
