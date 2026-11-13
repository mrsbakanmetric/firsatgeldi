// ME endpoints (architecture.md §16 ME; database.md §3 `users`).
import { z } from "zod";
import { ApiLocale, Id, Timestamp } from "./common";
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
  roles: z.array(RoleCode),
  permissions: z.array(PermissionKey),
});
export type Me = z.infer<typeof Me>;

/** Where a search came from (database.md §11 `search_events.source`). */
export const SearchSource = z.enum(["SEARCH_BOX", "AUTOCOMPLETE", "LINK", "PHOTO"]);

/** `GET /me/search-history` — own searches, hidden entries excluded (architecture.md §16). */
export const SearchHistoryItem = z.object({
  id: Id,
  query: z.string().min(1),
  source: SearchSource,
  occurredAt: Timestamp,
});
export const SearchHistory = z.object({ items: z.array(SearchHistoryItem) });
export type SearchHistory = z.infer<typeof SearchHistory>;
