// Settings and Account fixtures (design "9 Ayarlar" v2.1, Main + Forms): devices, recent
// sign-ins, today's notification count, taken usernames and the Application Manager's own
// audit entries. Made-up data only; no location (decision 2026-11-18).
import type { UserKey } from "./users";

const MINUTE = 1;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Signed-in devices per user; the first is the current device ("Bu cihaz"). Minutes since last use. */
export const SESSION_SEEDS: readonly { deviceType: "DESKTOP" | "PHONE" | "TABLET"; browser: string; os: string; minutesAgo: number }[] = [
  { deviceType: "DESKTOP", browser: "Chrome", os: "Windows", minutesAgo: 0 },
  { deviceType: "PHONE", browser: "Safari", os: "iPhone", minutesAgo: 2 * DAY },
  { deviceType: "DESKTOP", browser: "Firefox", os: "macOS", minutesAgo: 8 * DAY + 3 * HOUR },
];

/** "Son girişler", newest first (design: Google today · e-mail · new device · 2 failed attempts). */
export const SIGN_IN_SEEDS: readonly {
  method: "EMAIL" | "GOOGLE" | "APPLE";
  outcome: "OK" | "FAILED";
  failedCount: number | null;
  newDevice: boolean;
  deviceType: "DESKTOP" | "PHONE" | "TABLET";
  browser: string | null;
  os: string | null;
  minutesAgo: number;
}[] = [
  { method: "GOOGLE", outcome: "OK", failedCount: null, newDevice: false, deviceType: "DESKTOP", browser: "Chrome", os: "Windows", minutesAgo: 3 * HOUR },
  { method: "EMAIL", outcome: "OK", failedCount: null, newDevice: false, deviceType: "PHONE", browser: "Safari", os: "iPhone", minutesAgo: 8 * DAY },
  { method: "EMAIL", outcome: "OK", failedCount: null, newDevice: true, deviceType: "DESKTOP", browser: "Firefox", os: "macOS", minutesAgo: 8 * DAY + 3 * HOUR },
  { method: "EMAIL", outcome: "FAILED", failedCount: 2, newDevice: false, deviceType: "DESKTOP", browser: null, os: null, minutesAgo: 9 * DAY + 18 * HOUR },
];

/** Notifications already sent today ("5 bildirim · bugün 3"). */
export const NOTIFICATIONS_TODAY: Partial<Record<UserKey, number>> = { user: 3 };

/** Last password change ("Son değişiklik 2 Ekim"): days ago. */
export const PASSWORD_CHANGED_DAYS_AGO = 47;
/** Last username change: long enough ago that it can change now. */
export const USERNAME_CHANGED_DAYS_AGO = 60;

/** Usernames other people already use (besides the fixture users'). */
export const TAKEN_USERNAMES: readonly string[] = ["serkan", "admin", "destek", "firsatgeldi"];

/** "2 Uygulama Yöneticisinden biri": holders of the role in the drawn world (the mock signs in one). */
export const APP_MANAGER_HOLDERS = 2;

/**
 * "Yetkilerim" groups (design v2.1): every official admin key (database.md §4) in exactly one group,
 * in the drawn order. A key prefix names its group; the first matching prefix wins.
 */
export const PERMISSION_GROUPS: readonly { id: string; prefixes: readonly string[] }[] = [
  { id: "self", prefixes: ["admin.self."] },
  { id: "users", prefixes: ["admin.users.", "admin.tracking.", "admin.savings."] },
  { id: "catalog", prefixes: ["admin.catalog.", "admin.category_templates.", "admin.offers.", "admin.platforms."] },
  { id: "packages", prefixes: ["admin.packages.", "admin.support.", "admin.reports."] },
  { id: "system", prefixes: ["admin.overview.", "admin.settings.", "admin.return_rules.", "admin.usage.", "admin.budgets.", "admin.notifications."] },
  { id: "security", prefixes: ["admin.fraud.", "admin.audit.", "admin.history.", "admin.roles."] },
  { id: "content", prefixes: ["admin.content.", "admin.notification_templates.", "admin.campaigns.", "admin.community."] },
];

/** "Yönetim etkinliğim" entries (design v2.1), newest first; product entries carry the product key. */
export const ADMIN_ACTIVITY_SEEDS: readonly {
  type: "HIDDEN_SELLER" | "PII" | "SETTING" | "USER_ACTION";
  action: string;
  subject: { kind: "USER"; userNumber: number } | { kind: "PRODUCT"; productKey: "acePro2FlashPrint" | "dysonV15" } | { kind: "SETTING"; key: string; from: string; to: string };
  reasonRef: string | null;
  openMinutes: number | null;
  minutesAgo: number;
}[] = [
  { type: "PII", action: "pii_reveal.email", subject: { kind: "USER", userNumber: 48213 }, reasonRef: "#912", openMinutes: 10, minutesAgo: 25 * MINUTE },
  { type: "HIDDEN_SELLER", action: "hidden_seller.view", subject: { kind: "PRODUCT", productKey: "acePro2FlashPrint" }, reasonRef: "#907", openMinutes: null, minutesAgo: 2 * HOUR },
  { type: "SETTING", action: "settings.change", subject: { kind: "SETTING", key: "notify.daily_cap", from: "4", to: "5" }, reasonRef: null, openMinutes: null, minutesAgo: 5 * HOUR },
  { type: "USER_ACTION", action: "user.suspend", subject: { kind: "USER", userNumber: 51007 }, reasonRef: "#899", openMinutes: null, minutesAgo: 1 * DAY },
  { type: "HIDDEN_SELLER", action: "hidden_seller.view", subject: { kind: "PRODUCT", productKey: "dysonV15" }, reasonRef: "#874", openMinutes: null, minutesAgo: 2 * DAY },
  { type: "PII", action: "pii_reveal.phone", subject: { kind: "USER", userNumber: 47790 }, reasonRef: "#861", openMinutes: 10, minutesAgo: 3 * DAY },
  { type: "SETTING", action: "settings.change", subject: { kind: "SETTING", key: "reveal.open_hours", from: "120", to: "168" }, reasonRef: null, openMinutes: null, minutesAgo: 6 * DAY },
];
