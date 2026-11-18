// Settings sections (pagedesign.md §8.9 design v2.1 [DECIDED 2026-11-18]): one address per
// section, `/[locale]/ayarlar/{section}`, with section names in the page's language; the first
// section is Profil. Sections appear by permission (Application Manager sections need their
// admin key). This PR builds the account sections; the others come with the next PR.
import { type Locale, localizedPath } from "@firsatgeldi/i18n";
import type { PermissionKey } from "@firsatgeldi/contracts";
import { Globe, KeyRound, type LucideIcon, ShieldCheck, Eye, UserRound } from "lucide-react";

export const SETTINGS_SECTIONS = [
  { id: "profile", slug: { tr: "profil", en: "profile" }, icon: UserRound, permission: "account.own.write" },
  { id: "access", slug: { tr: "eposta-ve-sifre", en: "email-and-password" }, icon: KeyRound, permission: "account.own.view" },
  { id: "security", slug: { tr: "guvenlik", en: "security" }, icon: ShieldCheck, permission: "account.own.view" },
  { id: "look", slug: { tr: "dil-ve-gorunum", en: "language-and-theme" }, icon: Globe, permission: "account.own.write" },
  { id: "privacy", slug: { tr: "gizlilik", en: "privacy" }, icon: Eye, permission: "account.own.write" },
] as const satisfies readonly { id: string; slug: Record<Locale, string>; icon: LucideIcon; permission: PermissionKey }[];

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];
export const FIRST_SETTINGS_SECTION: SettingsSectionId = "profile";

/** `/tr/ayarlar/profil` · `/en/settings/profile`. */
export function settingsHref(locale: Locale, id: SettingsSectionId = FIRST_SETTINGS_SECTION): string {
  const section = SETTINGS_SECTIONS.find((entry) => entry.id === id) ?? SETTINGS_SECTIONS[0];
  return localizedPath("/ayarlar/[section]", locale, { section: section.slug[locale] });
}

/** The section a slug names in that language, or null (a slug of the other language is not found). */
export function sectionBySlug(locale: Locale, slug: string): SettingsSectionId | null {
  return SETTINGS_SECTIONS.find((entry) => entry.slug[locale] === slug)?.id ?? null;
}

/** The sections this user can open. */
export function visibleSections(permissions: readonly PermissionKey[]) {
  return SETTINGS_SECTIONS.filter((entry) => permissions.includes(entry.permission));
}
