// @vitest-environment jsdom
// Tracked Items on the mock API (design "4 Takip Ettiklerim" v2; implementation_plan.md
// steps 10–21 definition of done): every text from the catalogue in tr and en, the
// states (empty, empty filter, bulk check, stale row, error, loading), chips and menus,
// the whole row as the link, "Biten takipler" collapsed, and the hidden-seller rule on
// the rendered page.
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { OFFERS, PRODUCTS, SELLERS, seedTrackedItems } from "@firsatgeldi/mocks";
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
vi.mock("next/navigation", () => ({ usePathname: () => "/tr/takip", useRouter: () => ({ push: vi.fn() }) }));

const { server, controller } = createMockServer({ schedule: (task) => task(), seedTracking: true });
const { Providers } = await import("../providers");
const { TrackedItems } = await import("./tracked-items");

function reseed() {
  controller.state.trackedItems.length = 0;
  controller.state.checkNowUsage.length = 0;
  controller.state.lastChecks.clear();
  seedTrackedItems(controller.state, new Date());
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => globalThis.history.replaceState(null, "", "/"));
afterEach(() => {
  cleanup();
  controller.config = { ...controller.config, session: "user", scenario: "success" };
  reseed();
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

/** Cheaper sellers of every seeded product: never named on this page. */
const HIDDEN_SELLERS = OFFERS.filter((offer) => offer.seller !== "kameraDunyasi" && offer.seller !== "teknosaMagaza").map((offer) => SELLERS[offer.seller].name);

function show(locale: Locale) {
  return render(
    <Providers locale={locale}>
      <TrackedItems locale={locale} />
    </Providers>,
  );
}

const rowLinks = () => screen.getAllByRole("link").filter((link) => /\/(takip|tracking)\/[0-9a-f-]{36}$/.test(link.getAttribute("href") ?? ""));

describe.each(LOCALES)("Tracked Items — %s", (locale) => {
  const t = createTranslator(locale);
  const name = (key: keyof typeof PRODUCTS) => PRODUCTS[key].name[locale];

  it("title, one meta line, four small figures, chips with counts; whole rows link to Product Detail; no Detay; ended collapsed", async () => {
    const { container } = show(locale);
    await screen.findByText(name("acePro2FlashPrint"));
    expect(screen.getByRole("heading", { level: 1, name: t("trackedItems.title") })).toBeDefined();
    expect(screen.getByText([t("trackedItems.trackingCount", { used: 4, limit: 10 }), t("trackedItems.checksLeft", { count: 3 })].join(t("common.listSeparator")))).toBeDefined();
    const summary = await screen.findByLabelText(t("trackedItems.summary.label"));
    expect(within(summary).getByText(t("trackedItems.summary.returnsSoon"))).toBeDefined();
    expect(within(summary).getAllByText(t("trackedItems.summary.products", { count: 2 })).length).toBeGreaterThan(0);
    // "Ürün ekle" goes to Search and Add and comes back here.
    expect(screen.getByRole("link", { name: t("trackedItems.add") }).getAttribute("href")).toBe(`/${locale}/${locale === "tr" ? "ara" : "search"}?donus=takip`);
    const filters = screen.getByRole("group", { name: t("trackedItems.filters.label") });
    expect(within(filters).getByRole("button", { name: new RegExp(t("trackedItems.filters.deal")) }).textContent).toContain("2");
    // Four active rows, each one link; the ended row is hidden until "Biten takipler" opens.
    expect(rowLinks()).toHaveLength(4);
    expect(rowLinks()[0]?.getAttribute("href")).toMatch(new RegExp(`^/${locale}/(takip|tracking)/`));
    expect(screen.queryByRole("button", { name: /^Detay$|^Details$/ })).toBeNull();
    const endedToggle = screen.getByRole("button", { name: t("trackedItems.ended.title", { count: 1 }) });
    expect(endedToggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByText(name("wh1000xm5"))).toBeNull();
    await userEvent.click(endedToggle);
    expect(screen.getByText(name("wh1000xm5"))).toBeDefined();
    expect(screen.getByText(t("trackedItems.row.ended.saving", { amount: locale === "tr" ? "650 TL" : "TL 650" }))).toBeDefined();
    // Row contents: deal as counts only, the state of the stock in words, the want row's target.
    expect(screen.getByText(t("trackedItems.row.state.deal", { count: 2, amount: locale === "tr" ? "3.002 TL" : "TL 3,002" }))).toBeDefined();
    expect(screen.getByText(t("trackedItems.row.state.cheapestYours"))).toBeDefined();
    expect(screen.getByText(t("trackedItems.row.state.toTarget", { amount: locale === "tr" ? "650 TL" : "TL 650" }))).toBeDefined();
    expect(screen.getAllByRole("img", { name: t("trackedItems.row.stock.since", { state: t("trackedItems.row.stock.IN_STOCK"), count: 7 }) })).toHaveLength(1);
    for (const seller of HIDDEN_SELLERS) expect(document.body.textContent).not.toContain(seller);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("filter chips, search (folded) and the Sırala menu: one click applies; Esc and a click outside close it", async () => {
    show(locale);
    await screen.findByText(name("acePro2FlashPrint"));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(t("trackedItems.filters.deal")) }));
    await waitFor(() => expect(rowLinks()).toHaveLength(2));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${t("trackedItems.filters.all")}`) }));
    await waitFor(() => expect(rowLinks()).toHaveLength(4));

    const sortChip = screen.getByRole("button", { name: new RegExp(t("trackedItems.sort.label")) });
    await userEvent.click(sortChip);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    await userEvent.click(sortChip);
    await userEvent.click(screen.getByRole("heading", { level: 1 }));
    expect(screen.queryByRole("listbox")).toBeNull();
    await userEvent.click(sortChip);
    await userEvent.click(screen.getByRole("option", { name: t("trackedItems.sort.deadline") }));
    await waitFor(() => expect(rowLinks()[0]?.textContent).toContain(name("dysonV15")));

    await userEvent.type(screen.getByRole("textbox", { name: t("trackedItems.search.label") }), "DYSON");
    await waitFor(() => expect(rowLinks()).toHaveLength(1));
    await userEvent.type(screen.getByRole("textbox", { name: t("trackedItems.search.label") }), "zzz");
    expect(await screen.findByText(t("trackedItems.states.searchEmpty"))).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.states.clearFilters") }));
    await waitFor(() => expect(rowLinks()).toHaveLength(4));
  });

  it("empty filter: no deal → its own message and “Tümünü göster”", async () => {
    const keep = controller.state.trackedItems.filter((item) => item.productKey === "dysonV15");
    controller.state.trackedItems.splice(0, controller.state.trackedItems.length, ...keep);
    show(locale);
    await screen.findByText(name("dysonV15"));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(t("trackedItems.filters.deal")) }));
    expect(await screen.findByText(t("trackedItems.states.filterEmpty.deal"))).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.states.showAll") }));
    await waitFor(() => expect(rowLinks()).toHaveLength(1));
  });

  it("bulk check: allowance short → says how many first; then progress per item; at zero the button is disabled with the reason", async () => {
    show(locale);
    await screen.findByText(name("acePro2FlashPrint"));
    const before = controller.state.activity.length;
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.bulk.action", { count: 4 }) }));
    expect(screen.getByText(t("trackedItems.bulk.short", { count: 3 }))).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.bulk.confirm", { count: 3 }) }));
    expect(await screen.findByText(t("trackedItems.bulk.finished"))).toBeDefined();
    expect(screen.getAllByText(t("trackedItems.bulk.itemDone"))).toHaveLength(3);
    expect(screen.getByText(t("trackedItems.bulk.itemCached"))).toBeDefined();
    expect(controller.state.activity.slice(before).map((row) => row.action)).toContain("check_now_bulk");
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.bulk.close") }));
    await waitFor(() => expect((screen.getByRole("button", { name: t("trackedItems.bulk.action", { count: 4 }) }) as HTMLButtonElement).disabled).toBe(true));
    expect(screen.getByText(t("trackedItems.bulk.none"))).toBeDefined();
  });

  it("empty: one sentence, one action to Search and Add, the tracking allowance; no zero figures", async () => {
    controller.config = { ...controller.config, scenario: "empty" };
    show(locale);
    expect(await screen.findByText(t("trackedItems.states.emptyTitle"))).toBeDefined();
    expect(screen.getByRole("link", { name: t("trackedItems.states.emptyAction") }).getAttribute("href")).toContain("donus=takip");
    expect(screen.getByText(t("trackedItems.states.emptyAllowance", { count: 10 }))).toBeDefined();
    expect(screen.queryByLabelText(t("trackedItems.summary.label"))).toBeNull();
    expect(screen.queryByRole("link", { name: t("trackedItems.add") })).toBeNull();
  });

  it("stale: the row says “Güncel değil”, the last known price and “doğrulanamadı”; a warning names the age", async () => {
    controller.config = { ...controller.config, scenario: "stale" };
    show(locale);
    expect(await screen.findByText(t("trackedItems.row.flags.stale"))).toBeDefined();
    expect(screen.getByText(t("trackedItems.row.state.unverified"))).toBeDefined();
    expect(screen.getByText(t("trackedItems.row.lastKnown", { price: locale === "tr" ? "2.999 TL" : "TL 2,999" }))).toBeDefined();
    expect(screen.getByText(t("trackedItems.states.stale", { count: 1, hours: 12 }))).toBeDefined();
  });

  it("error: what happened, what still works, “Tekrar dene”", async () => {
    controller.config = { ...controller.config, scenario: "error" };
    show(locale);
    // A server error is retried once (lib/api/provider.tsx) before the error state shows.
    expect(await screen.findByText(t("trackedItems.states.errorTitle"), undefined, { timeout: 4000 })).toBeDefined();
    controller.config = { ...controller.config, scenario: "success" };
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.states.retry") }));
    expect(await screen.findByText(name("acePro2FlashPrint"))).toBeDefined();
  });

  it("loading: skeleton rows with a label", async () => {
    controller.config = { ...controller.config, scenario: "loading" };
    show(locale);
    expect(await screen.findByRole("status", { name: t("trackedItems.states.loading") })).toBeDefined();
  });

  it("a guest is asked to sign in", async () => {
    controller.config = { ...controller.config, session: "guest" };
    show(locale);
    expect(await screen.findByText(t("trackedItems.states.signInTitle"))).toBeDefined();
  });

  it("back from Search and Add: names the item just added once, then drops the parameter", async () => {
    const added = controller.state.trackedItems.find((item) => item.productKey === "airPodsPro2");
    globalThis.history.replaceState(null, "", `/${locale}/takip?eklendi=${added?.id ?? ""}`);
    show(locale);
    expect(await screen.findByText(t("trackedItems.added", { name: name("airPodsPro2") }))).toBeDefined();
    expect(globalThis.location.search).toBe("");
  });
});
