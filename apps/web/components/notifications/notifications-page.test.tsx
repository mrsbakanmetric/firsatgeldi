// @vitest-environment jsdom
// Notifications page (design "5 Bildirimler" v2.1 Main + States; decisions 2026-11-19) on the mock
// API: every text from the catalogue in tr and en, the filters and their counts, read on title or
// action, the delivery answer in the row, one coral action, fading, "Senin için", the states, the
// activity rows, no seller identity, and axe.
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { PLATFORMS, SELLERS, SYSTEM_SETTINGS, USERS } from "@firsatgeldi/mocks";
import { createMockServer } from "@firsatgeldi/mocks/node";
import { axeViolations } from "@firsatgeldi/ui/test";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://mock.test");
vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "off");
vi.mock("next/link", () => ({
  default: ({ href, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
      }}
    />
  ),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/tr/bildirimler", useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const { server, controller } = createMockServer({ schedule: (task) => task(), seedTracking: true });
const { Providers } = await import("../providers");
const { NotificationsPage } = await import("./notifications-page");

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  controller.config = { ...controller.config, session: "user", scenario: "success", latencyMs: 0 };
});
afterEach(() => {
  cleanup();
  controller.state.notifications.length = 0;
  controller.state.notificationsSeeded.clear();
  controller.state.notificationPrefs.clear();
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function show(locale: Locale) {
  return render(
    <Providers locale={locale}>
      <NotificationsPage locale={locale} />
    </Providers>,
  );
}
const lastAction = () => controller.state.activity.at(-1);
/** The list has loaded (the loading screen has the title too, but no filters). */
const ready = (t: ReturnType<typeof createTranslator>) => screen.findByRole("group", { name: t("notifications.filtersLabel") }, { timeout: 4000 });
const rowOf = (text: string | RegExp) => screen.getAllByText(text)[0]?.closest("li") as HTMLElement;

describe.each(LOCALES)("Notifications page (%s)", (locale) => {
  const t = createTranslator(locale);

  it("title, caption, filters with counts, groups, rows with image, type, mode and check time; one coral action; no axe violations", async () => {
    const { container } = show(locale);
    await ready(t);
    expect(screen.getByRole("heading", { level: 1, name: t("notifications.title") })).toBeDefined();
    expect(screen.getByText(new RegExp(t("notifications.unreadCount", { count: 4 })))).toBeDefined();
    expect(screen.getByText(new RegExp(t("notifications.window", { count: SYSTEM_SETTINGS["notify.list_days"] })))).toBeDefined();
    const filters = screen.getByRole("group", { name: t("notifications.filtersLabel") });
    expect(within(filters).getByRole("button", { name: new RegExp(`${t("notifications.filters.ALL")}.*13`) })).toBeDefined();
    expect(within(filters).getByRole("button", { name: new RegExp(`${t("notifications.filters.DEAL")}.*3`) })).toBeDefined();
    expect(screen.getByRole("heading", { level: 2, name: t("notifications.groups.today") })).toBeDefined();
    expect(screen.getAllByText(t("notifications.types.DEAL_FOUND")).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t("notifications.modes.BOUGHT")).length).toBeGreaterThan(0);
    // Times as each language writes them: tr "14.32", en "2:32 PM"; the type badge is 28 px (size.step-indicator-dot).
    const times = [...container.querySelectorAll("time")].map((element) => element.textContent ?? "");
    expect(times.some((text) => (locale === "tr" ? /^\d{2}\.\d{2}$/ : /^\d{1,2}:\d{2}\s?[AP]M$/).test(text.replace(/\u202f/g, " ")))).toBe(true);
    expect(times.some((text) => text.includes(":") && locale === "tr")).toBe(false);
    expect(container.querySelector(".size-\\(--size-step-indicator-dot\\)")).not.toBeNull();
    // Only the first unread deal's action is coral (deal variant = bg-accent).
    expect(container.querySelectorAll("a.bg-accent")).toHaveLength(1);
    expect(screen.getByRole("link", { name: t("notifications.preferences") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/ayarlar/bildirimler" : "/en/settings/notifications");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("no seller identity anywhere on the page; \"Fırsat geldi\" of an ended deal is faded", async () => {
    const { container } = show(locale);
    await ready(t);
    const text = container.textContent ?? "";
    for (const seller of Object.values(SELLERS)) expect(text).not.toContain(seller.name);
    for (const platform of Object.values(PLATFORMS)) expect(text).not.toContain(platform.name);
    expect(container.querySelectorAll(".opacity-60")).toHaveLength(1);
  });

  it("a filter, the search and \"Yalnızca okunmamışlar\"; an empty filter says so and shows all again", async () => {
    show(locale);
    const filters = await ready(t);
    await userEvent.click(within(filters).getByRole("button", { name: new RegExp(t("notifications.filters.SEARCH")) }));
    await waitFor(() => expect(screen.getAllByRole("listitem").filter((item) => item.textContent?.includes(t("notifications.types.SEARCHED_PRODUCT_DROP")))).toHaveLength(1));
    await userEvent.click(screen.getByRole("checkbox", { name: t("notifications.unreadOnly") }));
    await userEvent.click(within(filters).getByRole("button", { name: new RegExp(t("notifications.filters.OTHER")) }));
    expect(await screen.findByText(t("notifications.states.noMatch"))).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: t("notifications.states.clear") }));
    await userEvent.type(screen.getByRole("textbox", { name: t("notifications.searchLabel") }), "dyson");
    await waitFor(() => expect(screen.getAllByText(t("notifications.types.DEADLINE_SOON"))).toHaveLength(1));
  });

  it("opening the title or an action marks it read (logged); \"Tümünü okundu yap\" reads all", async () => {
    show(locale);
    await ready(t);
    const title = screen.getAllByRole("link", { name: /Dyson V15/ })[0] as HTMLElement;
    await userEvent.click(title);
    await waitFor(() => expect(lastAction()).toMatchObject({ action: "notification.read", metadata: { type: "DEADLINE_SOON" } }));
    await waitFor(() => expect(screen.getByText(new RegExp(t("notifications.unreadCount", { count: 3 })))).toBeDefined());
    await userEvent.click(screen.getByRole("button", { name: t("notifications.readAll") }));
    await waitFor(() => expect(screen.getByText(new RegExp(t("notifications.allRead")))).toBeDefined());
    expect(lastAction()).toMatchObject({ action: "notification.read_all" });
  });

  it("the delivery question in the row: \"Henüz değil\" asks again later; \"Evet, aldım\" records today", async () => {
    show(locale);
    await ready(t);
    const row = rowOf(t("notifications.bodies.DELIVERY_PROMPT"));
    await userEvent.click(within(row).getByRole("button", { name: t("notifications.actions.notYet") }));
    expect(await screen.findByText(new RegExp(locale === "tr" ? "tekrar soracağız" : "ask again"))).toBeDefined();
    expect(lastAction()).toMatchObject({ action: "notification.delivery_later" });
    // Answered: the row now leads to the product instead.
    await waitFor(() => expect(within(rowOf(t("notifications.bodies.DELIVERY_PROMPT"))).queryByRole("button", { name: t("notifications.actions.yes") })).toBeNull());
  });

  it("\"Evet, aldım\": delivered today, logged as tracking.delivered", async () => {
    show(locale);
    await ready(t);
    const row = rowOf(t("notifications.bodies.DELIVERY_PROMPT"));
    await userEvent.click(within(row).getByRole("button", { name: t("notifications.actions.yes") }));
    expect(await screen.findByText(new RegExp(locale === "tr" ? "Teslim günü bugün" : "Delivery day saved"))).toBeDefined();
    expect(lastAction()).toMatchObject({ action: "tracking.delivered", metadata: { source: "notification" } });
  });

  it("actions lead where the design says: Takip et → Search and Add with the product; Ben değilim → change password", async () => {
    show(locale);
    await ready(t);
    const track = screen.getAllByRole("link", { name: t("notifications.actions.track") })[0];
    expect(track?.getAttribute("href")).toMatch(new RegExp(`^/${locale}/(ara|search)\\?.*urun=`));
    expect(screen.getByRole("link", { name: t("notifications.actions.notMe") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/ayarlar/eposta-ve-sifre?islem=sifre" : "/en/settings/email-and-password?islem=sifre");
    expect(screen.getByText(t("notifications.titles.FOLLOW_ACCEPTED", { username: "ayse_d" }))).toBeDefined();
  });

  it("\"Senin için\": drops in the list, untracked searches with \"Takip et\", frequent searches", async () => {
    show(locale);
    await ready(t);
    const aside = screen.getByRole("complementary", { name: t("notifications.forYou.label") });
    expect(await within(aside).findByRole("heading", { name: t("notifications.forYou.drops") })).toBeDefined();
    expect(within(aside).getByRole("heading", { name: t("notifications.forYou.searches") })).toBeDefined();
    expect(within(aside).getAllByRole("link", { name: t("notifications.forYou.track") }).length).toBeGreaterThan(0);
    expect(within(aside).getByRole("heading", { name: t("notifications.forYou.frequent") })).toBeDefined();
  });

  it("states: digest on; empty; error; guest", async () => {
    controller.state.notificationPrefs.set(USERS.user.id, { delivery: "DIGEST", slots: ["ALWAYS"], switches: new Map() });
    show(locale);
    expect(await screen.findByText(new RegExp(locale === "tr" ? "Günlük özet açık" : "Daily digest on"))).toBeDefined();
    cleanup();

    controller.config = { ...controller.config, session: "secondUser" };
    show(locale);
    expect(await screen.findByText(t("notifications.states.emptyTitle"))).toBeDefined();
    expect(screen.getByRole("link", { name: t("notifications.states.editPreferences") })).toBeDefined();
    cleanup();

    controller.config = { ...controller.config, session: "user", scenario: "error" };
    show(locale);
    expect(await screen.findByText(t("notifications.states.errorTitle"), {}, { timeout: 5000 })).toBeDefined();
    cleanup();

    controller.config = { ...controller.config, session: "guest", scenario: "success" };
    show(locale);
    const link = await screen.findByRole("link", { name: t("shell.signIn") });
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain(locale === "tr" ? "/tr/bildirimler" : "/en/notifications");
  });
});
