// Settings and Account on the mock API (step 19 PR 1): the decisions of 2026-11-18, personal
// data (masked everywhere; the full own value only after re-authentication, each reveal
// logged), admin-only sections closed on the server, and the activity row of every write.
import { ApiError, type ApiErrorBody, PERMISSION_KEYS, TimeSlots } from "@firsatgeldi/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MOCK_PASSWORD } from "./fixtures/accounts";
import { USERS } from "./fixtures/users";
import { SYSTEM_SETTINGS } from "./settings";
import type { MockMail } from "./state";
import { createTestApi } from "./test/harness";

const t = createTestApi({ seedTracking: true });
const { api, controller } = t;
const mails: MockMail[] = [];
controller.onMail = (mail) => mails.push(mail);
const MINUTE_MS = 60_000;
const SENA_EMAIL = "sena@ornek.test";
const SENA_PHONE = USERS.user.phone ?? "";

beforeAll(() => t.server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  t.signInAs("user");
  t.resetClock();
  controller.state.access.clear();
  controller.state.loginFailures.clear();
});
afterAll(() => t.server.close());

async function failure(promise: Promise<unknown>): Promise<ApiErrorBody> {
  const error = await promise.then(() => undefined, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return (error as ApiError).body as ApiErrorBody;
}
const last = () => controller.state.activity.at(-1);
const reauth = () => api.call("reauth", { body: { method: "PASSWORD", password: MOCK_PASSWORD } });

describe("profile (PATCH /me)", () => {
  it("saves name, language, theme and privacy; GET /me shows them; the row names the fields only", async () => {
    const { data } = await api.call("updateMe", { body: { displayName: "Sena Bal", locale: "en", theme: "dark", privacyLevel: "FOLLOWERS" } });
    expect(data).toMatchObject({ displayName: "Sena Bal", locale: "en", theme: "dark", privacyLevel: "FOLLOWERS", avatarSha256: null });
    expect((await api.call("getMe", {})).data.theme).toBe("dark");
    expect(last()).toMatchObject({ action: "settings.change", outcome: "OK", metadata: { section: "profile", fields: ["displayName", "locale", "theme", "privacyLevel"] } });
  });

  it("username: rules, taken → three free suggestions, then once in 30 days", async () => {
    expect((await api.call("checkUsername", { query: { u: "Se" } })).data.reason).toBe("INVALID");
    const taken = (await api.call("checkUsername", { query: { u: "serkan" } })).data;
    expect(taken).toMatchObject({ available: false, reason: "TAKEN" });
    expect(taken.suggestions).toHaveLength(3);
    expect((await failure(api.call("updateMe", { body: { username: "ece" } }))).code).toBe("USERNAME_TAKEN");

    expect((await api.call("updateMe", { body: { username: "sena.b" } })).data.username).toBe("sena.b");
    expect((await failure(api.call("updateMe", { body: { username: "sena.c" } }))).code).toBe("USERNAME_LOCKED");
    expect((await api.call("checkUsername", { query: { u: "sena.c" } })).data.reason).toBe("TOO_SOON");
    t.advanceClock(SYSTEM_SETTINGS["username.change_days"] * 24 * 60 * MINUTE_MS);
    expect((await api.call("updateMe", { body: { username: "sena.c" } })).data.username).toBe("sena.c");
  });

  it("photo: an AVATAR upload (1 file, ≤ 5 MB, JPEG/PNG/WebP) becomes the photo; null removes it", async () => {
    const policy = (await api.call("getUploadPolicy", { query: { purpose: "AVATAR" } })).data;
    expect(policy).toMatchObject({ maxFiles: 1, maxBytes: SYSTEM_SETTINGS["avatar.max_bytes"], acceptedTypes: ["image/jpeg", "image/png", "image/webp"] });
    expect((await failure(api.call("presignUploads", { body: { purpose: "AVATAR", files: [{ mime: "image/heic", bytes: 10 }] } }))).code).toBe("VALIDATION");
    const presign = await api.call("presignUploads", { body: { purpose: "AVATAR", files: [{ mime: "image/jpeg", bytes: 1000 }] } });
    const target = presign.data.uploads[0];
    const uploadId = target?.uploadId ?? "";
    await fetch(target?.uploadUrl ?? "", { method: "PUT", body: "jpeg" });
    await api.call("completeUploads", { body: { batchId: presign.data.batchId } });
    const me = (await api.call("updateMe", { body: { avatarUploadId: uploadId } })).data;
    expect(me.avatarSha256).toMatch(/^[0-9a-f]{64}$/);
    const image = await fetch(`http://mock.test/api/v1/img/${me.avatarSha256 ?? ""}/THUMB_160`);
    expect(image.status).toBe(200);
    expect((await api.call("updateMe", { body: { avatarUploadId: null } })).data.avatarSha256).toBeNull();
  });
});

describe("e-mail and password", () => {
  it("access rows are masked; the full own values only after re-authentication, each reveal logged", async () => {
    const access = (await api.call("getAccess", {})).data;
    expect(access).toMatchObject({ emailMasked: "s***@o***.test", phoneMasked: USERS.user.phoneMasked, password: { set: true }, reauthUntil: null, reauthMinutes: SYSTEM_SETTINGS["pii.reauth_minutes"], twoFactor: null });
    expect(access.identities).toEqual([{ provider: "GOOGLE", linked: true }, { provider: "APPLE", linked: false }]);
    expect((await failure(api.call("getOwnPii", {}))).code).toBe("REAUTH_REQUIRED");

    expect((await failure(api.call("reauth", { body: { method: "PASSWORD", password: "yanlis1234" } }))).code).toBe("INVALID_CREDENTIALS");
    const { validUntil } = (await reauth()).data;
    expect(new Date(validUntil).getTime() - Date.parse("2026-11-14T09:00:00.000Z")).toBe(SYSTEM_SETTINGS["pii.reauth_minutes"] * MINUTE_MS);
    const pii = (await api.call("getOwnPii", {})).data;
    expect(pii).toMatchObject({ email: SENA_EMAIL, phone: SENA_PHONE });
    expect(last()).toMatchObject({ action: "account.pii_view", metadata: { fields: ["email", "phone"] } });

    t.advanceClock(SYSTEM_SETTINGS["pii.reauth_minutes"] * MINUTE_MS);
    expect((await failure(api.call("getOwnPii", {}))).code).toBe("REAUTH_REQUIRED");
  });

  it("an account without a password confirms with its linked provider", async () => {
    expect((await api.call("reauth", { body: { method: "GOOGLE", credential: "mock" } })).data.validUntil).toBeDefined();
    expect((await failure(api.call("reauth", { body: { method: "APPLE", credential: "mock" } }))).code).toBe("INVALID_CREDENTIALS");
  });

  it("e-mail change: needs re-authentication; the old address stays until the link; resend waits; cancel; the link switches it", async () => {
    expect((await failure(api.call("changeEmail", { body: { email: "yeni.sena@ornek.test" } }))).code).toBe("REAUTH_REQUIRED");
    await reauth();
    const pending = (await api.call("changeEmail", { body: { email: "yeni.sena@ornek.test" } })).data;
    expect(pending).toMatchObject({ emailMasked: "s***@o***.test", pendingEmail: { emailMasked: "y***@o***.test" } });
    expect(last()?.metadata).toEqual({ emailDomain: "ornek.test" });
    expect((await failure(api.call("resendEmailChange", {}))).code).toBe("RATE_LIMITED");
    expect((await api.call("cancelEmailChange", {})).data.pendingEmail).toBeNull();

    await api.call("changeEmail", { body: { email: "yeni.sena@ornek.test" } });
    const link = mails.at(-1);
    expect(link?.purpose).toBe("CHANGE_EMAIL");
    const result = (await api.call("verifyEmail", { body: { token: link?.token ?? "" } })).data;
    expect(result.status).toBe("SIGNED_IN");
    expect(controller.state.accounts.has("yeni.sena@ornek.test")).toBe(true);
    expect(controller.state.accounts.has(SENA_EMAIL)).toBe(false);
    // Back to the fixture address for the other tests.
    const account = controller.state.accounts.get("yeni.sena@ornek.test");
    if (account) {
      controller.state.accounts.delete(account.email);
      controller.state.accounts.set(SENA_EMAIL, { ...account, email: SENA_EMAIL });
    }
  });

  it("password change: current + rules; the other devices are signed out, this one stays", async () => {
    expect((await failure(api.call("changePassword", { body: { currentPassword: "yanlis1234", newPassword: "YeniSifre9" } }))).code).toBe("INVALID_CREDENTIALS");
    expect((await failure(api.call("changePassword", { body: { currentPassword: MOCK_PASSWORD, newPassword: "kisa" } }))).code).toBe("VALIDATION");
    const { data } = await api.call("changePassword", { body: { currentPassword: MOCK_PASSWORD, newPassword: "YeniSifre9" } });
    expect(data).toEqual({ status: "PASSWORD_CHANGED", otherSessionsRevoked: 2 });
    const sessions = (await api.call("getSecurity", {})).data.sessions;
    expect(sessions.map((row) => row.current)).toEqual([true]);
    expect(last()).toMatchObject({ action: "auth.password_change", metadata: { otherSessionsRevoked: 2 } });
    const account = controller.state.accounts.get(SENA_EMAIL);
    if (account) account.password = MOCK_PASSWORD;
    controller.state.sessions.length = 0;
  });

  it("linked accounts: connect Apple, remove Google; the only sign-in method cannot be removed", async () => {
    expect((await api.call("linkIdentity", { params: { provider: "apple" }, body: { credential: "mock" } })).data.identities).toEqual([
      { provider: "GOOGLE", linked: true },
      { provider: "APPLE", linked: true },
    ]);
    expect(last()).toMatchObject({ action: "account.identity_link", metadata: { provider: "APPLE" } });
    const account = controller.state.accounts.get(SENA_EMAIL);
    if (account) account.password = null;
    await api.call("unlinkIdentity", { params: { provider: "google" } });
    expect((await failure(api.call("unlinkIdentity", { params: { provider: "apple" } }))).code).toBe("LAST_SIGN_IN_METHOD");
    // "Şifre oluştur" sends the reset-link e-mail to an account without a password.
    await api.call("createPasswordLink", {});
    expect(mails.at(-1)?.purpose).toBe("RESET_PASSWORD");
    if (account) account.password = MOCK_PASSWORD;
    expect((await failure(api.call("createPasswordLink", {}))).code).toBe("VALIDATION");
  });
});

describe("security", () => {
  it("devices without location, current first; sign out one; the current one cannot; sign out the others", async () => {
    const { sessions, signIns } = (await api.call("getSecurity", {})).data;
    expect(sessions[0]?.current).toBe(true);
    expect(sessions).toHaveLength(3);
    expect(JSON.stringify(sessions)).not.toMatch(/İstanbul|Ankara|location/i);
    expect(signIns.find((row) => row.outcome === "FAILED")?.failedCount).toBe(2);
    expect((await failure(api.call("revokeSession", { params: { id: sessions[0]?.id ?? "" } }))).code).toBe("VALIDATION");
    expect((await api.call("revokeSession", { params: { id: sessions[1]?.id ?? "" } })).data.revoked).toBe(1);
    expect((await api.call("signOutOthers", {})).data.revoked).toBe(1);
    expect((await api.call("getSecurity", {})).data.sessions).toHaveLength(1);
    expect(last()?.action).toBe("auth.sign_out_others");
    controller.state.sessions.length = 0;
  });
});

describe("search history", () => {
  it("matched product with image and tracking, no price; search, category counts; hide + undo", async () => {
    const history = (await api.call("getSearchHistory", { query: {} })).data;
    expect(history.items.length).toBeGreaterThan(0);
    const withProduct = history.items.find((row) => row.product);
    expect(withProduct?.product).toMatchObject({ category: expect.any(Object), tracking: expect.any(Boolean) });
    expect(JSON.stringify(history)).not.toMatch(/price|minor/i);
    expect(history.facets.categories.reduce((sum, row) => sum + row.count, 0)).toBeLessThanOrEqual(history.facets.total);

    const category = history.facets.categories[0];
    if (category) {
      const filtered = (await api.call("getSearchHistory", { query: { category: category.id } })).data;
      expect(filtered.items).toHaveLength(category.count);
    }
    const first = history.items[0];
    await api.call("hideSearch", { params: { id: first?.id ?? "" } });
    expect((await api.call("getSearchHistory", { query: {} })).data.items.map((row) => row.id)).not.toContain(first?.id);
    await api.call("unhideSearch", { params: { id: first?.id ?? "" } });
    expect((await api.call("getSearchHistory", { query: {} })).data.items.map((row) => row.id)).toContain(first?.id);
    expect(last()?.action).toBe("search_history.unhide");
  });
});

describe("notification preferences", () => {
  it("defaults: one-by-one, Her zaman, digest 19:00, cap; searched-product e-mail off; account row locked; no admin rows for a user", async () => {
    const prefs = (await api.call("getNotificationPreferences", {})).data;
    expect(prefs).toMatchObject({ delivery: "INSTANT", slots: ["ALWAYS"], digestTime: SYSTEM_SETTINGS["notify.digest_time"], dailyCap: { limit: SYSTEM_SETTINGS["notify.daily_cap"], usedToday: 3 } });
    expect(prefs.rows.find((row) => row.key === "SEARCHED_PRODUCT_DROP")).toMatchObject({ inApp: true, email: false });
    expect(prefs.rows.find((row) => row.key === "RETURN")?.types).toEqual(["DEADLINE_SOON", "RETURN_REMINDER"]);
    expect(prefs.rows.find((row) => row.key === "ACCOUNT_SECURITY")).toMatchObject({ locked: true, inApp: true, email: true });
    expect(prefs.rows.some((row) => row.group === "ADMIN")).toBe(false);
    // "Göster'den sonra fiyat arttı" and "bildirimin sonucu" have no row: always on.
    expect(prefs.rows.flatMap((row) => row.types)).not.toEqual(expect.arrayContaining(["REVEAL_PRICE_UP"]));
  });

  it("changes save; Her zaman is exclusive; locked rows refuse", async () => {
    const updated = (await api.call("updateNotificationPreferences", { body: { delivery: "DIGEST", slots: ["MORNING", "EVENING"], switches: [{ key: "DEAL_ENDED", channel: "EMAIL", enabled: false }] } })).data;
    expect(updated).toMatchObject({ delivery: "DIGEST", slots: ["MORNING", "EVENING"] });
    expect(updated.rows.find((row) => row.key === "DEAL_ENDED")).toMatchObject({ email: false, inApp: true });
    expect(last()).toMatchObject({ action: "settings.change", metadata: { section: "notifications" } });
    // "Her zaman" with another slot is refused by the contract itself (client and server).
    expect(TimeSlots.safeParse(["ALWAYS", "NOON"]).success).toBe(false);
    expect((await failure(api.call("updateNotificationPreferences", { body: { switches: [{ key: "ACCOUNT_SECURITY", channel: "EMAIL", enabled: false }] } }))).code).toBe("VALIDATION");
    expect((await failure(api.call("updateNotificationPreferences", { body: { switches: [{ key: "ADMIN_BUDGET", channel: "EMAIL", enabled: false }] } }))).code).toBe("VALIDATION");
  });

  it("the Application Manager gets the admin group, with the locked rows", async () => {
    t.signInAs("manager");
    const rows = (await api.call("getNotificationPreferences", {})).data.rows;
    expect(rows.filter((row) => row.group === "ADMIN" && row.locked).map((row) => row.key)).toEqual(["ADMIN_FRAUD_CASE", "ADMIN_ROLE_CHANGED"]);
  });
});

describe("cookies", () => {
  it("necessary always; analytics and marketing off until chosen; the choice is a consent row", async () => {
    expect((await api.call("getCookieConsent", {})).data).toMatchObject({ necessary: true, analytics: false, marketing: false, decidedAt: null });
    const saved = (await api.call("updateCookieConsent", { body: { analytics: true, marketing: false } })).data;
    expect(saved).toMatchObject({ analytics: true, marketing: false, version: SYSTEM_SETTINGS["legal.cookie_version"] });
    expect(last()).toMatchObject({ action: "consent.accept", metadata: { analytics: true, marketing: false } });
  });
});

describe("data and account", () => {
  it("export: preparing → ready (ZIP, 7 days) → a download link", async () => {
    const requested = (await api.call("requestExport", {})).data;
    // The harness runs background work at once.
    const latest = (await api.call("getLatestExport", {})).data.export;
    expect(latest?.status).toBe("READY");
    expect(new Date(latest?.expiresAt ?? 0).getTime() - new Date(latest?.readyAt ?? 0).getTime()).toBe(SYSTEM_SETTINGS["account.export_download_days"] * 24 * 60 * MINUTE_MS);
    const link = (await api.call("getExportLink", { params: { id: requested.id } })).data;
    const file = await fetch(link.url);
    expect(file.headers.get("content-type")).toBe("application/zip");
    expect(last()?.action).toBe("account.export_download");
  });

  it("delete: preview counts; re-authentication; closed and signed out; restore brings everything back", async () => {
    const preview = (await api.call("getDeletionPreview", {})).data;
    expect(preview).toMatchObject({ blocked: null, tokenBalance: expect.any(Number) });
    expect(preview.activeTracking).toBeGreaterThan(0);
    expect((await failure(api.call("deleteAccount", { body: { confirmed: true } }))).code).toBe("REAUTH_REQUIRED");
    await reauth();
    const { data } = await api.call("deleteAccount", { body: { confirmed: true } });
    expect(data.status).toBe("DELETION_SCHEDULED");
    expect(controller.config.session).toBe("guest");
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "account.delete", userId: USERS.user.id });
    const signIn = (await api.call("signIn", { body: { email: SENA_EMAIL, password: MOCK_PASSWORD } })).data;
    expect(signIn.status).toBe("PENDING_DELETION");
    if (signIn.status === "PENDING_DELETION") expect((await api.call("restoreAccount", { body: { challenge: signIn.challenge } })).data.status).toBe("SIGNED_IN");
    expect(controller.state.trackedItems.filter((row) => row.userId === USERS.user.id && row.state === "ACTIVE").length).toBe(preview.activeTracking);
  });

  it("the Application Manager cannot delete before handing over the role", async () => {
    t.signInAs("manager");
    expect((await api.call("getDeletionPreview", {})).data.blocked).toBe("ROLE_HANDOVER");
    expect((await failure(api.call("deleteAccount", { body: { confirmed: true } }))).code).toBe("ROLE_HANDOVER_REQUIRED");
  });
});

describe("Application Manager sections", () => {
  it("are closed on the server for a user", async () => {
    expect((await failure(api.call("getOwnPermissions", {}))).code).toBe("FORBIDDEN");
    expect((await failure(api.call("getAdminActivity", { query: {} }))).code).toBe("FORBIDDEN");
  });

  it("Yetkilerim: official keys by group; two-step verification as information", async () => {
    t.signInAs("manager");
    const own = (await api.call("getOwnPermissions", {})).data;
    expect(own.role).toBe("APP_MANAGER");
    expect(own.groups.map((group) => group.id)).toEqual(["self", "users", "catalog", "packages", "system", "security", "content"]);
    for (const group of own.groups) {
      expect(group.total).toBeGreaterThan(0);
      expect(group.granted.length).toBe(group.total);
      for (const key of group.granted) expect(key.startsWith("admin.")).toBe(true);
    }
    // Every official admin key sits in exactly one group.
    const adminKeys = PERMISSION_KEYS.filter((key) => key.startsWith("admin."));
    expect(own.groups.flatMap((group) => group.granted).sort()).toEqual([...adminKeys].sort());
    expect((await api.call("getAccess", {})).data.twoFactor).toEqual({ required: true, enabled: true });
  });

  it("Yönetim etkinliğim: search and type filter with counts", async () => {
    t.signInAs("manager");
    const all = (await api.call("getAdminActivity", { query: {} })).data;
    expect(all.facets.types.ALL).toBe(all.items.length);
    const pii = (await api.call("getAdminActivity", { query: { type: "PII" } })).data;
    expect(pii.items.every((item) => item.type === "PII")).toBe(true);
    expect(pii.items).toHaveLength(all.facets.types.PII);
    expect((await api.call("getAdminActivity", { query: { q: "48213" } })).data.items).toHaveLength(1);
  });
});

describe("personal data", () => {
  it("no response but /me/pii carries the full e-mail or phone, and no activity row holds them or a password", async () => {
    const bodies = [await api.call("getMe", {}), await api.call("getAccess", {}), await api.call("getSecurity", {}), await api.call("getNotificationPreferences", {})].map((response) => JSON.stringify(response.data));
    for (const body of bodies) {
      expect(body).not.toContain(SENA_EMAIL);
      expect(body).not.toContain(SENA_PHONE);
    }
    const rows = JSON.stringify(controller.state.activity);
    for (const secret of [SENA_EMAIL, SENA_PHONE, MOCK_PASSWORD, "YeniSifre9", "yeni.sena@ornek.test"]) expect(rows).not.toContain(secret);
  });
});
