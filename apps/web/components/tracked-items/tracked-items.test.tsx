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
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/tr/takip", useRouter: () => ({ push }) }));

const { server, controller } = createMockServer({ schedule: (task) => task(), seedTracking: true });
const { Providers } = await import("../providers");
const { TrackedItems } = await import("./tracked-items");
const { takeHandedFiles } = await import("../input-source/input-source");

function reseed() {
  controller.state.trackedItems.length = 0;
  controller.state.checkNowUsage.length = 0;
  controller.state.savingsRecords.length = 0;
  push.mockClear();
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

/** Cheaper sellers of every seeded product: never named on this page (own sellers are). */
const OWN_SELLERS = new Set(["kameraDunyasi", "teknosaMagaza", "kameraAtolyesi"]);
const HIDDEN_SELLERS = OFFERS.filter((offer) => !OWN_SELLERS.has(offer.seller)).map((offer) => SELLERS[offer.seller].name);

function show(locale: Locale) {
  return render(
    <Providers locale={locale}>
      <TrackedItems locale={locale} />
    </Providers>,
  );
}

/** One title link per row (the stretched row link); "Fırsatı gör" links to the same page but is its own action. */
const rowLinks = () =>
  screen.getAllByRole("link").filter((link) => /\/(takip|tracking)\/[0-9a-f-]{36}$/.test(link.getAttribute("href") ?? "") && !link.className.includes("z-(--z-index-raised)"));

describe.each(LOCALES)("Tracked Items — %s", (locale) => {
  const t = createTranslator(locale);
  const name = (key: keyof typeof PRODUCTS) => PRODUCTS[key].name[locale];

  it("v3: deal group first with the page's one coral badge; status per row; price block with numbers; stock in words; no explanation sentences", async () => {
    const { container } = show(locale);
    await screen.findByText(name("acePro2FlashPrint"));
    expect(screen.getByRole("heading", { level: 1, name: t("trackedItems.title") })).toBeDefined();
    expect(screen.getByText([t("trackedItems.trackingCount", { used: 5, limit: 10 }), t("trackedItems.checksLeft", { count: 3 })].join(t("common.listSeparator")))).toBeDefined();
    const summary = await screen.findByLabelText(t("trackedItems.summary.label"));
    expect(within(summary).getByText(t("trackedItems.summary.returnsSoon"))).toBeDefined();
    // "Ürün ekle" goes to Search and Add and comes back here.
    expect(screen.getByRole("link", { name: t("trackedItems.add") }).getAttribute("href")).toBe(`/${locale}/${locale === "tr" ? "ara" : "search"}?donus=takip`);
    // Filters (v3): Tümü · Fırsat var · Biten — no mode chips.
    const filters = screen.getByRole("group", { name: t("trackedItems.filters.label") });
    expect(within(filters).getAllByRole("button").map((chip) => chip.textContent?.replace(/\d+$/, ""))).toEqual([t("trackedItems.filters.all"), t("trackedItems.filters.deal"), t("trackedItems.filters.ended")]);
    // Deal group: first, one coral badge on the whole screen, rows on savings-subtle with the saving and "Fırsatı gör".
    const group = screen.getByRole("region", { name: new RegExp(t("trackedItems.row.flags.deal")) });
    expect(container.querySelectorAll(".bg-accent")).toHaveLength(1);
    expect(within(group).getAllByRole("listitem")).toHaveLength(2);
    expect(within(group).getByText(t("trackedItems.v3.canSave", { amount: locale === "tr" ? "3.002 TL" : "TL 3,002" }))).toBeDefined();
    const seeDeal = within(group).getAllByRole("link", { name: t("trackedItems.v3.seeDeal") });
    expect(seeDeal[0]?.getAttribute("href")).toMatch(new RegExp(`^/${locale}/(takip|tracking)/`));
    expect(seeDeal[0]?.closest("li")?.querySelector(".bg-savings-subtle")).not.toBeNull();
    // Five active rows, each one link; status badges instead of mode filters.
    expect(rowLinks()).toHaveLength(5);
    expect(screen.getAllByText(t("trackedItems.v3.status.BOUGHT"))).toHaveLength(4);
    expect(screen.getAllByText(t("trackedItems.v3.status.WANT"))).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /^Detay$|^Details$/ })).toBeNull();
    // Price block: current price and the change; chart labels; "Sen …" on the paid line.
    expect(screen.getByText(t("trackedItems.v3.change.down", { count: 14, amount: locale === "tr" ? "3.502 TL" : "TL 3,502", percent: 12 }))).toBeDefined();
    expect(screen.getAllByText(t("trackedItems.v3.chart.paid", { price: locale === "tr" ? "28.999 TL" : "TL 28,999" })).length).toBeGreaterThan(0);
    expect(screen.getAllByText(t("trackedItems.v3.chart.min", { price: locale === "tr" ? "25.997 TL" : "TL 25,997" })).length).toBeGreaterThan(0);
    // Stock in plain words.
    expect(screen.getByText(t("trackedItems.v3.stock.IN_STOCK", { count: 7 }))).toBeDefined();
    expect(screen.getByText(t("trackedItems.v3.stock.OUT_OF_STOCK", { count: 2 }))).toBeDefined();
    expect(screen.queryByRole("img", { name: /gündür|for at least/ })).toBeNull();
    // No explanation sentences any more — but the rule still holds: no cheaper seller's name, no "Göster".
    expect(document.body.textContent).not.toContain(t("trackedItems.footnote"));
    expect(document.body.textContent).not.toContain(t("trackedItems.legend"));
    for (const seller of HIDDEN_SELLERS) expect(document.body.textContent).not.toContain(seller);
    expect(screen.queryByRole("button", { name: t("searchAdd.confirm.reveal") })).toBeNull();
    // Ended rows collapsed.
    const endedToggle = screen.getByRole("button", { name: t("trackedItems.ended.title", { count: 1 }) });
    expect(endedToggle.getAttribute("aria-expanded")).toBe("false");
    await userEvent.click(endedToggle);
    expect(screen.getByText(name("wh1000xm5"))).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("⋯ → “Takibi bitir” (bought): how it ended + new price → saving to My Savings; the row moves to ended; “Geri al” brings it back", async () => {
    show(locale);
    await screen.findByText(name("dysonV15"));
    const row = screen.getByRole("link", { name: name("dysonV15") }).closest("li") as HTMLElement;
    const more = within(row).getByRole("button", { name: t("trackedItems.v3.more") });
    // The menu button is not inside the row link: pressing it never opens the row.
    expect(more.closest("a")).toBeNull();
    await userEvent.click(more);
    await userEvent.click(screen.getByRole("menuitem", { name: t("trackedItems.v3.end") }));
    const dialog = screen.getByRole("dialog", { name: t("trackedItems.v3.endTitle") });
    const confirm = within(dialog).getByRole("button", { name: t("trackedItems.v3.end") });
    expect(confirm.hasAttribute("disabled")).toBe(true);
    await userEvent.click(within(dialog).getByRole("button", { name: t("trackedItems.v3.endOptions.RETURN_REBUY") }));
    await userEvent.type(within(dialog).getByLabelText(t("trackedItems.v3.newPrice")), locale === "tr" ? "29.999" : "29,999");
    await userEvent.click(confirm);
    expect(await screen.findByText(new RegExp(t("trackedItems.v3.endedSaving", { amount: locale === "tr" ? "1.000 TL" : "TL 1,000" })))).toBeDefined();
    expect(controller.state.savingsRecords.at(-1)).toMatchObject({ method: "RETURN_REBUY", savingMinor: 100_000 });
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "tracking.end", outcome: "OK" });
    await waitFor(() => expect(screen.getByRole("button", { name: t("trackedItems.ended.title", { count: 2 }) })).toBeDefined());

    await userEvent.click(screen.getAllByRole("button", { name: t("trackedItems.v3.restore") })[0] as HTMLElement);
    expect(await screen.findByText(t("trackedItems.v3.restored", { name: name("dysonV15") }))).toBeDefined();
    expect(controller.state.savingsRecords.at(-1)?.voidedAt).not.toBeNull();
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "tracking.restore", outcome: "OK" });
  });

  it("⋯ → “Takibi bitir” (want to buy): one confirm, no questions", async () => {
    show(locale);
    await screen.findByText(name("airPodsPro2"));
    const row = screen.getByRole("link", { name: name("airPodsPro2") }).closest("li") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: t("trackedItems.v3.more") }));
    await userEvent.click(screen.getByRole("menuitem", { name: t("trackedItems.v3.end") }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: t("trackedItems.v3.endOptions.RETURN_REBUY") })).toBeNull();
    expect(within(dialog).getByText(t("trackedItems.v3.wantEndText", { name: name("airPodsPro2") }))).toBeDefined();
    await userEvent.click(within(dialog).getByRole("button", { name: t("trackedItems.v3.end") }));
    expect(await screen.findByText(t("trackedItems.v3.ended", { name: name("airPodsPro2") }))).toBeDefined();
  });

  it("the shared SearchBox: a pasted link and a photo go to Search and Add with that input", async () => {
    const { container } = show(locale);
    await screen.findByText(name("acePro2FlashPrint"));
    const box = screen.getByRole("textbox", { name: t("trackedItems.search.label") });
    await userEvent.type(box, "https://www.trendyol.com/bir-urun-p-1{Enter}");
    expect(push).toHaveBeenCalledWith(expect.stringContaining(`donus=takip&q=${encodeURIComponent("https://www.trendyol.com/bir-urun-p-1")}`));
    await waitFor(() => expect(container.querySelector('input[type="file"]')).not.toBeNull());
    const file = new File(["x"], "kutu.png", { type: "image/png" });
    await userEvent.upload(container.querySelector('input[type="file"]') as HTMLInputElement, file);
    expect(push).toHaveBeenLastCalledWith(`/${locale}/${locale === "tr" ? "ara" : "search"}?donus=takip`);
    expect(takeHandedFiles()).toEqual([file]);
  });

  it("filter chips, search (folded) and the Sırala menu: one click applies; Esc and a click outside close it", async () => {
    show(locale);
    await screen.findByText(name("acePro2FlashPrint"));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(t("trackedItems.filters.deal")) }));
    await waitFor(() => expect(rowLinks()).toHaveLength(2));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${t("trackedItems.filters.all")}`) }));
    await waitFor(() => expect(rowLinks()).toHaveLength(5));

    const sortChip = screen.getByRole("button", { name: new RegExp(t("trackedItems.sort.label")) });
    await userEvent.click(sortChip);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    await userEvent.click(sortChip);
    await userEvent.click(screen.getByRole("heading", { level: 1 }));
    expect(screen.queryByRole("listbox")).toBeNull();
    await userEvent.click(sortChip);
    await userEvent.click(screen.getByRole("option", { name: t("trackedItems.sort.deadline") }));
    // The deal group stays first; below it the nearest return date leads.
    await waitFor(() => expect(rowLinks()[2]?.textContent).toContain(name("dysonV15")));

    await userEvent.type(screen.getByRole("textbox", { name: t("trackedItems.search.label") }), "DYSON");
    await waitFor(() => expect(rowLinks()).toHaveLength(1));
    await userEvent.type(screen.getByRole("textbox", { name: t("trackedItems.search.label") }), "zzz");
    expect(await screen.findByText(t("trackedItems.states.searchEmpty"))).toBeDefined();
    // v3: nothing matches → "Ara ve Ekle'de ara" with the text.
    const searchAdd = screen.getByRole("link", { name: t("trackedItems.v3.searchAdd", { query: "DYSONzzz" }) });
    expect(searchAdd.getAttribute("href")).toContain(`q=DYSONzzz`);
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.states.clearFilters") }));
    await waitFor(() => expect(rowLinks()).toHaveLength(5));
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
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.bulk.action", { count: 5 }) }));
    expect(screen.getByText(t("trackedItems.bulk.short", { count: 3 }))).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.bulk.confirm", { count: 3 }) }));
    expect(await screen.findByText(t("trackedItems.bulk.finished"))).toBeDefined();
    expect(screen.getAllByText(t("trackedItems.bulk.itemDone"))).toHaveLength(3);
    // The fifth: no checks left today, stays on automatic checks.
    expect(screen.getByText(t("trackedItems.bulk.itemSkipped"))).toBeDefined();
    expect(screen.getByText(t("trackedItems.bulk.itemCached"))).toBeDefined();
    expect(controller.state.activity.slice(before).map((row) => row.action)).toContain("check_now_bulk");
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.bulk.close") }));
    await waitFor(() => expect((screen.getByRole("button", { name: t("trackedItems.bulk.action", { count: 5 }) }) as HTMLButtonElement).disabled).toBe(true));
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
