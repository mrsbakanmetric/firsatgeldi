// Permission catalogue [DECIDED 2026-11-13] (database.md §4). Code checks keys,
// never role names. A new key is added only through a spec PR that updates §4.
import { z } from "zod";

export const PERMISSION_KEYS = [
  "public.view",
  "content.view",
  "catalog.view",
  "search.use",
  "identify.use",
  "upload.own.create",
  // Reading the status of one's own uploads, separate from uploading [DECIDED 2026-11-14].
  "upload.own.view",
  "auth.use",
  "support.own.create",
  "consent.own.write",
  "home.own.view",
  "tracking.own.view",
  "tracking.own.write",
  "reveal.own.use",
  "offer.own.go",
  "checknow.own.use",
  "report.own.create",
  "savings.own.view",
  "savings.own.write",
  "feedback.own.write",
  "notifications.own.view",
  "notifications.own.write",
  "notification_prefs.own.write",
  "packages.own.view",
  "packages.own.request",
  "support.own.view",
  "account.own.view",
  "account.own.write",
  "account.own.view_pii",
  "account.own.export",
  "account.own.delete",
  "search_history.own.hide",
  "community.view",
  "community.own.write",
  "follows.own.write",
  "blocks.own.write",
  "link.own.submit",
  "admin.self.activity.view",
  "admin.self.permissions.view",
  "admin.tracking.view",
  "admin.savings.view",
  "admin.notifications.receive",
  "admin.users.view",
  "admin.users.view_pii",
  "admin.users.suspend",
  "admin.users.restrict",
  "admin.users.view_as",
  "admin.offers.view_hidden_seller",
  "admin.offers.suspend",
  "admin.overview.view",
  "admin.return_rules.view",
  "admin.return_rules.manage",
  "admin.platforms.view",
  "admin.platforms.manage",
  "admin.roles.view",
  "admin.roles.manage",
  "admin.audit.view",
  "admin.audit.export",
  "admin.catalog.view",
  "admin.catalog.manage",
  "admin.category_templates.manage",
  "admin.reports.manage",
  "admin.campaigns.manage",
  "admin.packages.view",
  "admin.packages.manage",
  "admin.packages.grant",
  "admin.support.manage",
  "admin.content.edit",
  "admin.content.publish",
  "admin.notification_templates.manage",
  "admin.settings.view",
  "admin.settings.apply",
  "admin.settings.apply_critical",
  "admin.usage.view",
  "admin.budgets.manage",
  "admin.history.view",
  "admin.history.export",
  "admin.fraud.view",
  "admin.fraud.manage",
  "admin.community.moderate",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export const PermissionKey = z.enum(PERMISSION_KEYS);

/** Roles are data (database.md §4); codes of the two system roles. */
export const RoleCode = z.enum(["APP_MANAGER", "USER"]);
export type RoleCode = z.infer<typeof RoleCode>;

const ADMIN_PREFIX = "admin.";

/** Seed rule (database.md §4): USER holds every non-admin key; APP_MANAGER holds every key. */
export function seedPermissions(role: RoleCode): PermissionKey[] {
  return role === "APP_MANAGER" ? [...PERMISSION_KEYS] : PERMISSION_KEYS.filter((key) => !key.startsWith(ADMIN_PREFIX));
}
