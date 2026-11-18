// ME endpoints (architecture.md §16 ME; database.md §3 `users`).
import { z } from "zod";
import { ApiLocale, CategoryRef, Cursor, Id, ImageSha256, Timestamp } from "./common";
import { PermissionKey, RoleCode } from "./permissions";

/**
 * `GET /me` — the signed-in user (architecture.md §16: name, username, language,
 * theme, privacy; e-mail/phone masked §15.2). Without a session the API answers
 * UNAUTHENTICATED: the caller is a guest (no guest role, database.md §4).
 * `roles` and `permissions` let the UI show and hide actions the same way the
 * server checks them (implementation_plan.md §4 "Mock session").
 */
export const Me = z.object({
  id: Id,
  displayName: z.string().nullable(),
  username: z.string().nullable(),
  emailMasked: z.string().nullable(),
  phoneMasked: z.string().nullable(),
  locale: ApiLocale,
  theme: z.enum(["light", "dark", "system"]),
  privacyLevel: z.enum(["EVERYONE", "FOLLOWERS", "ONLY_ME"]),
  /** Optional profile photo [DECIDED 2026-11-18]; null = initials. Served by `GET /img/:sha256/:variant` [ASSUMPTION — field]. */
  avatarSha256: ImageSha256.nullable(),
  roles: z.array(RoleCode),
  permissions: z.array(PermissionKey),
});
export type Me = z.infer<typeof Me>;

/** Where a search came from (database.md §11 `search_events.source`). */
export const SearchSource = z.enum(["SEARCH_BOX", "AUTOCOMPLETE", "LINK", "PHOTO"]);

/** `GET /me/search-history?q=&category=&cursor=` — own searches, hidden ones left out (architecture.md §16). */
export const SearchHistoryQuery = z.object({ q: z.string().trim().max(80).optional(), category: Id.optional(), cursor: Cursor.optional() });

/**
 * The product a search matched — image, name, category and whether the user tracks it; no price
 * (Settings v2.1, 2026-11-18) [ASSUMPTION — field]. Null when the search matched nothing.
 */
export const SearchHistoryProduct = z.object({ id: Id, name: z.string().min(1), imageSha256: ImageSha256.nullable(), category: CategoryRef, tracking: z.boolean() });

export const SearchHistoryItem = z.object({
  id: Id,
  query: z.string().min(1),
  source: SearchSource,
  occurredAt: Timestamp,
  product: SearchHistoryProduct.nullable(),
});
/** Items newest first; `categories` = counts of the matched products' categories after `q` (filter chips). */
export const SearchHistory = z.object({
  items: z.array(SearchHistoryItem),
  facets: z.object({ total: z.number().int().nonnegative(), categories: z.array(z.object({ id: Id, name: z.string().min(1), count: z.number().int().nonnegative() })) }),
});
export type SearchHistory = z.infer<typeof SearchHistory>;
