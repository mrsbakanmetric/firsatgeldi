// @vitest-environment jsdom
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { axeViolations } from "@firsatgeldi/ui/test";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "./admin-shell";
import { AppShell } from "./app-shell";
import { AuthShell } from "./auth-shell";

const navigation = vi.hoisted(() => ({ pathname: "/tr" }));
vi.mock("next/navigation", () => ({ usePathname: () => navigation.pathname }));
vi.mock("next/link", () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props} />,
}));

afterEach(cleanup);
beforeEach(() => {
  navigation.pathname = "/tr";
});

const user = { kind: "user", initials: "SB", unreadCount: 3, unreadDeal: true } as const;

describe.each(LOCALES)("shells in %s", (locale: Locale) => {
  const t = createTranslator(locale);

  it("AppShell (signed in): main navigation in the decided order, current page marked, bell and profile menu", async () => {
    navigation.pathname = `/${locale}/${locale === "tr" ? "takip" : "tracking"}`;
    render(
      <AppShell locale={locale} viewer={user}>
        <h1>{t("pages.tracking")}</h1>
      </AppShell>,
    );
    const [topNav] = screen.getAllByRole("navigation", { name: t("shell.mainNav") });
    const links = within(topNav as HTMLElement).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([t("shell.nav.home"), t("shell.nav.tracking"), t("shell.nav.search"), t("shell.nav.discover"), t("shell.nav.savings")]);
    expect(links[1]?.getAttribute("aria-current")).toBe("page");
    // md–lg: icon only, label visually hidden but still the accessible name, plus a tooltip hidden from lg.
    for (const link of links) {
      expect(link.querySelector("span")?.className).toContain("sr-only lg:not-sr-only");
      expect(link.parentElement?.querySelector("[aria-hidden='true'].lg\\:hidden")?.textContent).toBe(link.textContent);
    }
    expect(screen.getByRole("button", { name: t("shell.bell.unread", { count: 3 }) })).toBeDefined();
    expect(screen.getByRole("main")).toBeDefined();
    expect(screen.getByRole("link", { name: t("shell.skipToContent") }).getAttribute("href")).toBe("#main");
    expect(await axeViolations()).toEqual([]);
  });

  it("AppShell (signed in): phone tab bar has four sections + Profil, which opens the profile menu", async () => {
    render(
      <AppShell locale={locale} viewer={user}>
        <p />
      </AppShell>,
    );
    const tabBar = screen.getAllByRole("navigation", { name: t("shell.mainNav") })[1] as HTMLElement;
    expect(within(tabBar).getAllByRole("link").map((link) => link.textContent)).toEqual([t("shell.nav.home"), t("shell.nav.tracking"), t("shell.nav.search"), t("shell.nav.savings")]);
    await userEvent.click(within(tabBar).getByRole("button", { name: t("shell.nav.profile") }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual([
      t("shell.profileMenu.profile"),
      t("shell.profileMenu.plan"),
      t("shell.profileMenu.settings"),
    ]);
  });

  it("AppShell (guest in the app): normal navigation with sign-in instead of bell and profile", () => {
    render(
      <AppShell locale={locale} viewer={{ kind: "guest" }}>
        <p />
      </AppShell>,
    );
    expect(screen.queryByRole("button", { name: new RegExp(t("shell.bell.label")) })).toBeNull();
    expect(within(screen.getByRole("banner")).getByRole("link", { name: t("shell.signIn") })).toBeDefined();
    const tabBar = screen.getAllByRole("navigation", { name: t("shell.mainNav") })[1] as HTMLElement;
    expect(within(tabBar).getByRole("link", { name: t("shell.nav.signIn") })).toBeDefined();
  });

  it("AppShell (landing): guest navigation, sign-in and start free, no tab bar", async () => {
    render(
      <AppShell locale={locale} viewer={{ kind: "guest" }} variant="landing">
        <p />
      </AppShell>,
    );
    const navs = screen.getAllByRole("navigation", { name: t("shell.mainNav") });
    expect(navs).toHaveLength(1);
    expect(within(navs[0] as HTMLElement).getAllByRole("link").map((link) => link.textContent)).toEqual([
      t("shell.guestNav.howItWorks"),
      t("shell.guestNav.examples"),
      t("shell.guestNav.rights"),
      t("shell.guestNav.help"),
    ]);
    expect(screen.getByRole("link", { name: t("shell.startFree") })).toBeDefined();
    expect(await axeViolations()).toEqual([]);
  });

  it("footer (app shell v2): one thin row — legal links, then the language switch at the right end; no commission sentence", () => {
    navigation.pathname = locale === "tr" ? "/tr/takip/42" : "/en/tracking/42";
    render(
      <AppShell locale={locale} viewer={{ kind: "guest" }}>
        <p />
      </AppShell>,
    );
    const footer = screen.getByRole("navigation", { name: t("shell.footer.label") });
    expect(within(footer).getAllByRole("link")).toHaveLength(5);
    expect(screen.queryByText(t("shell.footer.commissionNote"))).toBeNull();
    const languages = screen.getByRole("navigation", { name: t("shell.language.label") });
    // Same row: the links and the language switch are siblings, the switch last.
    expect(footer.parentElement).toBe(languages.parentElement);
    expect(footer.parentElement?.lastElementChild).toBe(languages);
    expect(within(languages).getByRole("link", { name: "English" }).getAttribute("href")).toBe("/en/tracking/42");
    expect(within(languages).getByRole("link", { name: "Türkçe" }).getAttribute("href")).toBe("/tr/takip/42");
  });

  it("AuthShell: logo and language switch only, minimal footer", async () => {
    render(
      <AuthShell locale={locale}>
        <h1>{t("shell.signIn")}</h1>
      </AuthShell>,
    );
    expect(screen.queryByRole("navigation", { name: t("shell.mainNav") })).toBeNull();
    expect(screen.queryByRole("button", { name: new RegExp(t("shell.bell.label")) })).toBeNull();
    expect(within(screen.getByRole("navigation", { name: t("shell.footer.label") })).getAllByRole("link")).toHaveLength(4);
    expect(await axeViolations()).toEqual([]);
  });

  it("AdminShell: admin menu, switch to user view, neutral bell, audit note; no sub-navigation", async () => {
    render(
      <AdminShell locale={locale} section="fraud" initials="SB" unreadCount={2}>
        <h1>{t("shell.admin.fraud")}</h1>
      </AdminShell>,
    );
    const menu = screen.getByRole("navigation", { name: t("shell.admin.nav") });
    const links = within(menu).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      t("shell.admin.overview"),
      t("shell.admin.users"),
      t("shell.admin.products"),
      t("shell.admin.sources"),
      t("shell.admin.fraud"),
      t("shell.admin.system"),
    ]);
    expect(links[4]?.getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: t("shell.admin.userView") })).toBeDefined();
    expect(screen.getByText(t("shell.admin.auditNote"))).toBeDefined();
    expect(screen.getAllByRole("navigation").map((nav) => nav.getAttribute("aria-label"))).toEqual([t("shell.admin.nav")]);
    expect(await axeViolations()).toEqual([]);
  });
});
