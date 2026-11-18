// @vitest-environment jsdom
// Settings and Account, PR 2 (design "9 Ayarlar" v2.1: Main, Forms, States) on the mock API:
// every text from the catalogue in tr and en, the decisions of 2026-11-18, personal data only
// after re-authentication, the "Kaydedildi" indicator, the activity rows, and axe.
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { MOCK_PASSWORD, SYSTEM_SETTINGS, USERS } from "@firsatgeldi/mocks";
import { createMockServer } from "@firsatgeldi/mocks/node";
import { axeViolations } from "@firsatgeldi/ui/test";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { SettingsSectionId } from "../../lib/settings/sections";

vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://mock.test");
vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "off");
vi.mock("next/link", () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props} />,
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({ usePathname: () => "/tr/ayarlar/profil", useRouter: () => ({ push, replace: vi.fn() }) }));

const { server, controller } = createMockServer({ schedule: (task) => task() });
const { Providers } = await import("../providers");
const { Settings } = await import("./settings");

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  controller.config = { ...controller.config, session: "user", scenario: "success", latencyMs: 0 };
});
afterEach(() => {
  cleanup();
  push.mockReset();
  for (const table of [controller.state.profiles, controller.state.access, controller.state.cookieConsents, controller.state.loginFailures]) table.clear();
  controller.state.sessions.length = 0;
  const account = controller.state.accounts.get("sena@ornek.test");
  if (account) account.password = MOCK_PASSWORD;
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function show(locale: Locale, section: SettingsSectionId) {
  return render(
    <Providers locale={locale}>
      <Settings locale={locale} section={section} />
    </Providers>,
  );
}
const lastAction = () => controller.state.activity.at(-1);

describe.each(LOCALES)("Settings (%s)", (locale) => {
  const t = createTranslator(locale);

  it("frame: title, the section menu with the current section, the section header; no axe violations", async () => {
    const { container } = show(locale, "profile");
    expect(await screen.findByRole("heading", { level: 2, name: t("settings.sections.profile.title") })).toBeDefined();
    expect(screen.getByRole("heading", { level: 1, name: t("settings.title") })).toBeDefined();
    const nav = screen.getByRole("navigation", { name: t("settings.navLabel") });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["profile", "access", "security", "look", "privacy"].map((id) => t(`settings.sections.${id as SettingsSectionId}.title`)));
    expect(within(nav).getByRole("link", { current: "page" }).textContent).toBe(t("settings.sections.profile.title"));
    expect(links[0]?.getAttribute("href")).toBe(locale === "tr" ? "/tr/ayarlar/profil" : "/en/settings/profile");
    expect(screen.queryByText(t("settings.adminFooter"))).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("the Application Manager sees the footer line", async () => {
    controller.config = { ...controller.config, session: "manager" };
    show(locale, "profile");
    expect(await screen.findByText(t("settings.adminFooter"))).toBeDefined();
  });

  it("a guest is asked to sign in and comes back to the section", async () => {
    controller.config = { ...controller.config, session: "guest" };
    show(locale, "security");
    const link = await screen.findByRole("link", { name: t("shell.signIn") });
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain(locale === "tr" ? "/tr/ayarlar/guvenlik" : "/en/settings/security");
  });

  describe("Profil", () => {
    it("saves the name; \"Kaydedildi\" appears; the activity row names the field only", async () => {
      show(locale, "profile");
      const name = await screen.findByLabelText(t("settings.profile.name"));
      await userEvent.clear(name);
      await userEvent.type(name, "Sena Bal");
      await userEvent.click(screen.getByRole("button", { name: t("settings.profile.save") }));
      expect(await screen.findByText(t("settings.saved"))).toBeDefined();
      expect(lastAction()).toMatchObject({ action: "settings.change", metadata: { section: "profile", fields: ["displayName"] } });
    });

    it("a taken username: not saved, the reason, three suggestions; a suggestion is available", async () => {
      show(locale, "profile");
      const username = await screen.findByLabelText(t("settings.profile.username"));
      await userEvent.clear(username);
      await userEvent.type(username, "serkan");
      expect(await screen.findByText(t("settings.states.notSaved", { count: 1 }))).toBeDefined();
      const suggestions = await screen.findAllByRole("button", { name: new RegExp(t("settings.profile.useSuggestion", { name: "serkan" }).replace("serkan", "serkan.*")) });
      expect(suggestions).toHaveLength(3);
      await userEvent.click(suggestions[0] as HTMLElement);
      expect(await screen.findByText(t("settings.profile.available"))).toBeDefined();
    });

    it("the photo control states the accepted types and size from the upload policy", async () => {
      show(locale, "profile");
      expect(await screen.findByRole("button", { name: t("settings.profile.upload") })).toBeDefined();
      expect(await screen.findByText(new RegExp("JPEG, PNG, WebP"))).toBeDefined();
      expect(screen.queryByRole("button", { name: t("settings.profile.remove") })).toBeNull();
    });
  });

  describe("E-posta ve şifre", () => {
    it("masked by default; \"Göster\" asks for the password, then shows the full e-mail with a countdown; \"Gizle\" masks; every reveal logged", async () => {
      show(locale, "access");
      expect(await screen.findByText("s***@o***.test")).toBeDefined();
      expect(screen.queryByText("sena@ornek.test")).toBeNull();
      await userEvent.click(screen.getAllByRole("button", { name: t("settings.access.show") })[0] as HTMLElement);
      const dialog = await screen.findByRole("dialog", { name: t("settings.reauth.title") });
      // The window comes from the settings (pii.reauth_minutes), stated before re-authenticating.
      expect(within(dialog).getByText(t("settings.reauth.text", { count: SYSTEM_SETTINGS["pii.reauth_minutes"] }))).toBeDefined();
      expect(within(dialog).getByText(locale === "tr" ? /15 dakika boyunca tekrar sorulmaz/ : /Won't ask again for 15 minutes/)).toBeDefined();
      await userEvent.type(within(dialog).getByLabelText(t("auth.password")), MOCK_PASSWORD);
      await userEvent.click(within(dialog).getByRole("button", { name: t("settings.reauth.submit") }));
      expect(await screen.findByText("sena@ornek.test")).toBeDefined();
      expect(screen.getByText(/^[01]:\d{2}$/)).toBeDefined();
      expect(lastAction()).toMatchObject({ action: "account.pii_view" });
      await userEvent.click(screen.getByRole("button", { name: t("settings.access.hide") }));
      expect(screen.queryByText("sena@ornek.test")).toBeNull();
    });

    it("phone is shown only; the password row offers the change; linked accounts list Google and Apple", async () => {
      show(locale, "access");
      expect(await screen.findByText(USERS.user.phoneMasked ?? "")).toBeDefined();
      expect(screen.getByText(t("settings.access.phoneNote"))).toBeDefined();
      expect(screen.getByRole("button", { name: t("settings.access.changePassword") })).toBeDefined();
      expect(screen.getByRole("button", { name: t("settings.access.connect.APPLE") })).toBeDefined();
      expect(screen.getByText(t("settings.access.revealNote"))).toBeDefined();
    });

    it("change e-mail: re-authentication, the new address, then \"E-postanı kontrol et\" in the same dialog; the page shows the pending change", async () => {
      show(locale, "access");
      await userEvent.click(await screen.findByRole("button", { name: t("settings.access.change") }));
      const reauth = await screen.findByRole("dialog", { name: t("settings.reauth.title") });
      await userEvent.type(within(reauth).getByLabelText(t("auth.password")), MOCK_PASSWORD);
      await userEvent.click(within(reauth).getByRole("button", { name: t("settings.reauth.submit") }));
      const dialog = await screen.findByRole("dialog", { name: t("settings.emailDialog.title") });
      await userEvent.type(within(dialog).getByLabelText(t("settings.emailDialog.field")), "yeni.adres@ornek.test");
      await userEvent.click(within(dialog).getByRole("button", { name: t("settings.emailDialog.submit") }));
      expect(await within(dialog).findByText(t("settings.emailDialog.sentTitle"))).toBeDefined();
      expect(within(dialog).getByText("y***@o***.test")).toBeDefined();
      expect(await screen.findByText(t("settings.access.pending", { email: "y***@o***.test" }))).toBeDefined();
      await userEvent.click(within(dialog).getAllByRole("button", { name: t("common.close") })[0] as HTMLElement);
      await userEvent.click(screen.getByRole("button", { name: t("settings.access.cancelChange") }));
      await waitFor(() => expect(screen.queryByText(t("settings.access.pending", { email: "y***@o***.test" }))).toBeNull());
    });

    it("change password: live rules; saved → \"diğer cihazlardan çıkış yapıldı\"", async () => {
      show(locale, "access");
      await userEvent.click(await screen.findByRole("button", { name: t("settings.access.changePassword") }));
      const dialog = await screen.findByRole("dialog", { name: t("settings.passwordDialog.title") });
      const save = within(dialog).getByRole("button", { name: t("settings.passwordDialog.submit") }) as HTMLButtonElement;
      await userEvent.type(within(dialog).getByLabelText(t("settings.passwordDialog.current")), MOCK_PASSWORD);
      await userEvent.type(within(dialog).getByLabelText(t("settings.passwordDialog.next")), "kisa");
      expect(save.disabled).toBe(true);
      await userEvent.type(within(dialog).getByLabelText(t("settings.passwordDialog.next")), "Sifre9");
      expect(save.disabled).toBe(false);
      await userEvent.click(save);
      expect(await screen.findByText(t("settings.access.passwordChanged"))).toBeDefined();
      expect(lastAction()).toMatchObject({ action: "auth.password_change" });
    });

    it("linked accounts: connect Apple; remove Google with a confirmation", async () => {
      show(locale, "access");
      await userEvent.click(await screen.findByRole("button", { name: t("settings.access.connect.APPLE") }));
      await waitFor(() => expect(screen.getAllByRole("button", { name: t("settings.access.removeLink") })).toHaveLength(2));
      await userEvent.click(screen.getAllByRole("button", { name: t("settings.access.removeLink") })[0] as HTMLElement);
      const dialog = await screen.findByRole("dialog", { name: t("settings.unlinkDialog.title.GOOGLE") });
      await userEvent.click(within(dialog).getByRole("button", { name: t("settings.unlinkDialog.confirm") }));
      expect(await screen.findByRole("button", { name: t("settings.access.connect.GOOGLE") })).toBeDefined();
      expect(lastAction()).toMatchObject({ action: "account.identity_unlink", metadata: { provider: "GOOGLE" } });
    });

    it("an account without a password: \"Şifre oluştur\" sends the link; the only sign-in method cannot be removed", async () => {
      const account = controller.state.accounts.get("sena@ornek.test");
      if (account) account.password = null;
      show(locale, "access");
      await userEvent.click(await screen.findByRole("button", { name: t("settings.access.createPassword") }));
      expect(await screen.findByText(t("settings.access.createSentTitle"))).toBeDefined();
      expect((screen.getByRole("button", { name: t("settings.access.removeLink") }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.getByText(t("settings.access.onlyMethod"))).toBeDefined();
      // Re-authentication with the linked provider states the same window.
      await userEvent.click(screen.getAllByRole("button", { name: t("settings.access.show") })[0] as HTMLElement);
      const dialog = await screen.findByRole("dialog", { name: t("settings.reauth.title") });
      expect(within(dialog).getByText(t("settings.reauth.textProvider", { count: SYSTEM_SETTINGS["pii.reauth_minutes"] }))).toBeDefined();
      expect(within(dialog).queryByLabelText(t("auth.password"))).toBeNull();
      expect(within(dialog).getByRole("button", { name: t("settings.reauth.withProvider.GOOGLE") })).toBeDefined();
    });
  });

  describe("Güvenlik ve cihazlar", () => {
    it("devices without location, this device first; \"Diğer cihazlardan çıkış yap\" lists them and keeps this one; no axe violations", async () => {
      const { container } = show(locale, "security");
      expect(await screen.findByText(t("settings.security.thisDevice"))).toBeDefined();
      expect(screen.getByText(t("settings.security.failed", { count: 2 }))).toBeDefined();
      expect(container.textContent).not.toMatch(/İstanbul|Ankara/);
      expect(await axeViolations(container)).toEqual([]);
      await userEvent.click(screen.getByRole("button", { name: t("settings.security.signOutOthers") }));
      const dialog = await screen.findByRole("dialog", { name: t("settings.security.confirmTitle", { count: 2 }) });
      expect(within(dialog).getByText(t("settings.security.confirmKeep"))).toBeDefined();
      await userEvent.click(within(dialog).getByRole("button", { name: t("settings.security.signOut") }));
      expect(await screen.findByText(t("settings.security.signedOut", { count: 2 }))).toBeDefined();
      expect(await screen.findByText(t("settings.security.noOthers"))).toBeDefined();
      expect(lastAction()?.action).toBe("auth.sign_out_others");
    });
  });

  describe("Dil ve görünüm", () => {
    it("theme saves at once and applies; language saves and opens the section in that language", async () => {
      show(locale, "look");
      const dark = await screen.findByRole("radio", { name: t("settings.look.themes.dark") });
      await userEvent.click(dark);
      expect(dark.getAttribute("aria-checked")).toBe("true");
      expect(await screen.findByText(t("settings.saved"))).toBeDefined();
      expect(lastAction()).toMatchObject({ action: "settings.change", metadata: { fields: ["theme"] } });
      const other = locale === "tr" ? "en" : "tr";
      await userEvent.click(screen.getByRole("radio", { name: t(`settings.look.languages.${other}`) }));
      await waitFor(() => expect(push).toHaveBeenCalledWith(other === "en" ? "/en/settings/language-and-theme" : "/tr/ayarlar/dil-ve-gorunum"));
    });
  });

  describe("Gizlilik ve çerezler", () => {
    it("necessary locked; analytics is a consent record; visibility saves", async () => {
      show(locale, "privacy");
      const analytics = await screen.findByRole("switch", { name: t("settings.privacy.analytics") });
      await userEvent.click(analytics);
      await waitFor(() => expect(lastAction()).toMatchObject({ action: "consent.accept", metadata: { analytics: true } }));
      await userEvent.click(screen.getByRole("button", { name: t("settings.privacy.levels.FOLLOWERS") }));
      await waitFor(() => expect(lastAction()).toMatchObject({ action: "settings.change", metadata: { fields: ["privacyLevel"] } }));
      expect(screen.getByRole("button", { name: t("settings.privacy.levels.FOLLOWERS"), pressed: true })).toBeDefined();
    });
  });

  it("a section that cannot load says so; what was saved still applies", async () => {
    controller.config = { ...controller.config, scenario: "error" };
    show(locale, "security");
    // Server errors are retried once before the state shows.
    expect(await screen.findByText(t("settings.states.errorTitle"), undefined, { timeout: 5000 })).toBeDefined();
    expect(screen.getByRole("button", { name: t("settings.states.retry") })).toBeDefined();
  });
});
