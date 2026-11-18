// @vitest-environment jsdom
// Settings and Account, PR 3 (design "9 Ayarlar" v2.1: Main, AdminMain, States, Forms) on the
// mock API: Bildirimler, Arama geçmişi, Verilerim ve hesap, Yetkilerim, Yönetim etkinliğim and the
// Home banner after deleting — every text from the catalogue in tr and en, the decisions of
// 2026-11-18, the activity rows and axe.
import { RETURN_REMINDER_DAYS } from "@firsatgeldi/core";
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { MOCK_PASSWORD, SYSTEM_SETTINGS } from "@firsatgeldi/mocks";
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
vi.mock("next/navigation", () => ({ usePathname: () => "/tr/ayarlar/bildirimler", useRouter: () => ({ push, replace: vi.fn() }) }));

const { server, controller } = createMockServer({ schedule: (task) => task() });
const { Providers } = await import("../providers");
const { Settings } = await import("./settings");
const { Home } = await import("../home/home");

// The download starts with a link click; jsdom has no navigation.
const clicked = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  controller.config = { ...controller.config, session: "user", scenario: "success", latencyMs: 0 };
});
afterEach(() => {
  cleanup();
  push.mockReset();
  clicked.mockClear();
  for (const table of [controller.state.access, controller.state.notificationPrefs]) table.clear();
  controller.state.hiddenSearches.clear();
  controller.state.dataExports.length = 0;
  const account = controller.state.accounts.get("sena@ornek.test");
  if (account) Object.assign(account, { state: "ACTIVE", deletionRequestedAt: null, purgeAfter: null, password: MOCK_PASSWORD });
  globalThis.history.replaceState(null, "", "/");
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
  clicked.mockRestore();
});

function show(locale: Locale, section: SettingsSectionId) {
  return render(
    <Providers locale={locale}>
      <Settings locale={locale} section={section} />
    </Providers>,
  );
}
const lastAction = () => controller.state.activity.at(-1);

describe.each(LOCALES)("Settings, PR 3 (%s)", (locale) => {
  const t = createTranslator(locale);

  describe("Bildirimler", () => {
    it("delivery, time slots, the daily cap and the type × channel switches; locked rows; no axe violations", async () => {
      const { container } = show(locale, "notifications");
      const table = await screen.findByRole("table", { name: t("settings.notifications.table") });
      expect(screen.getByRole("radio", { name: new RegExp(t("settings.notifications.instant")) }).getAttribute("aria-checked")).toBe("true");
      expect(screen.getByRole("button", { name: t("settings.notifications.slots.ALWAYS") }).getAttribute("aria-pressed")).toBe("true");
      expect(screen.getByText(t("settings.notifications.capValue", { count: SYSTEM_SETTINGS["notify.daily_cap"], used: 3 }))).toBeDefined();
      expect(screen.getByText(t("settings.notifications.urgentNote", { count: RETURN_REMINDER_DAYS }))).toBeDefined();
      // Combined rows are one row; the account row is locked on.
      expect(within(table).getByText(t("settings.notifications.rows.PRICE_DROP_TARGET.title"))).toBeDefined();
      const locked = within(table).getByRole("switch", { name: t("settings.notifications.switchLabel", { type: t("settings.notifications.rows.ACCOUNT_SECURITY.title"), channel: t("settings.notifications.channels.EMAIL") }) }) as HTMLButtonElement;
      expect(locked.disabled).toBe(true);
      expect(locked.getAttribute("aria-checked")).toBe("true");
      // "Aradığın ürün ucuzladı" e-mail is off by default.
      const searched = within(table).getByRole("switch", { name: t("settings.notifications.switchLabel", { type: t("settings.notifications.rows.SEARCHED_PRODUCT_DROP.title"), channel: t("settings.notifications.channels.EMAIL") }) });
      expect(searched.getAttribute("aria-checked")).toBe("false");
      // The users' table has no admin group and no group headings.
      expect(screen.queryByText(t("settings.notifications.groups.ADMIN"))).toBeNull();
      expect(await axeViolations(container)).toEqual([]);
    });

    it("a switch saves at once (\"Kaydedildi\") and is logged as a settings change", async () => {
      show(locale, "notifications");
      const name = t("settings.notifications.switchLabel", { type: t("settings.notifications.rows.DEAL_FOUND.title"), channel: t("settings.notifications.channels.EMAIL") });
      await userEvent.click(await screen.findByRole("switch", { name }));
      expect(await screen.findByText(t("settings.saved"))).toBeDefined();
      await waitFor(() => expect(screen.getByRole("switch", { name }).getAttribute("aria-checked")).toBe("false"));
      expect(lastAction()).toMatchObject({ action: "settings.change", metadata: { section: "notifications", switches: 1 } });
    });

    it("time slots: \"Her zaman\" is exclusive; the digest names its time", async () => {
      show(locale, "notifications");
      await userEvent.click(await screen.findByRole("button", { name: t("settings.notifications.slots.MORNING") }));
      await waitFor(() => expect(screen.getByRole("button", { name: t("settings.notifications.slots.MORNING") }).getAttribute("aria-pressed")).toBe("true"));
      expect(screen.getByRole("button", { name: t("settings.notifications.slots.ALWAYS") }).getAttribute("aria-pressed")).toBe("false");
      await userEvent.click(screen.getByRole("button", { name: t("settings.notifications.slots.MORNING") }));
      await waitFor(() => expect(screen.getByRole("button", { name: t("settings.notifications.slots.ALWAYS") }).getAttribute("aria-pressed")).toBe("true"));
      const digest = screen.getByRole("radio", { name: new RegExp(t("settings.notifications.digest")) });
      expect(digest.textContent).toContain(locale === "tr" ? "19:00" : "7:00");
      await userEvent.click(digest);
      await waitFor(() => expect(screen.getByRole("radio", { name: new RegExp(t("settings.notifications.digest")) }).getAttribute("aria-checked")).toBe("true"));
    });

    it("the Application Manager sees \"Yönetim bildirimleri\" first; fraud cases cannot be turned off", async () => {
      controller.config = { ...controller.config, session: "manager" };
      show(locale, "notifications");
      const table = await screen.findByRole("table", { name: t("settings.notifications.table") });
      const headings = [t("settings.notifications.groups.ADMIN"), t("settings.notifications.groups.OWN")].map((text) => within(table).getByText(text));
      expect(headings[0]?.compareDocumentPosition(headings[1] as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      const fraud = within(table).getByRole("switch", { name: t("settings.notifications.switchLabel", { type: t("settings.notifications.rows.ADMIN_FRAUD_CASE.title"), channel: t("settings.notifications.channels.IN_APP") }) }) as HTMLButtonElement;
      expect(fraud.disabled).toBe(true);
    });
  });

  describe("Arama geçmişi", () => {
    it("rows with the product, tracking state and date — no price; category with counts; no axe violations", async () => {
      const { container } = show(locale, "history");
      const rows = await screen.findAllByRole("listitem");
      expect(rows.length).toBeGreaterThan(0);
      expect(screen.getAllByText(new RegExp(`${t("settings.history.tracking")}|${t("settings.history.notTracking")}`)).length).toBeGreaterThan(0);
      expect(container.textContent).not.toMatch(/TL|₺/);
      // The combobox is named by its label and the chosen value ("Kategori Tümü").
      const category = screen.getByRole("combobox", { name: new RegExp(`^${t("settings.history.category")} ${t("settings.history.all")}`) });
      await userEvent.click(category);
      expect(screen.getAllByRole("option").length).toBeGreaterThan(1);
      await userEvent.keyboard("{Escape}");
      expect(await axeViolations(container)).toEqual([]);
    });

    it("\"Gizle\" removes the search; \"Arama gizlendi · Geri al\" brings it back; both logged", async () => {
      show(locale, "history");
      const before = (await screen.findAllByRole("listitem")).length;
      await userEvent.click(screen.getAllByRole("button", { name: t("settings.history.hide") })[0] as HTMLElement);
      expect(await screen.findByText(t("settings.history.hidden"))).toBeDefined();
      await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(before - 1));
      expect(lastAction()).toMatchObject({ action: "search_history.hide" });
      await userEvent.click(screen.getByRole("button", { name: t("settings.history.undo") }));
      await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(before));
      expect(screen.queryByText(t("settings.history.hidden"))).toBeNull();
      expect(lastAction()).toMatchObject({ action: "search_history.unhide" });
    });

    it("nothing matches the search → \"Eşleşen arama yok\" + \"Filtreyi temizle\"", async () => {
      show(locale, "history");
      await screen.findAllByRole("listitem");
      await userEvent.type(screen.getByRole("textbox", { name: t("settings.history.search") }), "zzqx");
      expect(await screen.findByText(t("settings.history.noResults"))).toBeDefined();
      await userEvent.click(screen.getAllByRole("button", { name: t("settings.history.clear") }).at(-1) as HTMLElement);
      expect((await screen.findAllByRole("listitem")).length).toBeGreaterThan(0);
    });

    it("no searches yet → \"Henüz arama yok\" + \"Ürün ara\"", async () => {
      controller.config = { ...controller.config, session: "secondUser" };
      show(locale, "history");
      expect(await screen.findByText(t("settings.history.emptyTitle"))).toBeDefined();
      expect(screen.getByRole("link", { name: t("settings.history.emptyAction") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/ara" : "/en/search");
    });
  });

  describe("Verilerim ve hesap", () => {
    it("export: \"Dosya hazırla\" → \"Dosyan hazır\" → \"İndir (ZIP)\"; the plan summary links to Paketim; no axe violations", async () => {
      const { container } = show(locale, "data");
      expect(await screen.findByText(t("settings.data.exportText"))).toBeDefined();
      expect(screen.getByRole("link", { name: t("settings.data.planLink") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/paketim" : "/en/plan");
      expect(await axeViolations(container)).toEqual([]);
      await userEvent.click(screen.getByRole("button", { name: t("settings.data.prepare") }));
      expect(lastAction()).toMatchObject({ action: "account.export" });
      // The mock prepares it at once here; the card turns into the ready state.
      expect(await screen.findByText(t("settings.data.readyTitle"))).toBeDefined();
      expect(screen.getByText(new RegExp(t("settings.data.readyText", { count: SYSTEM_SETTINGS["account.export_download_days"], date: "X" }).split("X")[1] ?? ""))).toBeDefined();
      await userEvent.click(screen.getByRole("button", { name: t("settings.data.download") }));
      await waitFor(() => expect(clicked).toHaveBeenCalledOnce());
      expect(lastAction()).toMatchObject({ action: "account.export_download" });
    });

    it("delete: the dialog lists what happens; the box enables the button; the password is asked; signed out to Home with the date", async () => {
      show(locale, "data");
      await userEvent.click(await screen.findByRole("button", { name: t("settings.data.deleteButton") }));
      const dialog = await screen.findByRole("dialog", { name: t("settings.data.dialogTitle") });
      expect(within(dialog).getByText(t("settings.data.keepsTokens"))).toBeDefined();
      expect(within(dialog).getByText(t("settings.data.purge"))).toBeDefined();
      const confirm = within(dialog).getByRole("button", { name: t("settings.data.deleteButton") }) as HTMLButtonElement;
      expect(confirm.disabled).toBe(true);
      await userEvent.click(within(dialog).getByRole("checkbox", { name: t("settings.data.confirm") }));
      expect(confirm.disabled).toBe(false);
      await userEvent.click(confirm);
      const reauth = await screen.findByRole("dialog", { name: t("settings.reauth.title") });
      await userEvent.type(within(reauth).getByLabelText(t("auth.password")), MOCK_PASSWORD);
      await userEvent.click(within(reauth).getByRole("button", { name: t("settings.reauth.submit") }));
      await waitFor(() => expect(push).toHaveBeenCalledOnce());
      expect(push.mock.calls[0]?.[0]).toMatch(locale === "tr" ? /^\/tr\?deletion=\d{4}-\d{2}-\d{2}$/ : /^\/en\?deletion=\d{4}-\d{2}-\d{2}$/);
      expect(controller.state.activity.some((row) => row.action === "account.delete")).toBe(true);
      expect(controller.state.accounts.get("sena@ornek.test")?.state).toBe("PENDING_DELETION");
      expect(controller.config.session).toBe("guest");
    });

    it("the Application Manager: own data only in the export; delete closed until the role is handed over; no plan summary", async () => {
      controller.config = { ...controller.config, session: "manager" };
      show(locale, "data");
      expect(await screen.findByText(t("settings.data.exportTextAdmin"))).toBeDefined();
      expect(screen.getByText(t("settings.data.deleteTextAdmin"))).toBeDefined();
      expect((screen.getByRole("button", { name: t("settings.data.deleteButton") }) as HTMLButtonElement).disabled).toBe(true);
      expect(screen.queryByRole("link", { name: t("settings.data.planLink") })).toBeNull();
    });
  });

  describe("Application Manager sections", () => {
    it("Yetkilerim: role card with the link, seven groups of official keys; no axe violations", async () => {
      controller.config = { ...controller.config, session: "manager" };
      const { container } = show(locale, "permissions");
      expect(await screen.findByText(t("settings.permissions.roles.APP_MANAGER"))).toBeDefined();
      expect(screen.getByText(t("settings.permissions.managerLine", { count: 2 }))).toBeDefined();
      expect(screen.getByRole("link", { name: t("settings.permissions.link") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/admin/roller" : "/en/admin/roles");
      expect(screen.getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent)).toEqual(
        (["self", "users", "catalog", "packages", "system", "security", "content"] as const).map((id) => t(`settings.permissions.groups.${id}`)),
      );
      expect(screen.getByText("admin.users.view_pii").tagName).toBe("CODE");
      expect(await axeViolations(container)).toEqual([]);
    });

    it("Yönetim etkinliğim: entries with reason and duration; type filter with counts; search; no axe violations", async () => {
      controller.config = { ...controller.config, session: "manager" };
      const { container } = show(locale, "activity");
      expect(await screen.findByText(t("settings.activity.actions.piiEmail"))).toBeDefined();
      expect(screen.getByText([t("settings.activity.user", { number: 48213 }), t("settings.activity.reason", { reason: "#912" }), t("settings.activity.openFor", { count: 10 })].join(t("common.listSeparator")))).toBeDefined();
      expect(screen.getByText(t("settings.activity.actions.setting", { setting: t("settings.activity.settingNames.dailyCap") }))).toBeDefined();
      expect(await axeViolations(container)).toEqual([]);
      const filters = screen.getByRole("group", { name: t("settings.activity.typesLabel") });
      await userEvent.click(within(filters).getByRole("button", { name: new RegExp(t("settings.activity.types.PII")) }));
      await waitFor(() => expect(screen.getAllByRole("listitem").every((row) => row.textContent?.includes(t("settings.activity.tags.PII")))).toBe(true));
      await userEvent.click(within(filters).getByRole("button", { name: new RegExp(t("settings.activity.types.ALL")) }));
      await userEvent.type(screen.getByRole("textbox", { name: t("settings.activity.search") }), "48213");
      await waitFor(() => expect(screen.getAllByRole("listitem")).toHaveLength(1));
      await userEvent.type(screen.getByRole("textbox", { name: t("settings.activity.search") }), "999");
      expect(await screen.findByText(t("settings.activity.noResults"))).toBeDefined();
    });

    it("Yönetim etkinliğim, nothing yet → \"Henüz yönetim işlemin yok\" + \"Genel bakışa git\"", async () => {
      controller.config = { ...controller.config, session: "manager", scenario: "empty" };
      show(locale, "activity");
      expect(await screen.findByText(t("settings.activity.emptyTitle"))).toBeDefined();
      expect(screen.getByRole("link", { name: t("settings.activity.emptyAction") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/admin" : "/en/admin");
    });
  });

  it("Home after deleting: the information banner with the restore date", async () => {
    controller.config = { ...controller.config, session: "guest" };
    globalThis.history.replaceState(null, "", `/${locale}?deletion=2026-12-18`);
    render(
      <Providers locale={locale}>
        <Home locale={locale} />
      </Providers>,
    );
    expect(await screen.findByText(locale === "tr" ? /18 Aralık 2026 tarihine kadar giriş yaparsan/ : /sign in by December 18, 2026/)).toBeDefined();
  });
});
