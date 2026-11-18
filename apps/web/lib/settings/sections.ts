// Settings sections (pagedesign.md §8.9 design v2.1 [DECIDED 2026-11-18]): one address per
// section, `/[locale]/ayarlar/{section}`, with section names in the page's language; the first
// section is Profil. Sections appear by permission (Application Manager sections need their
// admin key); "Arama geçmişi" is the users' only — the Application Manager has none (modules.md).
import { type Locale, localizedPath } from "@firsatgeldi/i18n";
import type { PermissionKey, RoleCode } from "@firsatgeldi/contracts";
import { BadgeCheck, Bell, Database, Eye, Globe, History, KeyRound, type LucideIcon, ScrollText, ShieldCheck, UserRound } from "lucide-react";

interface SectionEntry {
  id: string;
  slug: Record<Locale, string>;
  icon: LucideIcon;
  permission: PermissionKey;
  /** Not shown to these roles. */
  hiddenFor?: readonly RoleCode[];
}

/** In the drawn order (design v2.1 Main): the admin sections follow Güvenlik ve cihazlar. */
export const SETTINGS_SECTIONS = [
  { id: "profile", slug: { tr: "profil", en: "profile" }, icon: UserRound, permission: "account.own.write" },
  { id: "access", slug: { tr: "eposta-ve-sifre", en: "email-and-password" }, icon: KeyRound, permission: "account.own.view" },
  { id: "notifications", slug: { tr: "bildirimler", en: "notifications" }, icon: Bell, permission: "notification_prefs.own.write" },
  { id: "security", slug: { tr: "guvenlik", en: "security" }, icon: ShieldCheck, permission: "account.own.view" },
  { id: "permissions", slug: { tr: "yetkilerim", en: "permissions" }, icon: BadgeCheck, permission: "admin.self.permissions.view" },
  { id: "activity", slug: { tr: "yonetim-etkinligim", en: "admin-activity" }, icon: ScrollText, permission: "admin.self.activity.view" },
  { id: "history", slug: { tr: "arama-gecmisi", en: "search-history" }, icon: History, permission: "search_history.own.hide", hiddenFor: ["APP_MANAGER"] },
  { id: "look", slug: { tr: "dil-ve-gorunum", en: "language-and-theme" }, icon: Globe, permission: "account.own.write" },
  { id: "privacy", slug: { tr: "gizlilik", en: "privacy" }, icon: Eye, permission: "account.own.write" },
  { id: "data", slug: { tr: "verilerim", en: "data" }, icon: Database, permission: "account.own.export" },
] as const satisfies readonly SectionEntry[];

export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];
export const FIRST_SETTINGS_SECTION: SettingsSectionId = "profile";

/** `/tr/ayarlar/profil` · `/en/settings/profile`. */
export function settingsHref(locale: Locale, id: SettingsSectionId = FIRST_SETTINGS_SECTION): string {
  const section = SETTINGS_SECTIONS.find((entry) => entry.id === id) ?? SETTINGS_SECTIONS[0];
  return localizedPath("/ayarlar/[section]", locale, { section: section.slug[locale] });
}

/** `?islem=sifre`: E-posta ve şifre opens "Şifreni değiştir" (a new-device notification's "Ben değilim"). */
export const ACTION_PARAM = "islem";
export const CHANGE_PASSWORD = "sifre";

/** E-posta ve şifre with the change-password dialog open. */
export function changePasswordHref(locale: Locale): string {
  return `${settingsHref(locale, "access")}?${new URLSearchParams({ [ACTION_PARAM]: CHANGE_PASSWORD }).toString()}`;
}

/** The section a slug names in that language, or null (a slug of the other language is not found). */
export function sectionBySlug(locale: Locale, slug: string): SettingsSectionId | null {
  return SETTINGS_SECTIONS.find((entry) => entry.slug[locale] === slug)?.id ?? null;
}

/** The sections this user can open. */
export function visibleSections(permissions: readonly PermissionKey[], roles: readonly RoleCode[] = []) {
  return SETTINGS_SECTIONS.filter((entry: SectionEntry) => permissions.includes(entry.permission) && !entry.hiddenFor?.some((role) => roles.includes(role)));
}
