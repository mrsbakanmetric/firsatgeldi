// @vitest-environment jsdom
// Sign-in and Sign-up on the mock API (design "8 Giriş" v2.1: Main, States, Links), the way
// the screens run in the browser: every text from the catalogue in tr and en, every state,
// no account enumeration on screen, the return path, the guest hand-back, and axe.
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { MOCK_PASSWORD, PRODUCTS, SYSTEM_SETTINGS } from "@firsatgeldi/mocks";
import { createMockServer } from "@firsatgeldi/mocks/node";
import { axeViolations } from "@firsatgeldi/ui/test";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://mock.test");
vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "off");
vi.mock("next/link", () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props} />,
}));
const replace = vi.fn();
const push = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/tr/giris", useRouter: () => ({ replace, push }) }));

const { server, controller } = createMockServer({ schedule: (task) => task() });
const mails: { purpose: string; token: string }[] = [];
controller.onMail = (mail) => mails.push(mail);
const { Providers } = await import("../providers");
const { SignIn } = await import("./sign-in");
const { NewPasswordPage, VerifyEmailPage } = await import("./link-pages");

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  controller.config = { ...controller.config, session: "guest", scenario: "success", latencyMs: 0 };
});
afterEach(() => {
  cleanup();
  replace.mockReset();
  controller.state.loginFailures.clear();
  controller.state.emailRequests.clear();
  globalThis.sessionStorage.clear();
  const pending = controller.state.accounts.get("silinecek@ornek.test");
  if (pending) pending.state = "PENDING_DELETION";
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function at(path: string) {
  globalThis.history.replaceState({}, "", path);
}

function show(locale: Locale, path = `/${locale}/giris`) {
  at(path);
  return render(
    <Providers locale={locale}>
      <SignIn locale={locale} />
    </Providers>,
  );
}

async function fillSignIn(locale: Locale, email: string, password: string) {
  const t = createTranslator(locale);
  await userEvent.type(await screen.findByLabelText(t("auth.email")), email);
  await userEvent.type(screen.getByLabelText(t("auth.password")), password);
  await userEvent.click(submitButton(t("auth.signInCta")));
}

/** The tab "Giriş yap" and the form's "Giriş yap" share their name (as drawn): the submit one. */
function submitButton(name: string): HTMLElement {
  const button = screen.getAllByRole("button", { name }).find((element) => element.getAttribute("type") === "submit");
  if (!button) throw new Error(`no submit button "${name}"`);
  return button;
}

describe.each(LOCALES)("Sign-in (%s)", (locale) => {
  const t = createTranslator(locale);
  const home = `/${locale}`;

  it("draws the hero as the page title, the tabs, Google and Apple, and has no axe violations", async () => {
    const { container } = show(locale);
    expect(await screen.findByRole("heading", { level: 1, name: t("auth.hero.title") })).toBeDefined();
    expect(screen.getByRole("button", { name: t("auth.tabs.signIn"), pressed: true })).toBeDefined();
    expect(screen.getByRole("button", { name: t("auth.google") })).toBeDefined();
    expect(screen.getByRole("button", { name: t("auth.apple") })).toBeDefined();
    expect(screen.getByText(t("auth.hero.exampleFlag"))).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("\"Şifremi unuttum\" sits on the \"Şifre\" label's row, right end — Giriş tab only, no row of its own", async () => {
    show(locale);
    const forgot = await screen.findByRole("button", { name: t("auth.forgotLink") });
    const label = screen.getByText(t("auth.password"), { selector: "label" });
    expect(forgot.parentElement).toBe(label.parentElement);
    expect(label.parentElement?.className).toContain("justify-between");
    await userEvent.click(screen.getByRole("button", { name: t("auth.tabs.signUp") }));
    expect(screen.queryByRole("button", { name: t("auth.forgotLink") })).toBeNull();
    const signUpLabel = screen.getByText(t("auth.password"), { selector: "label" });
    expect(signUpLabel.parentElement?.className).not.toContain("justify-between");
  });

  it("signs in and returns to `next`; the action is logged without the address", async () => {
    show(locale, `/${locale}/giris?next=${encodeURIComponent(`/${locale}/takip`)}`);
    await fillSignIn(locale, "sena@ornek.test", MOCK_PASSWORD);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/${locale}/takip`));
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "auth.sign_in", outcome: "OK", metadata: { emailDomain: "ornek.test" } });
    expect(controller.config.session).toBe("user");
  });

  it("an unsafe `next` goes to Home", async () => {
    show(locale, `/${locale}/giris?next=${encodeURIComponent("https://evil.test/x")}`);
    await fillSignIn(locale, "sena@ornek.test", MOCK_PASSWORD);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(home));
  });

  it("a signed-in visitor goes straight on", async () => {
    controller.config = { ...controller.config, session: "user" };
    show(locale, `/${locale}/giris?next=${encodeURIComponent(`/${locale}/takip`)}`);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/${locale}/takip`));
  });

  it("a wrong password and a Google-only account show the very same banner, with the fixed Google/Apple note", async () => {
    show(locale);
    await fillSignIn(locale, "sena@ornek.test", "yanlis1234");
    const first = (await screen.findByRole("alert")).textContent;
    expect(first).toContain(t("auth.wrong.title"));
    expect(first).toContain(t("auth.wrong.body", { count: SYSTEM_SETTINGS["auth.lockout_attempts"] - 1 }));
    expect(first).toContain(t("auth.wrong.providerNote"));
    cleanup();
    show(locale);
    await fillSignIn(locale, "google@ornek.test", MOCK_PASSWORD);
    expect((await screen.findByRole("alert")).textContent).toBe(first);
  });

  it("locks after the attempts: countdown, the form locked, \"Şifremi sıfırla\"", async () => {
    show(locale);
    const limit = SYSTEM_SETTINGS["auth.lockout_attempts"];
    for (let attempt = 0; attempt < limit; attempt += 1) {
      await fillSignIn(locale, "ece@ornek.test", "yanlis1234");
      await screen.findAllByText(attempt < limit - 1 ? t("auth.wrong.title") : t("auth.locked.title", { count: SYSTEM_SETTINGS["auth.lockout_minutes"] }));
      if (attempt < limit - 1) await userEvent.clear(screen.getByLabelText(t("auth.email")));
    }
    expect(screen.getByLabelText(t("auth.email")).matches(":disabled")).toBe(true);
    const retry = screen.getByRole("button", { name: new RegExp(t("auth.locked.retry")) }) as HTMLButtonElement;
    expect(retry.disabled).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: t("auth.locked.reset") }));
    expect(await screen.findByRole("heading", { name: t("auth.forgot.title") })).toBeDefined();
  });

  it("unverified (after the correct password): resend → \"E-postanı doğrula\"", async () => {
    show(locale);
    await fillSignIn(locale, "dogrulanmamis@ornek.test", MOCK_PASSWORD);
    expect(await screen.findByText(t("auth.unverified.title"))).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: t("auth.unverified.resend") }));
    expect(await screen.findByRole("heading", { name: t("auth.sent.verifyTitle") })).toBeDefined();
    expect(screen.getByText("d***@o***.test")).toBeDefined();
  });

  it("pending deletion: \"Vazgeç, silinsin\" keeps it and is logged; \"Hesabımı geri aç\" signs in", async () => {
    show(locale);
    await fillSignIn(locale, "silinecek@ornek.test", MOCK_PASSWORD);
    await userEvent.click(await screen.findByRole("button", { name: t("auth.pendingDeletion.keep") }));
    expect(await screen.findByRole("button", { name: t("auth.tabs.signIn"), pressed: true })).toBeDefined();
    expect(controller.state.activity.at(-1)?.action).toBe("account.restore_declined");
    // Back on the form the typed e-mail is kept; the password is asked again.
    expect((screen.getByLabelText(t("auth.email")) as HTMLInputElement).value).toBe("silinecek@ornek.test");
    await userEvent.type(screen.getByLabelText(t("auth.password")), MOCK_PASSWORD);
    await userEvent.click(submitButton(t("auth.signInCta")));
    await userEvent.click(await screen.findByRole("button", { name: t("auth.pendingDeletion.restore") }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith(home));
    expect(controller.state.activity.at(-1)?.action).toBe("account.restore");
  });

  it("suspended: reason, \"Destek talebi aç\", \"Verilerimi indir\"; no session", async () => {
    show(locale);
    await fillSignIn(locale, "askida@ornek.test", MOCK_PASSWORD);
    expect(await screen.findByText(t("auth.suspended.title"))).toBeDefined();
    expect(screen.getByText(t("auth.suspended.reason", { reason: t("auth.suspended.reasons.MULTI_ACCOUNT") }))).toBeDefined();
    expect(screen.getByRole("link", { name: t("auth.suspended.support") }).getAttribute("href")).toContain(locale === "tr" ? "/tr/yardim/iletisim" : "/en/help/contact");
    await userEvent.click(screen.getByRole("button", { name: t("auth.suspended.export") }));
    expect(await screen.findByText(t("auth.suspended.exportStarted"))).toBeDefined();
    expect(controller.config.session).toBe("guest");
    expect(replace).not.toHaveBeenCalled();
  });

  it("service error: \"Şu an giriş yapılamıyor\" and the typed e-mail stays", async () => {
    controller.config = { ...controller.config, scenario: "error" };
    show(locale);
    await screen.findByRole("heading", { level: 1 });
    await fillSignIn(locale, "sena@ornek.test", MOCK_PASSWORD);
    expect(await screen.findByText(t("auth.unavailable.title"))).toBeDefined();
    expect((screen.getByLabelText(t("auth.email")) as HTMLInputElement).value).toBe("sena@ornek.test");
  });

  it("Google signs in (mock: no provider window)", async () => {
    show(locale);
    await userEvent.click(await screen.findByRole("button", { name: t("auth.google") }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith(home));
    expect(controller.state.activity.at(-1)?.metadata).toMatchObject({ method: "GOOGLE" });
  });

  it("sign-up: the primary names what is missing, errors on submit, live rules, then \"E-postanı doğrula\"", async () => {
    show(locale, `/${locale}/giris?mod=kayit`);
    expect(await screen.findByRole("button", { name: t("auth.tabs.signUp"), pressed: true })).toBeDefined();
    const create = screen.getByRole("button", { name: t("auth.signUpCta") });
    expect(create.getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByText(t("auth.fieldError.email"))).toBeDefined();
    await userEvent.click(create);
    expect(screen.getAllByText(t("auth.fieldError.email")).length).toBeGreaterThan(1);

    await userEvent.type(screen.getByLabelText(t("auth.email")), "yeni.kisi@ornek.test");
    await userEvent.type(screen.getByLabelText(t("auth.password")), "abc");
    expect(screen.getAllByText(t("auth.rules.length", { count: SYSTEM_SETTINGS["auth.password_min_length"] })).length).toBeGreaterThan(0);
    await userEvent.type(screen.getByLabelText(t("auth.password")), "defg1");
    expect(await screen.findByText(t("auth.missing.terms"))).toBeDefined();
    expect(screen.getByRole("link", { name: t("auth.terms.termsLink") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/kosullar" : "/en/terms");
    expect(screen.getByRole("link", { name: t("auth.terms.kvkkLink") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/kvkk" : "/en/privacy");
    expect(screen.getByText(t("auth.signUpHint", { count: SYSTEM_SETTINGS["tokens.welcome_gift"] }))).toBeDefined();

    await userEvent.click(screen.getByRole("checkbox"));
    expect(create.getAttribute("aria-disabled")).toBeNull();
    await userEvent.click(create);
    expect(await screen.findByRole("heading", { name: t("auth.sent.verifyTitle") })).toBeDefined();
    expect(screen.getByText("y***@o***.test")).toBeDefined();
    const wait = SYSTEM_SETTINGS["auth.resend_cooldown_seconds"];
    expect((screen.getByRole("button", { name: new RegExp(t("auth.sent.resend")) }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(t("auth.sent.resendIn", { time: `${Math.floor(wait / 60)}:${String(wait % 60).padStart(2, "0")}` }))).toBeDefined();
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "auth.sign_up" });
  });

  it("forgot password: same answer, \"Bağlantıyı gönderdik\"", async () => {
    show(locale);
    await userEvent.click(await screen.findByRole("button", { name: t("auth.forgotLink") }));
    await userEvent.type(screen.getByLabelText(t("auth.email")), "kimse@ornek.test");
    await userEvent.click(screen.getByRole("button", { name: t("auth.forgot.cta") }));
    expect(await screen.findByRole("heading", { name: t("auth.sent.resetTitle") })).toBeDefined();
    expect(screen.getByText("k***@o***.test")).toBeDefined();
  });

  it("guest hand-back: \"Seçtiğin ürün seni bekliyor\" with the marked product", async () => {
    const product = PRODUCTS.acePro2FlashPrint;
    globalThis.sessionStorage.setItem(
      "fg-search-add-draft",
      JSON.stringify({ query: "ace", identifyRequestId: null, candidate: { product: { id: product.id, name: product.name[locale], imageSha256: null }, variantLine: "Flash Print", match: "EXACT", difference: null }, pricePaid: "", orderedOn: "" }),
    );
    show(locale, `/${locale}/giris?next=${encodeURIComponent(`/${locale}/ara?devam=1`)}`);
    const card = await screen.findByText(t("auth.guestCard"));
    expect(card.closest("[role=status]")?.textContent).toContain(`${product.name[locale]} · Flash Print`);
    await fillSignIn(locale, "sena@ornek.test", MOCK_PASSWORD);
    await waitFor(() => expect(replace).toHaveBeenCalledWith(`/${locale}/ara?devam=1`));
  });
});

describe.each(LOCALES)("E-mail link pages (%s)", (locale) => {
  const t = createTranslator(locale);

  function page(path: string, Component: typeof VerifyEmailPage) {
    at(path);
    return render(
      <Providers locale={locale}>
        <Component locale={locale} />
      </Providers>,
    );
  }

  async function signUpLink(email: string): Promise<string> {
    const response = await fetch("http://mock.test/api/v1/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify({ email, password: "yeniSifre1", acceptTerms: true, termsVersion: SYSTEM_SETTINGS["legal.terms_version"], locale }),
    });
    expect(response.ok).toBe(true);
    return mails.at(-1)?.token ?? "";
  }

  it("verified: the gift, \"Kaldığın yerden devam et\" to the remembered page; the same link again is the expired page", async () => {
    const token = await signUpLink(`dogru-${locale}@ornek.test`);
    globalThis.sessionStorage.setItem("fg-auth-next", `/${locale}/ara?devam=1`);
    const { container } = page(`/${locale}/dogrula?token=${token}`, VerifyEmailPage);
    expect(await screen.findByRole("heading", { level: 1, name: t("auth.verified.title") })).toBeDefined();
    expect(screen.getByText(t("auth.verified.gift", { count: SYSTEM_SETTINGS["tokens.welcome_gift"] }))).toBeDefined();
    expect(screen.getByRole("link", { name: t("auth.verified.continue") }).getAttribute("href")).toBe(`/${locale}/ara?devam=1`);
    expect(await axeViolations(container)).toEqual([]);
    cleanup();
    page(`/${locale}/dogrula?token=${token}`, VerifyEmailPage);
    expect(await screen.findByText(t("auth.linkInvalid.title"))).toBeDefined();
    // Asking again inside the cooldown is refused in words ("Çok sık denedin"); after it, the link is sent.
    await userEvent.type(screen.getByLabelText(t("auth.email")), `dogru-${locale}@ornek.test`);
    await userEvent.click(screen.getByRole("button", { name: t("auth.linkInvalid.cta") }));
    expect(await screen.findByText(t("errors.rateLimited"))).toBeDefined();
    controller.state.emailRequests.clear();
    await userEvent.click(screen.getByRole("button", { name: t("auth.linkInvalid.cta") }));
    expect(await screen.findByRole("heading", { name: t("auth.sent.verifyTitle") })).toBeDefined();
  });

  it("new password: masked address, live rules, saved → signed out everywhere + \"Giriş yap\"", async () => {
    await fetch("http://mock.test/api/v1/auth/password/forgot", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "deniz@ornek.test" }) });
    const token = mails.at(-1)?.token ?? "";
    const { container } = page(`/${locale}/sifre-sifirla?token=${token}`, NewPasswordPage);
    expect(await screen.findByRole("heading", { level: 1, name: t("auth.newPassword.title") })).toBeDefined();
    expect(screen.getByText("d***@o***.test")).toBeDefined();
    const save = screen.getByRole("button", { name: t("auth.newPassword.cta") });
    expect(save.getAttribute("aria-disabled")).toBe("true");
    await userEvent.type(screen.getByLabelText(t("auth.newPassword.field")), "YeniSifre9");
    expect(save.getAttribute("aria-disabled")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.click(save);
    expect(await screen.findByText(t("auth.newPassword.done"))).toBeDefined();
    expect(screen.getByRole("link", { name: t("auth.newPassword.signIn") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/giris" : "/en/sign-in");
    const account = controller.state.accounts.get("deniz@ornek.test");
    if (account) account.password = MOCK_PASSWORD;
  });

  it("a bad link is the one expired page", async () => {
    page(`/${locale}/sifre-sifirla?token=${"x".repeat(20)}`, NewPasswordPage);
    expect(await screen.findByText(t("auth.linkInvalid.title"))).toBeDefined();
    expect(screen.getByRole("link", { name: t("auth.linkInvalid.back") })).toBeDefined();
  });
});
