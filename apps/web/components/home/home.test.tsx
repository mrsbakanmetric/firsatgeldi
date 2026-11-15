// @vitest-environment jsdom
// Home on the mock API (design "3 Ana Sayfa" v2; implementation_plan.md steps 10–21 definition
// of done): every text from the catalogue in tr and en; greeting + summary line; the search box
// (the shared CatalogueSearchBox, tested with Search and Add in catalogue-search/); Hemen Gözat (chart, ranked prices with "Göster", the
// page's one coral "Fırsatı gör", "Şimdi kontrol et"); the return reminder; four small cards
// with the emphasised second urgent item and one outcome width; "Şu an en çok düşenler" on
// shared rows; the states (new user, general list, hidden section, stale, error, loading, guest);
// the hidden-seller rule on the rendered page; axe.
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { OFFERS, PRODUCTS, SELLERS, seedTrackedItems } from "@firsatgeldi/mocks";
import { createMockServer } from "@firsatgeldi/mocks/node";
import { axeViolations } from "@firsatgeldi/ui/test";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://mock.test");
vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "off");
vi.mock("next/link", () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props} />,
}));
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/tr", useRouter: () => ({ push }) }));

const { server, controller } = createMockServer({ schedule: (task) => task(), seedTracking: true });
const { Providers } = await import("../providers");
const { Home } = await import("./home");

function reseed() {
  controller.state.trackedItems.length = 0;
  controller.state.checkNowUsage.length = 0;
  controller.state.lastChecks.clear();
  push.mockClear();
  seedTrackedItems(controller.state, new Date());
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  controller.config = { ...controller.config, session: "user", scenario: "success" };
  reseed();
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

/** Cheaper sellers of every seeded product: never named before "Göster" (own sellers are). */
const OWN_SELLERS = new Set(["kameraDunyasi", "teknosaMagaza", "kameraAtolyesi"]);
const HIDDEN_SELLERS = OFFERS.filter((offer) => !OWN_SELLERS.has(offer.seller)).map((offer) => SELLERS[offer.seller].name);

function show(locale: Locale) {
  return render(
    <Providers locale={locale}>
      <Home locale={locale} />
    </Providers>,
  );
}

const searchPath = (locale: Locale) => `/${locale}/${locale === "tr" ? "ara" : "search"}`;

describe.each(LOCALES)("Home — %s", (locale) => {
  const t = createTranslator(locale);
  const name = (key: keyof typeof PRODUCTS) => PRODUCTS[key].name[locale];
  const tl = (tr: string, en: string) => (locale === "tr" ? tr : en);

  it("greeting, summary line, Hemen Gözat, return reminder, four cards and top drops — one coral action, no hidden seller", async () => {
    const { container } = show(locale);
    const featured = await screen.findByRole("region", { name: name("acePro2FlashPrint") });
    expect(screen.getByRole("heading", { level: 1, name: t("home.greeting", { name: "Sena" }) })).toBeDefined();
    const caption = screen.getByText((_, element) => element?.tagName === "P" && (element.textContent ?? "").startsWith(t("home.summary.tracking", { count: 6 })));
    // Money is formatted with a no-break space; compare with ordinary spaces.
    const captionText = (caption.textContent ?? "").replace(/\s/g, " ");
    expect(captionText).toContain(t("home.summary.protected", { amount: tl("88.296 TL", "TL 88,296") }));
    expect(captionText).toContain(t("home.summary.deals", { count: 3 }));

    // Hemen Gözat: label, neutral "Fırsat geldi", return flag, max saving, savings border.
    expect(within(featured).getByText(t("home.featured.label"))).toBeDefined();
    expect(within(featured).getByText(t("trackedItems.row.flags.deal")).closest("[class*='bg-']")?.className).toContain("bg-surface-alt");
    expect(within(featured).getByText(t("home.featured.maxGain"))).toBeDefined();
    // The max saving large on the right (also the first offer's difference in the table).
    expect(within(featured).getAllByText(tl("3.002 TL", "TL 3,002")).some((element) => element.className.includes("text-display"))).toBe(true);
    expect(within(featured).getByText(t("home.featured.cheaperIn", { count: 2 }))).toBeDefined();
    expect(featured.className).toContain("border-savings");
    // The chart: one sentence for assistive technology, step points, the gap pill, legend and three tiles.
    const paidSentence = t("home.chart.labelPaid", { price: tl("28.999 TL", "TL 28,999") });
    expect(within(featured).getByRole("img", { name: (accessible) => accessible.replace(/\s/g, " ").includes(paidSentence) })).toBeDefined();
    expect(within(featured).getAllByTestId("step-point").length).toBeGreaterThan(2);
    expect(within(featured).getByTestId("price-gap")).toBeDefined();
    expect(within(featured).getByText(t("home.chart.gap", { amount: tl("3.002 TL", "TL 3,002") }))).toBeDefined();
    expect(within(featured).getByText(t("home.chart.legendGap"))).toBeDefined();
    expect(within(featured).getByText(t("trackedItems.v4.highest", { count: 14 }))).toBeDefined();
    expect(within(featured).getByText(t("home.chart.lowestToday", { price: tl("25.997 TL", "TL 25,997") }))).toBeDefined();
    // The ranked price table: own row first, two hidden offers by rank, each with "Göster".
    const table = within(featured).getByRole("table", { name: t("home.offers.label") });
    const rows = within(table).getAllByRole("row").map((row) => row.textContent ?? "");
    expect(rows[0]).toContain(SELLERS.kameraDunyasi.name);
    expect(rows[1]).toContain(t("trackedItems.v4.rankFirst"));
    expect(rows[2]).toContain(t("trackedItems.v4.rank", { rank: 2 }));
    expect(within(table).getAllByRole("button", { name: t("searchAdd.confirm.reveal") })).toHaveLength(2);
    // One coral element on the page: "Fırsatı gör".
    expect(container.querySelectorAll(".bg-accent")).toHaveLength(1);
    expect(within(featured).getByRole("link", { name: t("home.featured.seeDeal") }).className).toContain("bg-accent");
    expect(within(featured).getByText(t("home.featured.checksLeft", { count: 3 }))).toBeDefined();

    // Return reminder: Dyson ends within 2 days.
    const note = screen.getByRole("note");
    expect(note.textContent).toContain(t("home.returns.text", { count: 1, days: 2 }));
    expect(within(note).getByRole("link", { name: t("home.returns.one") }).getAttribute("href")).toMatch(/\/(takip|tracking)\/[0-9a-f-]{36}$/);

    // Four small cards; the second urgent item (coat, also a deal) first with the emphasised border.
    const cards = screen.getByRole("region", { name: t("home.cards.title") });
    const links = within(cards).getAllByRole("link").filter((link) => /\/(takip|tracking)\/[0-9a-f-]{36}$/.test(link.getAttribute("href") ?? ""));
    expect(links).toHaveLength(4);
    expect(links[0]?.getAttribute("aria-label")).toBe(`${name("winterCoat")}${t("common.listSeparator")}${t("home.cards.emphasised")}`);
    expect(links[0]?.className).toContain("border-savings");
    expect(within(cards).getByRole("link", { name: t("home.cards.all", { count: 6 }) }).getAttribute("href")).toBe(`/${locale}/${locale === "tr" ? "takip" : "tracking"}`);
    expect(within(cards).getByText(t("home.cards.gain", { count: 5 }))).toBeDefined();
    expect(within(cards).getAllByText(t("home.cards.noCheaper"))).toHaveLength(2);
    expect(within(cards).getByText(t("home.cards.reached"))).toBeDefined();
    // Every outcome column has the same token width; the rows share one height.
    for (const outcome of within(cards).getAllByTestId("card-outcome")) expect(outcome.className).toContain("w-(--size-card-outcome-width)");
    expect(cards.querySelector("ul")?.className).toContain("auto-rows-fr");

    // Top drops: three cards on shared rows, "Takip et" hands over with the product marked.
    const drops = screen.getByRole("region", { name: t("home.drops.title") });
    const dropCards = within(drops).getAllByTestId("drop-card");
    expect(dropCards).toHaveLength(3);
    for (const card of dropCards) expect(card.className).toContain("grid-rows-subgrid");
    expect(within(dropCards[0] as HTMLElement).getByText(name("osmoAction5Pro"))).toBeDefined();
    expect(within(dropCards[0] as HTMLElement).getByText(t("home.drops.dropped", { pct: 17 }))).toBeDefined();
    expect(within(dropCards[0] as HTMLElement).getByRole("link", { name: t("home.drops.follow") }).getAttribute("href")).toBe(`${searchPath(locale)}?urun=${PRODUCTS.osmoAction5Pro.id}`);
    expect(within(drops).queryByRole("button", { name: t("searchAdd.confirm.reveal") })).toBeNull();
    expect(within(drops).queryByText(t("home.drops.generalBadge"))).toBeNull();

    for (const seller of HIDDEN_SELLERS) expect(document.body.textContent).not.toContain(seller);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("“Göster” opens the seller in place (logged as reveal); “Gizle” hides it again", async () => {
    show(locale);
    const featured = await screen.findByRole("region", { name: name("acePro2FlashPrint") });
    const [first] = within(featured).getAllByRole("button", { name: t("searchAdd.confirm.reveal") });
    await userEvent.click(first as HTMLElement);
    expect(await within(featured).findByText(new RegExp(SELLERS.aksiyonMarket.name))).toBeDefined();
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "reveal", outcome: "OK" });
    expect(document.body.textContent).not.toContain(SELLERS.lensDeposu.name);
    await userEvent.click(within(featured).getByRole("button", { name: t("searchAdd.confirm.hide") }));
    await waitFor(() => expect(within(featured).queryByText(new RegExp(SELLERS.aksiyonMarket.name))).toBeNull());
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "reveal.hide" });
  });

  it("“Şimdi kontrol et”: checked minutes ago → said so, no allowance used; logged as check_now", async () => {
    show(locale);
    const featured = await screen.findByRole("region", { name: name("acePro2FlashPrint") });
    await userEvent.click(within(featured).getByRole("button", { name: t("home.featured.checkNow") }));
    expect(await within(featured).findByText(t("home.featured.checkCached"))).toBeDefined();
    expect(controller.state.checkNowUsage.at(-1)).toMatchObject({ consumed: false });
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "check_now", outcome: "OK" });
  });

  it("new user: welcome, the search box, three steps and the general top drops", async () => {
    controller.config = { ...controller.config, scenario: "empty" };
    const { container } = show(locale);
    expect(await screen.findByRole("heading", { level: 1, name: t("home.welcome", { name: "Sena" }) })).toBeDefined();
    const steps = screen.getByRole("list", { name: t("home.steps.label") });
    expect(within(steps).getAllByRole("listitem").map((step) => step.textContent)).toEqual(
      (["add", "track", "gain"] as const).map((step, index) => `${index + 1}${t(`home.steps.${step}.title`)}${t(`home.steps.${step}.text`)}`),
    );
    const drops = screen.getByRole("region", { name: new RegExp(t("home.drops.title")) });
    expect(within(drops).getByText(t("home.drops.generalBadge"))).toBeDefined();
    // Nothing tracked yet: no note about the user's categories, no Hemen Gözat.
    expect(within(drops).queryByText(t("home.drops.note"))).toBeNull();
    expect(screen.queryByText(t("home.featured.label"))).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("no big drop in the user's categories → “Genel” and a one-line note; nothing qualifies → the section is hidden", async () => {
    controller.config = { ...controller.config, scenario: "drops-general" };
    show(locale);
    const drops = await screen.findByRole("region", { name: new RegExp(t("home.drops.title")) });
    expect(within(drops).getByText(t("home.drops.generalBadge"))).toBeDefined();
    expect(within(drops).getByRole("note").textContent).toContain(t("home.drops.note"));
    cleanup();
    controller.config = { ...controller.config, scenario: "drops-none" };
    show(locale);
    await screen.findByRole("region", { name: name("acePro2FlashPrint") });
    expect(screen.queryByRole("region", { name: new RegExp(t("home.drops.title")) })).toBeNull();
  });

  it("no deal: Hemen Gözat is the nearest return, no coral, “Şu an senin fiyatın en ucuz”", async () => {
    controller.config = { ...controller.config, scenario: "no-deal" };
    const { container } = show(locale);
    const featured = await screen.findByRole("region", { name: name("dysonV15") });
    expect(within(featured).getByText(t("home.featured.cheapestNow"))).toBeDefined();
    expect(container.querySelectorAll(".bg-accent")).toHaveLength(0);
    expect(within(featured).queryByRole("button", { name: t("searchAdd.confirm.reveal") })).toBeNull();
    // A return link on the left: the footer row stays, "Şimdi kontrol et" on its right.
    expect(within(featured).getByRole("button", { name: t("home.featured.checkNow") }).closest(".border-t")).not.toBeNull();
  });

  it("no deal and no return link: no idle footer row — “Şimdi kontrol et” sits under the check time", async () => {
    controller.config = { ...controller.config, scenario: "no-deal" };
    controller.state.trackedItems.forEach((row, index) => (controller.state.trackedItems[index] = { ...row, returnDeadline: null }));
    show(locale);
    const featured = await screen.findByRole("region", { name: name("dysonV15") });
    expect(within(featured).queryByText(t("home.featured.returnPage"))).toBeNull();
    expect(within(featured).getByRole("button", { name: t("home.featured.checkNow") }).closest(".border-t")).toBeNull();
  });

  it("stale: a warning that some stores did not answer; the stale card says its age and that its deal is not verified", async () => {
    controller.config = { ...controller.config, scenario: "stale" };
    show(locale);
    expect(await screen.findByText(t("home.states.sourcesMissing"))).toBeDefined();
    const coat = screen.getByRole("link", { name: new RegExp(name("winterCoat")) });
    expect(within(coat).getByText(t("home.cards.unverified"))).toBeDefined();
    expect(within(coat).getByText(new RegExp(t("trackedItems.row.staleAge", { ago: "" }).trim().replace(/^.*?·/, "·")))).toBeDefined();
  });

  it("error: what happened, what still works, “Tekrar dene”", async () => {
    controller.config = { ...controller.config, scenario: "error" };
    show(locale);
    // A server error is retried once (lib/api/provider.tsx) before the error state shows.
    expect(await screen.findByText(t("home.states.errorTitle"), undefined, { timeout: 4000 })).toBeDefined();
    expect(screen.getByText(t("home.states.errorText"))).toBeDefined();
    controller.config = { ...controller.config, scenario: "success" };
    await userEvent.click(screen.getByRole("button", { name: t("home.states.retry") }));
    expect(await screen.findByRole("region", { name: name("acePro2FlashPrint") })).toBeDefined();
  });

  it("loading: a skeleton in the same layout, with a label", async () => {
    controller.config = { ...controller.config, scenario: "loading" };
    show(locale);
    expect(await screen.findByRole("status", { name: t("home.states.loading") })).toBeDefined();
  });

  it("a guest is asked to sign in", async () => {
    controller.config = { ...controller.config, session: "guest" };
    show(locale);
    const signIn = await screen.findByRole("link", { name: t("home.states.signIn") });
    expect(signIn.getAttribute("href")).toBe(`/${locale}/${locale === "tr" ? "giris" : "sign-in"}?next=${encodeURIComponent(`/${locale}`)}`);
  });
});
