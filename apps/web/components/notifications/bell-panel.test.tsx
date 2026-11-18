// @vitest-environment jsdom
// Bell panel + preview (design "5 Bildirimler" v2.1 Panel; decisions 2026-11-19) in the signed-in
// shell on the mock API: the live counter (coral only for an unread deal), the last 10, the
// preview opened beside the panel marks the item read, its values, chart and actions, the delivery
// answer, "Ben değilim" / "Bu bendim", "Tümünü okundu yap", the footer, no seller, tr and en, axe.
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { PLATFORMS, SELLERS } from "@firsatgeldi/mocks";
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
vi.mock("next/navigation", () => ({ usePathname: () => "/tr", useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const { server, controller } = createMockServer({ schedule: (task) => task(), seedTracking: true });
const { Providers } = await import("../providers");
const { SessionAppShell } = await import("../shell/session-app-shell");

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  controller.config = { ...controller.config, session: "user", scenario: "success", latencyMs: 0 };
});
afterEach(() => {
  cleanup();
  controller.state.notifications.length = 0;
  controller.state.notificationsSeeded.clear();
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function show(locale: Locale) {
  return render(
    <Providers locale={locale}>
      <SessionAppShell locale={locale}>
        <p>page</p>
      </SessionAppShell>
    </Providers>,
  );
}
const lastAction = () => controller.state.activity.at(-1);

describe.each(LOCALES)("Bell panel (%s)", (locale) => {
  const t = createTranslator(locale);
  const bell = (count: number) => screen.findByRole("button", { name: t("shell.bell.unread", { count }) }, { timeout: 4000 });
  const openPanel = async () => {
    show(locale);
    await userEvent.click(await bell(4));
    return screen.findByRole("dialog", { name: t("shell.bell.panelTitle") });
  };

  it("the counter on every page: 4 unread, coral while a deal is unread; the panel lists the last 10; no axe violations", async () => {
    const { baseElement } = show(locale);
    const button = await bell(4);
    expect(button.querySelector(".bg-accent")?.textContent).toBe("4");
    await userEvent.click(button);
    const panel = await screen.findByRole("dialog", { name: t("shell.bell.panelTitle") });
    expect(within(panel).getByText(t("notifications.panel.subtitle", { count: 4, last: 10 }))).toBeDefined();
    const list = await within(panel).findByRole("list", { name: t("notifications.panel.listLabel", { count: 10 }) });
    expect(within(list).getAllByRole("button")).toHaveLength(10);
    expect(within(panel).getByRole("link", { name: t("shell.bell.seeAll") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/bildirimler" : "/en/notifications");
    expect(within(panel).getByRole("link", { name: t("notifications.preferences") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/ayarlar/bildirimler" : "/en/settings/notifications");
    expect(await axeViolations(baseElement)).toEqual([]);
  });

  it("opening a deal: read (logged), preview beside with values, chart and the only coral \"Fırsatı gör\"; the counter turns neutral", async () => {
    const panel = await openPanel();
    const list = await within(panel).findByRole("list", { name: t("notifications.panel.listLabel", { count: 10 }) });
    await userEvent.click(within(list).getAllByRole("button").find((item) => item.textContent?.includes(t("notifications.types.DEAL_FOUND"))) as HTMLElement);
    await waitFor(() => expect(lastAction()).toMatchObject({ action: "notification.read", metadata: { type: "DEAL_FOUND" } }));
    const preview = await screen.findByRole("region", { name: /Insta360 Ace Pro 2/ });
    expect(within(preview).getByText(t("notifications.preview.facts.paid"))).toBeDefined();
    expect(within(preview).getByText(t("notifications.preview.facts.saving"))).toBeDefined();
    expect(within(preview).getByText(t("notifications.preview.chartTitle", { count: 14 }))).toBeDefined();
    expect(within(preview).getByText(t("notifications.preview.legendPaid"))).toBeDefined();
    // The own store without a suffix, the day with its own: "Hepsiburada · 1 Kasım'da aldın".
    expect(within(preview).getByText(new RegExp(locale === "tr" ? "Hepsiburada · \\d{1,2} \\p{L}+'(da|de|ta|te) aldın" : "Bought at Hepsiburada on \\d{1,2} \\p{L}+", "u"))).toBeDefined();
    const coral = within(preview).getByRole("link", { name: t("notifications.actions.seeDeal") });
    expect(coral.className).toContain("bg-accent");
    expect(within(preview).getByRole("link", { name: t("notifications.panel.detail") })).toBeDefined();
    await waitFor(() => expect(screen.getByRole("button", { name: t("shell.bell.unread", { count: 3 }) }).querySelector(".bg-accent")).toBeNull());
  });

  it("the delivery question answered in the preview", async () => {
    const panel = await openPanel();
    const list = await within(panel).findByRole("list", { name: t("notifications.panel.listLabel", { count: 10 }) });
    await userEvent.click(within(list).getAllByRole("button").find((item) => item.textContent?.includes(t("notifications.bodies.DELIVERY_PROMPT"))) as HTMLElement);
    const preview = await screen.findByRole("region", { name: /Insta360 X4/ });
    expect(within(preview).getByText(t("notifications.preview.facts.seenStatus"))).toBeDefined();
    await userEvent.click(within(preview).getByRole("button", { name: t("notifications.actions.notYet") }));
    expect(await within(preview).findByText(new RegExp(locale === "tr" ? "tekrar soracağız" : "ask again"))).toBeDefined();
    expect(lastAction()).toMatchObject({ action: "notification.delivery_later" });
  });

  it("new device: \"Ben değilim\" → change password; \"Bu bendim\" closes the preview; device and browser only", async () => {
    // The Application Manager's panel holds a new-device item (the user's is older than the last 10).
    controller.config = { ...controller.config, session: "manager" };
    show(locale);
    await userEvent.click(await bell(1));
    const panel = await screen.findByRole("dialog", { name: t("shell.bell.panelTitle") });
    const list = await within(panel).findByRole("list", { name: t("notifications.panel.listLabel", { count: 2 }) });
    await userEvent.click(within(list).getAllByRole("button").find((entry) => entry.textContent?.includes(t("notifications.titles.NEW_DEVICE_SIGNIN"))) as HTMLElement);
    const preview = await screen.findByRole("region", { name: t("notifications.titles.NEW_DEVICE_SIGNIN") });
    expect(within(preview).getByText("Safari")).toBeDefined();
    expect(within(preview).getByText("macOS")).toBeDefined();
    expect(within(preview).getByRole("link", { name: t("notifications.actions.notMe") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/ayarlar/eposta-ve-sifre?islem=sifre" : "/en/settings/email-and-password?islem=sifre");
    expect(within(preview).getByRole("link", { name: t("notifications.panel.manageSecurity") })).toBeDefined();
    await userEvent.click(within(preview).getByRole("button", { name: t("notifications.actions.itsMe") }));
    await waitFor(() => expect(screen.queryByRole("region", { name: t("notifications.titles.NEW_DEVICE_SIGNIN") })).toBeNull());
  });

  it("\"Tümünü okundu yap\": the counter goes; no seller identity in the panel or a preview", async () => {
    const panel = await openPanel();
    const list = await within(panel).findByRole("list", { name: t("notifications.panel.listLabel", { count: 10 }) });
    await userEvent.click(within(panel).getByRole("button", { name: t("notifications.readAll") }));
    await waitFor(() => expect(screen.getByRole("button", { name: t("shell.bell.label") })).toBeDefined());
    expect(lastAction()).toMatchObject({ action: "notification.read_all" });
    // Every preview of the last 10: no seller, and no store but the user's own purchases.
    const ownStores = new Set(["Hepsiburada", "Teknosa", "Amazon TR"]);
    for (const item of within(list).getAllByRole("button")) {
      await userEvent.click(item);
      await waitFor(() => expect(item.getAttribute("aria-pressed")).toBe("true"));
      const text = document.body.textContent ?? "";
      // A store that also sells under its own name may appear only as the user's own purchase.
      for (const seller of Object.values(SELLERS)) if (!ownStores.has(seller.name)) expect(text).not.toContain(seller.name);
      for (const platform of Object.values(PLATFORMS)) if (!ownStores.has(platform.name)) expect(text).not.toContain(platform.name);
    }
  });
});
