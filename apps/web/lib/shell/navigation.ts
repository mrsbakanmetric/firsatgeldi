// Navigation of the shells (pagedesign.md §2, product_design_pattern.md §5.21).
// Pure data + functions, so the order and the "current section" rule are tested
// without rendering.
import { localizedPath, matchLocalizedPath, PATH_SEGMENTS, type Locale, type Route, type TranslationKey } from "@firsatgeldi/i18n";

export interface NavEntry {
  id: string;
  route: Route;
  label: TranslationKey;
}

/** Main navigation, fixed order [DECIDED 2026-11-12]: Ana Sayfa · Takip · Ara ve Ekle · Keşfet · Kazancım. */
export const APP_NAV = [
  { id: "home", route: "/", label: "shell.nav.home" },
  { id: "tracking", route: "/takip", label: "shell.nav.tracking" },
  { id: "search", route: "/ara", label: "shell.nav.search" },
  { id: "discover", route: "/kesfet", label: "shell.nav.discover" },
  { id: "savings", route: "/kazancim", label: "shell.nav.savings" },
] as const satisfies readonly NavEntry[];

/**
 * Phone bottom tab bar: which five items is [DECIDE LATER — with the mobile app designs];
 * until then Ana Sayfa · Takip · Ara ve Ekle · Kazancım + Profil (§5.21). Profil is added by the shell.
 */
export const TAB_BAR_IDS = ["home", "tracking", "search", "savings"] as const;

/**
 * Settings section the profile menu's "Ayarlar" entry opens. Section names are
 * added with the Settings and Account screen (architecture.md §21.1); until then
 * the first section of the menu entry list (Bildirimler) is used.
 */
export const DEFAULT_SETTINGS_SECTION = "bildirimler";

/** Footer links (pagedesign.md §2.1): KVKK · Koşullar · Çerezler · Komisyon · Yardım. */
export const FOOTER_LINKS = [
  { id: "privacy", route: "/kvkk", label: "shell.footer.privacy", short: "shell.footer.privacyShort" },
  { id: "terms", route: "/kosullar", label: "shell.footer.terms", short: "shell.footer.termsShort" },
  { id: "cookies", route: "/cerezler", label: "shell.footer.cookies", short: "shell.footer.cookiesShort" },
  { id: "commission", route: "/komisyon", label: "shell.footer.commission", short: "shell.footer.commissionShort" },
  { id: "help", route: "/yardim", label: "shell.footer.help", short: "shell.footer.helpShort" },
] as const satisfies ReadonlyArray<NavEntry & { short: TranslationKey }>;

/** AuthShell's minimal footer: KVKK, Koşullar, Çerezler, Yardım (§2.2). */
export const AUTH_FOOTER_IDS = ["privacy", "terms", "cookies", "help"] as const;

/**
 * Landing navigation for guests (§2.1). The first three are sections of the
 * Landing Page (anchors filled when that page is built, plan step 17).
 */
export const LANDING_NAV = [
  { id: "how-it-works", route: "/", hash: "how-it-works", label: "shell.guestNav.howItWorks" },
  { id: "examples", route: "/", hash: "examples", label: "shell.guestNav.examples" },
  { id: "rights", route: "/", hash: "rights", label: "shell.guestNav.rights" },
  { id: "help", route: "/yardim", label: "shell.guestNav.help" },
] as const satisfies ReadonlyArray<NavEntry & { hash?: string }>;

/**
 * AdminShell menu (§2.3): Genel bakış · Kullanıcılar · Ürünler · Kaynaklar · Suistimal · Sistem.
 * Module routes are added with the Application Manager screens (Phase 3); until
 * then a section without its own route opens the overview. The second-row
 * sub-navigation is [RECOMMENDED] and not built.
 */
export const ADMIN_NAV = [
  { id: "overview", route: "/admin", label: "shell.admin.overview" },
  { id: "users", route: "/admin/roller", label: "shell.admin.users" },
  { id: "products", route: "/admin", label: "shell.admin.products" },
  { id: "sources", route: "/admin", label: "shell.admin.sources" },
  { id: "fraud", route: "/admin/suistimal", label: "shell.admin.fraud" },
  { id: "system", route: "/admin/gecmis", label: "shell.admin.system" },
] as const satisfies readonly NavEntry[];

export type AppNavId = (typeof APP_NAV)[number]["id"];

/** Public URL of a static route in a language. */
export function hrefFor(route: Exclude<Route, `${string}[${string}`>, locale: Locale): string {
  return localizedPath(route, locale);
}

/** True when `pathname` (the address bar, with locale) is inside `href`. Home matches only itself. */
export function isWithin(pathname: string, href: string, locale: Locale): boolean {
  const home = `/${locale}`;
  if (href === home) return pathname === home || pathname === `${home}/`;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The main-navigation section the page belongs to, if any. */
export function currentAppSection(pathname: string, locale: Locale): AppNavId | null {
  return APP_NAV.find((entry) => isWithin(pathname, localizedPath(entry.route, locale), locale))?.id ?? null;
}

/** True on pages opened from the profile menu (Profilim, Paketim, Ayarlar). */
/** Base of every Settings section URL: /tr/ayarlar, /en/settings. */
export function settingsBase(locale: Locale): string {
  return `/${locale}/${PATH_SEGMENTS.ayarlar[locale]}`;
}

export function isProfileMenuPage(pathname: string, locale: Locale): boolean {
  return [localizedPath("/profil", locale), localizedPath("/paketim", locale), settingsBase(locale)].some((href) => isWithin(pathname, href, locale));
}

/** The same page in another language: /tr/takip → /en/tracking. Unknown paths keep their segments. */
export function switchLocalePath(pathname: string, from: Locale, to: Locale): string {
  const rest = pathname.replace(new RegExp(`^/${from}(?=/|$)`), "") || "/";
  const target = matchLocalizedPath(rest, to)?.canonical ?? rest;
  return `/${to}${target === "/" ? "" : target}`;
}
