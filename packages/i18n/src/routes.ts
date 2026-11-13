// Localised URLs (architecture.md §19, §21.1). Pages live under Turkish folder
// names (the internal path); each language has its own path segments:
// /tr/takip/42 ↔ /en/tracking/42. Dynamic parts ([id], [slug]) are not translated.
import { LOCALES, type Locale } from "./locales";

/** Translated static path segments, keyed by the internal (Turkish folder) name. */
export const PATH_SEGMENTS = {
  ara: { tr: "ara", en: "search" },
  takip: { tr: "takip", en: "tracking" },
  bildirimler: { tr: "bildirimler", en: "notifications" },
  kazancim: { tr: "kazancim", en: "savings" },
  paketim: { tr: "paketim", en: "plan" },
  ayarlar: { tr: "ayarlar", en: "settings" },
  kesfet: { tr: "kesfet", en: "discover" },
  profil: { tr: "profil", en: "profile" },
  u: { tr: "u", en: "u" },
  urun: { tr: "urun", en: "product" },
  yardim: { tr: "yardim", en: "help" },
  iletisim: { tr: "iletisim", en: "contact" },
  kvkk: { tr: "kvkk", en: "privacy" },
  kosullar: { tr: "kosullar", en: "terms" },
  cerezler: { tr: "cerezler", en: "cookies" },
  komisyon: { tr: "komisyon", en: "commission" },
  giris: { tr: "giris", en: "sign-in" },
  "sifre-sifirla": { tr: "sifre-sifirla", en: "reset-password" },
  dogrula: { tr: "dogrula", en: "verify" },
  admin: { tr: "admin", en: "admin" },
  gecmis: { tr: "gecmis", en: "history" },
  suistimal: { tr: "suistimal", en: "fraud" },
  roller: { tr: "roller", en: "roles" },
} as const satisfies Record<string, Record<Locale, string>>;

type Segment = keyof typeof PATH_SEGMENTS;

/** Every page route, as its internal path (architecture.md §21.1). */
export const ROUTES = [
  "/",
  "/ara",
  "/takip",
  "/takip/[id]",
  "/bildirimler",
  "/kazancim",
  "/paketim",
  "/ayarlar/[section]",
  "/kesfet",
  "/profil",
  "/u/[username]",
  "/urun/[slug]",
  "/yardim",
  "/yardim/[slug]",
  "/yardim/iletisim",
  "/kvkk",
  "/kosullar",
  "/cerezler",
  "/komisyon",
  "/giris",
  "/sifre-sifirla",
  "/dogrula",
  "/admin",
  "/admin/gecmis",
  "/admin/suistimal",
  "/admin/roller",
] as const;

export type Route = (typeof ROUTES)[number];

type ParamNames<R extends string> = R extends `${string}[${infer P}]${infer Rest}` ? P | ParamNames<Rest> : never;
export type RouteParams<R extends Route> = [ParamNames<R>] extends [never] ? undefined : Record<ParamNames<R>, string>;

const split = (path: string) => path.split("/").filter(Boolean);
const isDynamic = (segment: string) => segment.startsWith("[") && segment.endsWith("]");

/** Public URL for a route in a language: localizedPath("/takip/[id]", "en", { id: "42" }) → "/en/tracking/42". */
export function localizedPath<R extends Route>(route: R, locale: Locale, ...[params]: RouteParams<R> extends undefined ? [] : [RouteParams<R>]): string {
  const values = (params ?? {}) as Record<string, string>;
  const parts = split(route).map((segment) => {
    if (isDynamic(segment)) {
      const value = values[segment.slice(1, -1)];
      if (value === undefined) throw new Error(`Missing route parameter ${segment} for ${route}`);
      return encodeURIComponent(value);
    }
    return PATH_SEGMENTS[segment as Segment][locale];
  });
  return `/${[locale, ...parts].join("/")}`;
}

export interface RouteMatch {
  route: Route;
  /** Path the app router serves (Turkish folder names), without the locale. */
  internal: string;
  /** Path the address bar should show for this language, without the locale. */
  canonical: string;
}

/**
 * Matches a path (after the locale) written in any language's segments.
 * Static segments win over dynamic ones ("/yardim/iletisim" before "/yardim/[slug]").
 * Unknown paths return null and are left to the app router (404).
 */
export function matchLocalizedPath(path: string, locale: Locale): RouteMatch | null {
  const parts = split(path);
  let best: { route: Route; staticCount: number; internal: string[]; canonical: string[] } | null = null;
  for (const route of ROUTES) {
    const pattern = split(route);
    if (pattern.length !== parts.length) continue;
    const internal: string[] = [];
    const canonical: string[] = [];
    let staticCount = 0;
    const matches = pattern.every((segment, index) => {
      const part = parts[index] ?? "";
      if (isDynamic(segment)) {
        internal.push(part);
        canonical.push(part);
        return true;
      }
      const forms = PATH_SEGMENTS[segment as Segment];
      if (!LOCALES.some((other) => forms[other] === part)) return false;
      staticCount += 1;
      internal.push(segment);
      canonical.push(forms[locale]);
      return true;
    });
    if (matches && (!best || staticCount > best.staticCount)) best = { route, staticCount, internal, canonical };
  }
  if (!best) return null;
  return { route: best.route, internal: `/${best.internal.join("/")}`, canonical: `/${best.canonical.join("/")}` };
}
