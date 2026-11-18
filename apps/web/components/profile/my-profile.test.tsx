// @vitest-environment jsdom
// Profilim (design "13 Keşfet ve Profil" v2.1 Me + MeStates; decisions 2026-11-18) on the mock API:
// every text from the catalogue in tr and en, the header and its states, the three lists with
// their actions and "Geri al", the read-only "Neyi kim görüyor?", the view-as preview, the
// activity rows and axe.
import { formatSince } from "@firsatgeldi/core";
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { PLATFORMS, SELLERS, USERS } from "@firsatgeldi/mocks";
import { createMockServer } from "@firsatgeldi/mocks/node";
import { axeViolations } from "@firsatgeldi/ui/test";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://mock.test");
vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "off");
vi.mock("next/link", () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props} />,
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/tr/profil", useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const { server, controller } = createMockServer({ schedule: (task) => task() });
const { Providers } = await import("../providers");
const { MyProfile } = await import("./my-profile");

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  controller.config = { ...controller.config, session: "user", scenario: "success", latencyMs: 0 };
});
afterEach(() => {
  cleanup();
  const { state } = controller;
  state.follows.length = 0;
  state.blocks.length = 0;
  state.profileSeeded.clear();
  state.removedFollows.length = 0;
  state.notifications.length = 0;
  state.profiles.clear();
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function show(locale: Locale) {
  return render(
    <Providers locale={locale}>
      <MyProfile locale={locale} />
    </Providers>,
  );
}
const lastAction = () => controller.state.activity.at(-1);
/** Ayarlar › Gizlilik visibility for the signed-in user (the mock row is created on first use). */
function setVisibility(privacyLevel: "EVERYONE" | "FOLLOWERS" | "ONLY_ME") {
  const user = USERS.user;
  controller.state.profiles.set(user.id, { displayName: user.displayName, username: user.username, usernameChangedAt: null, avatarSha256: null, locale: user.locale, theme: "system", privacyLevel });
}

describe.each(LOCALES)("Profilim (%s)", (locale) => {
  const t = createTranslator(locale);

  it("header: @username, badge, visibility from Settings, four counts, member since, edit and copy; no axe violations", async () => {
    const { container } = show(locale);
    expect(await screen.findByRole("heading", { level: 1, name: `@${USERS.user.username}` })).toBeDefined();
    expect(screen.getByText(t("profile.badge"))).toBeDefined();
    expect(screen.getAllByText(t("settings.privacy.levels.ONLY_ME")).length).toBeGreaterThan(0);
    expect(screen.getByText(t("profile.counts.followers", { count: 3 }))).toBeDefined();
    expect(screen.getByText(t("profile.counts.verifiedShares", { count: 1 }))).toBeDefined();
    expect(screen.getByText(new RegExp(locale === "tr" ? "\\d{4}'(dan|den|tan|ten) beri üye$" : "^Member since \\p{L}+ \\d{4}$", "u"))).toBeDefined();
    expect(screen.getByRole("link", { name: t("profile.edit") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/ayarlar/profil" : "/en/settings/profile");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("\"Profil bağlantısını kopyala\" copies /u/{username} and says so", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(globalThis.navigator, "clipboard", { value: { writeText }, configurable: true });
    show(locale);
    await userEvent.click(await screen.findByRole("button", { name: t("profile.copyLink") }));
    expect(writeText).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`/${locale}/u/${USERS.user.username}$`)));
    expect(screen.getByText(new RegExp(t("profile.copied", { link: "" }).replace(/[·]/g, "\\$&")))).toBeDefined();
  });

  it("a new account: \"Profilin hazır değil\" + \"Kullanıcı adı seç\"; no copy", async () => {
    controller.config = { ...controller.config, session: "newUser" };
    show(locale);
    expect(await screen.findByRole("heading", { level: 1, name: t("profile.noUsername") })).toBeDefined();
    expect(screen.getByRole("link", { name: t("profile.chooseUsername") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/ayarlar/profil" : "/en/settings/profile");
    expect(screen.queryByRole("button", { name: t("profile.copyLink") })).toBeNull();
    expect(screen.getByText(t("profile.memberSince", { since: formatSince(new Date(), locale) }))).toBeDefined();
  });

  it("Takipçilerim: \"Takip istekleri\" with Onayla / Reddet; approving notifies the requester; logged", async () => {
    show(locale);
    const requests = await screen.findByRole("region", { name: t("profile.requests", { count: 2 }) });
    expect(within(requests).getByText("@burak_t")).toBeDefined();
    // Names are plain text until other profiles exist.
    expect(within(requests).queryByRole("link")).toBeNull();
    await userEvent.click(within(requests).getAllByRole("button", { name: t("profile.approve") })[0] as HTMLElement);
    await waitFor(() => expect(screen.getByRole("region", { name: t("profile.requests", { count: 1 }) })).toBeDefined());
    expect(lastAction()).toMatchObject({ action: "follow.approve" });
    expect(controller.state.notifications).toHaveLength(1);
    await userEvent.click(within(screen.getByRole("region", { name: t("profile.requests", { count: 1 }) })).getByRole("button", { name: t("profile.decline") }));
    await waitFor(() => expect(screen.queryByRole("region", { name: new RegExp(t("profile.requests", { count: 1 }).split("·")[0]?.trim() ?? "") })).toBeNull());
    expect(lastAction()).toMatchObject({ action: "follow.decline" });
  });

  it("\"Takipten çıkar\": no dialog, the result line with \"Geri al\" brings the follower back", async () => {
    show(locale);
    const row = (await screen.findByText("@emre.y")).closest("li") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: t("profile.remove") }));
    expect(await screen.findByText(t("profile.done.removed", { username: "emre.y" }))).toBeDefined();
    await waitFor(() => expect(screen.queryByText("@emre.y")).toBeNull());
    expect(lastAction()).toMatchObject({ action: "follower.remove" });
    await userEvent.click(screen.getByRole("button", { name: t("profile.undo") }));
    expect(await screen.findByText("@emre.y")).toBeDefined();
    expect(lastAction()).toMatchObject({ action: "follower.restore" });
  });

  it("Takip ettiklerim: \"İsteği geri al\" for a waiting request, \"Takipten çık\" otherwise; \"Geri al\" restores", async () => {
    show(locale);
    await userEvent.click(await screen.findByRole("tab", { name: t("profile.tabs.following") }));
    const selin = (await screen.findByText("@selin.k")).closest("li") as HTMLElement;
    expect(within(selin).getByText(t("profile.meta.pending"))).toBeDefined();
    await userEvent.click(within(selin).getByRole("button", { name: t("profile.withdraw") }));
    expect(await screen.findByText(t("profile.done.withdrawn", { username: "selin.k" }))).toBeDefined();
    expect(lastAction()).toMatchObject({ action: "follow.delete", metadata: { previous: "PENDING" } });
    await userEvent.click(screen.getByRole("button", { name: t("profile.undo") }));
    expect(await screen.findByText("@selin.k")).toBeDefined();
    const ayse = screen.getByText("@ayse_d").closest("li") as HTMLElement;
    expect(within(ayse).getByRole("button", { name: t("profile.unfollow") })).toBeDefined();
  });

  it("Paylaştığım fırsatlar: statuses, prices with their check time, no seller or store; search by status; no axe violations", async () => {
    const { container } = show(locale);
    await userEvent.click(await screen.findByRole("tab", { name: t("profile.tabs.shares") }));
    expect(await screen.findByText(t("profile.share.status.VERIFIED", { count: 1 }))).toBeDefined();
    expect(screen.getByText(t("profile.share.status.PENDING"))).toBeDefined();
    expect(screen.getAllByText(t("profile.share.status.REJECTED"))).toHaveLength(2);
    expect(screen.getByText(new RegExp(locale === "tr" ? "^Farklı model \\(GoPro Hero 12 Black\\) · " : "^Different model \\(GoPro Hero 12 Black\\) · "))).toBeDefined();
    const text = container.textContent ?? "";
    for (const seller of Object.values(SELLERS)) expect(text).not.toContain(seller.name);
    for (const platform of Object.values(PLATFORMS)) expect(text).not.toContain(platform.name);
    expect(screen.queryByRole("button", { name: /paylaş|share/i })).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
    await userEvent.type(screen.getByRole("textbox", { name: t("profile.searchShares") }), t("profile.share.status.PENDING"));
    await waitFor(() => expect(within(screen.getByRole("tabpanel")).getAllByRole("listitem")).toHaveLength(1));
    await userEvent.type(screen.getByRole("textbox", { name: t("profile.searchShares") }), "zzqx");
    expect(await screen.findByText(t("profile.noShares"))).toBeDefined();
  });

  it("\"Neyi kim görüyor?\" is read-only and links to Gizlilik; searches are never shared", async () => {
    show(locale);
    const card = await screen.findByRole("heading", { name: t("profile.visibility.title"), level: 2 });
    const section = card.closest("section") as HTMLElement;
    expect(within(section).getByText(t("profile.visibility.never"))).toBeDefined();
    expect(within(section).getAllByText(t("settings.privacy.levels.ONLY_ME")).length).toBe(5);
    expect(within(section).queryByRole("switch")).toBeNull();
    expect(within(section).getByRole("link", { name: t("profile.visibility.link") }).getAttribute("href")).toBe(locale === "tr" ? "/tr/ayarlar/gizlilik" : "/en/settings/privacy");
  });

  it("preview: \"Bir takipçi\" re-renders the page; a hidden profile says so; \"Takip etmeyen biri\" only when public", async () => {
    show(locale);
    expect(await screen.findByRole("radio", { name: t("profile.preview.options.me") })).toBeDefined();
    expect(screen.queryByRole("radio", { name: t("profile.preview.options.stranger") })).toBeNull();
    await userEvent.click(screen.getByRole("radio", { name: t("profile.preview.options.follower") }));
    expect(await screen.findByText(t("profile.preview.hidden.follower"))).toBeDefined();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("button", { name: t("profile.copyLink") })).toBeNull();
    expect(screen.queryByText(t("profile.counts.verifiedShares", { count: 1 }))).toBeNull();
    cleanup();

    setVisibility("EVERYONE");
    show(locale);
    await userEvent.click(await screen.findByRole("radio", { name: t("profile.preview.options.stranger") }));
    expect(await screen.findByText(t("profile.preview.visible.stranger"))).toBeDefined();
    expect(screen.getByText(new RegExp(t("profile.preview.privateKinds", { list: "" }).replace(/[:]/g, "\\$&") + "$"))).toBeDefined();
    expect(screen.getByText(t("profile.counts.followers", { count: 3 }))).toBeDefined();
  });

  it("empty lists: \"Henüz takipçin yok\" + copy link; nothing followed; no shares", async () => {
    controller.config = { ...controller.config, session: "secondUser" };
    show(locale);
    expect(await screen.findByText(t("profile.empty.followers.title"))).toBeDefined();
    expect(screen.getAllByRole("button", { name: t("profile.copyLink") })).toHaveLength(2);
    await userEvent.click(screen.getByRole("tab", { name: t("profile.tabs.following") }));
    expect(await screen.findByText(t("profile.empty.following.title"))).toBeDefined();
    await userEvent.click(screen.getByRole("tab", { name: t("profile.tabs.shares") }));
    expect(await screen.findByText(t("profile.empty.shares.title"))).toBeDefined();
  });

  it("error: \"Profilin şu an yüklenemedi\" + \"Tekrar dene\"; a guest is asked to sign in and comes back", async () => {
    controller.config = { ...controller.config, scenario: "error" };
    show(locale);
    expect(await screen.findByText(t("profile.states.errorTitle"), {}, { timeout: 5000 })).toBeDefined();
    expect(screen.getByRole("button", { name: t("profile.states.retry") })).toBeDefined();
    cleanup();
    controller.config = { ...controller.config, scenario: "success", session: "guest" };
    show(locale);
    const link = await screen.findByRole("link", { name: t("shell.signIn") });
    expect(decodeURIComponent(link.getAttribute("href") ?? "")).toContain(locale === "tr" ? "/tr/profil" : "/en/profile");
  });
});
