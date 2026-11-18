// Mock sign-in (Sign-in and Sign-up, step 20 PR 1): states of design "8 Giriş" v2.1, the
// decisions of 2026-11-18 (architecture.md §17: no account enumeration; suspended and pending
// deletion only after a correct password) and the activity rows each action writes.
import { ApiError, type ApiErrorBody, type SignInResult } from "@firsatgeldi/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { MOCK_PASSWORD } from "./fixtures/accounts";
import { USERS } from "./fixtures/users";
import type { MockMail } from "./state";
import { SYSTEM_SETTINGS } from "./settings";
import { createTestApi } from "./test/harness";

const t = createTestApi();
const { api, controller } = t;
const mails: MockMail[] = [];
controller.onMail = (mail) => mails.push(mail);

const LIMIT = SYSTEM_SETTINGS["auth.lockout_attempts"];
const MINUTE_MS = 60_000;
const COOLDOWN_MS = SYSTEM_SETTINGS["auth.resend_cooldown_seconds"] * 1000;

beforeAll(() => t.server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  t.signInAs("guest");
  t.resetClock();
  controller.config = { ...controller.config, scenario: "success" };
});
afterAll(() => t.server.close());

async function failure(promise: Promise<unknown>): Promise<ApiErrorBody> {
  const error = await promise.then(() => undefined, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return (error as ApiError).body as ApiErrorBody;
}

const signIn = (email: string, password = MOCK_PASSWORD) => api.call("signIn", { body: { email, password } });
const lastActivity = () => controller.state.activity.at(-1);
const lastMail = () => mails.at(-1);
/** Every account gets its own e-mail so attempt counts and cooldowns never carry over. */
let counter = 0;
const fresh = (name: string) => `${name}${(counter += 1)}@ornek.test`;

function expectStatus<S extends SignInResult["status"]>(result: SignInResult, status: S): Extract<SignInResult, { status: S }> {
  expect(result.status).toBe(status);
  return result as Extract<SignInResult, { status: S }>;
}

describe("policy", () => {
  it("states the numbers the screens show, from the settings", async () => {
    t.signInAs("guest");
    const { data } = await api.call("getAuthPolicy", {});
    expect(data).toEqual({
      passwordMinLength: SYSTEM_SETTINGS["auth.password_min_length"],
      resendCooldownSeconds: SYSTEM_SETTINGS["auth.resend_cooldown_seconds"],
      welcomeGiftTokens: SYSTEM_SETTINGS["tokens.welcome_gift"],
      termsVersion: SYSTEM_SETTINGS["legal.terms_version"],
    });
  });
});

describe("sign-in with e-mail", () => {
  it("opens the session and returns the user; GET /me then works", async () => {
    t.signInAs("guest");
    const result = expectStatus((await signIn("Sena@Ornek.test ")).data, "SIGNED_IN");
    expect(result.me.id).toBe(USERS.user.id);
    expect(controller.config.session).toBe("user");
    expect((await api.call("getMe", {})).data.id).toBe(USERS.user.id);
    expect(lastActivity()).toMatchObject({ action: "auth.sign_in", outcome: "OK", userId: USERS.user.id, metadata: { method: "EMAIL", emailDomain: "ornek.test", result: "SIGNED_IN" } });
  });

  it("remembers the session in the browser (persist hook)", async () => {
    const remembered: string[] = [];
    controller.persist = (config) => remembered.push(config.session);
    await signIn("ece@ornek.test");
    await api.call("signOut", {});
    expect(remembered).toEqual(["secondUser", "guest"]);
    delete controller.persist;
  });

  it("a wrong password, an unknown e-mail and a Google-only account get the very same answer", async () => {
    const bodies = [await failure(signIn("sena@ornek.test", "yanlis1234")), await failure(signIn(fresh("yok"))), await failure(signIn("google@ornek.test"))];
    for (const body of bodies) expect(body).toEqual({ code: "INVALID_CREDENTIALS", messageKey: "errors.invalidCredentials", params: { remainingAttempts: LIMIT - 1 } });
    expect(controller.state.activity.slice(-3).map((row) => row.outcome)).toEqual(["DENIED", "DENIED", "DENIED"]);
    controller.state.loginFailures.clear();
  });

  it("locks after the configured attempts, also for the right password, then lets in after the wait", async () => {
    const email = "ece@ornek.test";
    for (let attempt = 1; attempt < LIMIT; attempt += 1) {
      expect((await failure(signIn(email, "yanlis1234"))).params).toEqual({ remainingAttempts: LIMIT - attempt });
    }
    const locked = await failure(signIn(email, "yanlis1234"));
    expect(locked).toMatchObject({ code: "LOCKED", params: { retryAfterSeconds: SYSTEM_SETTINGS["auth.lockout_minutes"] * 60 } });
    expect((await failure(signIn(email))).code).toBe("LOCKED");
    expect(lastActivity()).toMatchObject({ action: "auth.sign_in", outcome: "LIMITED" });
    t.advanceClock(SYSTEM_SETTINGS["auth.lockout_minutes"] * MINUTE_MS);
    expect((await signIn(email)).data.status).toBe("SIGNED_IN");
  });

  it("an unknown e-mail is locked the same way (the count reveals nothing)", async () => {
    const email = fresh("bilinmeyen");
    for (let attempt = 1; attempt < LIMIT; attempt += 1) await failure(signIn(email));
    expect((await failure(signIn(email))).code).toBe("LOCKED");
  });

  it("shows the account states only after the correct password", async () => {
    for (const email of ["dogrulanmamis@ornek.test", "silinecek@ornek.test", "askida@ornek.test"]) {
      expect((await failure(signIn(email, "yanlis1234"))).code).toBe("INVALID_CREDENTIALS");
    }
    expect(expectStatus((await signIn("dogrulanmamis@ornek.test")).data, "VERIFY_EMAIL").emailMasked).toBe("d***@o***.test");
    const pending = expectStatus((await signIn("silinecek@ornek.test")).data, "PENDING_DELETION");
    expect(new Date(pending.purgeAfter).getTime()).toBeGreaterThan(new Date(pending.requestedAt).getTime());
    expect(expectStatus((await signIn("askida@ornek.test")).data, "SUSPENDED").reasonKey).toBe("MULTI_ACCOUNT");
    // None of them opened a session for the app.
    expect(controller.config.session).toBe("guest");
    expect((await failure(api.call("getMe", {}))).code).toBe("UNAUTHENTICATED");
    controller.state.loginFailures.clear();
  });

  it("answers the service-error scenario with INTERNAL", async () => {
    controller.config = { ...controller.config, scenario: "error" };
    expect((await failure(signIn("sena@ornek.test"))).code).toBe("INTERNAL");
  });
});

describe("Google and Apple (mock: no provider window)", () => {
  it.each(["signInWithGoogle", "signInWithApple"] as const)("%s signs in as the fixture user", async (name) => {
    const result = expectStatus((await api.call(name, { body: { credential: "mock" } })).data, "SIGNED_IN");
    expect(result.me.id).toBe(USERS.user.id);
    expect(lastActivity()).toMatchObject({ action: "auth.sign_in", metadata: { method: name === "signInWithGoogle" ? "GOOGLE" : "APPLE" } });
  });
});

describe("sign-up and e-mail verification", () => {
  const signUp = (email: string, password = "yeniSifre1") => api.call("signUp", { body: { email, password, acceptTerms: true, termsVersion: SYSTEM_SETTINGS["legal.terms_version"], locale: "tr" } });

  it("creates an unverified account, records the consent and sends the link; the link signs in with the welcome gift once", async () => {
    const email = fresh("yeni");
    const { data } = await signUp(email);
    expect(data).toEqual({ emailMasked: "y***@o***.test", resendAfterSeconds: SYSTEM_SETTINGS["auth.resend_cooldown_seconds"] });
    const account = controller.state.accounts.get(email);
    expect(account?.state).toBe("UNVERIFIED");
    expect(controller.state.userConsents.at(-1)).toMatchObject({ userId: account?.userId, termsVersion: SYSTEM_SETTINGS["legal.terms_version"] });
    expect(lastActivity()).toMatchObject({ action: "auth.sign_up", outcome: "OK", metadata: { termsVersion: SYSTEM_SETTINGS["legal.terms_version"] } });
    const mail = lastMail();
    expect(mail?.purpose).toBe("VERIFY_EMAIL");

    // Before verifying, the correct password asks for verification.
    expect((await signIn(email, "yeniSifre1")).data.status).toBe("VERIFY_EMAIL");

    const verified = expectStatus((await api.call("verifyEmail", { body: { token: mail?.token ?? "" } })).data, "SIGNED_IN");
    expect(verified.welcomeGift).toBe(SYSTEM_SETTINGS["tokens.welcome_gift"]);
    expect(controller.config.session).toBe("newUser");
    expect(controller.state.tokenLedger.filter((row) => row.userId === account?.userId)).toHaveLength(1);
    expect(lastActivity()).toMatchObject({ action: "auth.verify_email", userId: account?.userId });

    // The link works once; the gift is never given twice.
    expect((await failure(api.call("verifyEmail", { body: { token: mail?.token ?? "" } }))).code).toBe("LINK_INVALID");
    expect(lastActivity()).toMatchObject({ action: "auth.verify_email", outcome: "DENIED" });
  });

  it("answers an already registered e-mail exactly like a new one, and sends nothing", async () => {
    const before = mails.length;
    const { data } = await signUp("sena@ornek.test");
    expect(data).toEqual({ emailMasked: "s***@o***.test", resendAfterSeconds: SYSTEM_SETTINGS["auth.resend_cooldown_seconds"] });
    expect(mails.length).toBe(before);
    expect(controller.state.accounts.get("sena@ornek.test")?.password).toBe(MOCK_PASSWORD);
  });

  it("refuses a password that breaks the rules and terms of another version", async () => {
    expect(await failure(signUp(fresh("kisa"), "abc1"))).toMatchObject({ code: "VALIDATION", fields: { password: "errors.validation" } });
    const old = await failure(api.call("signUp", { body: { email: fresh("eski"), password: "yeniSifre1", acceptTerms: true, termsVersion: "2020-01-01", locale: "en" } }));
    expect(old).toMatchObject({ code: "VALIDATION", fields: { termsVersion: "errors.validation" } });
  });

  it("an expired link is the same LINK_INVALID; resend waits for the cooldown and answers the same for any address", async () => {
    const email = fresh("gec");
    await signUp(email);
    const token = lastMail()?.token ?? "";
    t.advanceClock(SYSTEM_SETTINGS["auth.verify_link_hours"] * 60 * MINUTE_MS + 1);
    expect((await failure(api.call("verifyEmail", { body: { token } }))).code).toBe("LINK_INVALID");

    t.resetClock();
    const tooSoon = await failure(api.call("resendVerification", { body: { email } }));
    expect(tooSoon.code).toBe("RATE_LIMITED");
    t.advanceClock(COOLDOWN_MS);
    expect((await api.call("resendVerification", { body: { email } })).data.emailMasked).toBe("g***@o***.test");
    expect(lastMail()?.purpose).toBe("VERIFY_EMAIL");

    const unknown = fresh("hic");
    const before = mails.length;
    expect((await api.call("resendVerification", { body: { email: unknown } })).data).toEqual({ emailMasked: "h***@o***.test", resendAfterSeconds: SYSTEM_SETTINGS["auth.resend_cooldown_seconds"] });
    expect(mails.length).toBe(before);
    expect((await failure(api.call("resendVerification", { body: { email: unknown } }))).code).toBe("RATE_LIMITED");
  });
});

describe("password reset", () => {
  it("answers the same for every address and e-mails only an existing account", async () => {
    const before = mails.length;
    const unknown = await api.call("forgotPassword", { body: { email: fresh("kimse") } });
    expect(mails.length).toBe(before);
    const known = await api.call("forgotPassword", { body: { email: "ece@ornek.test" } });
    expect(Object.keys(unknown.data)).toEqual(Object.keys(known.data));
    expect(lastMail()?.purpose).toBe("RESET_PASSWORD");
    expect(lastActivity()).toMatchObject({ action: "auth.password_forgot", metadata: { emailDomain: "ornek.test" } });
    controller.state.emailRequests.clear();
  });

  it("the link shows the masked address, sets the password, signs every device out and works once", async () => {
    t.signInAs("secondUser");
    await api.call("forgotPassword", { body: { email: "ece@ornek.test" } });
    const token = lastMail()?.token ?? "";
    expect((await api.call("getPasswordReset", { query: { token } })).data).toEqual({ emailMasked: "e***@o***.test" });
    expect((await failure(api.call("resetPassword", { body: { token, password: "kisa" } }))).code).toBe("VALIDATION");

    const { data } = await api.call("resetPassword", { body: { token, password: "YeniSifre9" } });
    expect(data).toEqual({ status: "PASSWORD_CHANGED", sessionsRevoked: true });
    expect(controller.config.session).toBe("guest");
    expect(controller.state.sessionRevocations.at(-1)?.userId).toBe(USERS.secondUser.id);
    expect(lastActivity()).toMatchObject({ action: "auth.password_reset", userId: USERS.secondUser.id });
    expect((await failure(api.call("getPasswordReset", { query: { token } }))).code).toBe("LINK_INVALID");
    expect((await failure(signIn("ece@ornek.test"))).code).toBe("INVALID_CREDENTIALS");
    expect((await signIn("ece@ornek.test", "YeniSifre9")).data.status).toBe("SIGNED_IN");

    const account = controller.state.accounts.get("ece@ornek.test");
    if (account) account.password = MOCK_PASSWORD;
    controller.state.emailRequests.clear();
    controller.state.loginFailures.clear();
  });
});

describe("pending deletion and suspended account", () => {
  it("\"Hesabımı geri aç\" restores and signs in; the choice works once", async () => {
    const { challenge } = expectStatus((await signIn("silinecek@ornek.test")).data, "PENDING_DELETION");
    const restored = expectStatus((await api.call("restoreAccount", { body: { challenge } })).data, "SIGNED_IN");
    expect(restored.me.id).toBe(USERS.user.id);
    expect(lastActivity()).toMatchObject({ action: "account.restore", outcome: "OK" });
    t.signInAs("guest");
    expect((await failure(api.call("restoreAccount", { body: { challenge } }))).code).toBe("UNAUTHENTICATED");
    const account = controller.state.accounts.get("silinecek@ornek.test");
    if (account) account.state = "PENDING_DELETION";
  });

  it("\"Vazgeç, silinsin\" keeps the deletion and is logged", async () => {
    const { challenge, purgeAfter } = expectStatus((await signIn("silinecek@ornek.test")).data, "PENDING_DELETION");
    expect((await api.call("keepDeletion", { body: { challenge } })).data).toEqual({ status: "DELETION_KEPT", purgeAfter });
    expect(controller.state.accounts.get("silinecek@ornek.test")?.state).toBe("PENDING_DELETION");
    expect(controller.config.session).toBe("guest");
    expect(lastActivity()).toMatchObject({ action: "account.restore_declined", outcome: "OK" });
  });

  it("the choice expires", async () => {
    const { challenge } = expectStatus((await signIn("silinecek@ornek.test")).data, "PENDING_DELETION");
    t.advanceClock(SYSTEM_SETTINGS["auth.challenge_minutes"] * MINUTE_MS);
    expect((await failure(api.call("keepDeletion", { body: { challenge } }))).code).toBe("UNAUTHENTICATED");
  });

  it("\"Verilerimi indir\" requests the export without opening the app; a deletion challenge cannot do it", async () => {
    const { challenge } = expectStatus((await signIn("askida@ornek.test")).data, "SUSPENDED");
    const { data } = await api.call("exportSuspendedAccount", { body: { challenge } });
    expect(data.status).toBe("PREPARING");
    expect(controller.state.dataExports.at(-1)?.id).toBe(data.requestId);
    expect(lastActivity()).toMatchObject({ action: "account.export", targetType: "data_export", targetId: data.requestId });
    expect(controller.config.session).toBe("guest");
    expect((await failure(api.call("restoreAccount", { body: { challenge } }))).code).toBe("UNAUTHENTICATED");
  });
});

describe("sign-out", () => {
  it("closes the session; guests cannot call it", async () => {
    t.signInAs("user");
    expect((await api.call("signOut", {})).data).toEqual({ status: "SIGNED_OUT" });
    expect(lastActivity()).toMatchObject({ action: "auth.sign_out", userId: USERS.user.id });
    expect((await failure(api.call("getMe", {}))).code).toBe("UNAUTHENTICATED");
    expect((await failure(api.call("signOut", {}))).code).toBe("UNAUTHENTICATED");
  });
});

describe("personal data in the activity history", () => {
  it("no row holds a typed e-mail address or a password", () => {
    const rows = JSON.stringify(controller.state.activity);
    for (const secret of ["@ornek.test", MOCK_PASSWORD, "yeniSifre1", "YeniSifre9", "yanlis1234"]) expect(rows).not.toContain(secret);
  });
});
