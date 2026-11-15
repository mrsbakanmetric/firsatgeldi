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
  screen.getAllByRole("link").filter((link) => /\/(takip|tracking)\/[0-9a-f-]{36}$/.test(link.getAttribute("href") ?? "") && !link.closest('[class*="z-(--z-index-raised)"]'));

describe.each(LOCALES)("Tracked Items — %s", (locale) => {
  const t = createTranslator(locale);
  const name = (key: keyof typeof PRODUCTS) => PRODUCTS[key].name[locale];

  it("v5 card grid with the v4 content: deal group first (one coral badge); status icon on an 84 px image; price table by rank; summary line; footer strip", async () => {
    const { container } = show(locale);
    await screen.findByText(name("acePro2FlashPrint"));
    const tl = (tr: string, en: string) => (locale === "tr" ? tr : en);
    expect(screen.getByRole("heading", { level: 1, name: t("trackedItems.title") })).toBeDefined();
    expect(screen.getByText([t("trackedItems.trackingCount", { used: 6, limit: 10 }), t("trackedItems.checksLeft", { count: 3 })].join(t("common.listSeparator")))).toBeDefined();
    expect(screen.getByRole("link", { name: t("trackedItems.add") }).getAttribute("href")).toBe(`/${locale}/${locale === "tr" ? "ara" : "search"}?donus=takip`);
    const filters = screen.getByRole("group", { name: t("trackedItems.filters.label") });
    expect(within(filters).getAllByRole("button").map((chip) => chip.textContent?.replace(/\d+$/, ""))).toEqual([t("trackedItems.filters.all"), t("trackedItems.filters.deal"), t("trackedItems.filters.ended")]);

    // Deal group: bought rows with a cheaper offer and the want row whose target is reached; one coral badge.
    const group = screen.getByRole("region", { name: new RegExp(t("trackedItems.row.flags.deal")) });
    expect(container.querySelectorAll(".bg-accent")).toHaveLength(1);
    expect(within(group).getAllByRole("listitem")).toHaveLength(3);
    // Footer strip on savings-subtle: "En çok kazanç" + amount, "Fırsatı gör".
    expect(within(group).getAllByText(t("trackedItems.v5.maxGain"))).toHaveLength(2);
    const gain = within(group).getByText(tl("3.002 TL", "TL 3,002"));
    expect(gain.closest("div.bg-savings-subtle")).not.toBeNull();
    expect(within(group).getByText(t("trackedItems.v4.reached"))).toBeDefined();
    expect(within(group).getAllByRole("link", { name: t("trackedItems.v3.seeDeal") })).toHaveLength(3);
    expect(group.querySelector(".border-savings")).not.toBeNull();

    // Six active rows; status as an icon on the image (accessible name), no status text badge.
    expect(rowLinks()).toHaveLength(6);
    // v6: no ⋯ menu; every active card shows "Takibi bitir" as a visible button.
    expect(screen.queryByRole("button", { name: t("trackedItems.v3.more") })).toBeNull();
    expect(screen.getAllByRole("button", { name: t("trackedItems.v3.end") })).toHaveLength(6);
    expect(screen.getAllByRole("img", { name: t("trackedItems.v3.status.BOUGHT") })).toHaveLength(4);
    expect(screen.getAllByRole("img", { name: t("trackedItems.v3.status.WANT") })).toHaveLength(2);
    expect(container.querySelector("[class*='size-(--size-thumb-card)']")).not.toBeNull();
    // Two-column grid from breakpoint.md; cards fill their grid cell (one height per row).
    expect(group.querySelector("ul")?.className).toContain("md:grid-cols-2");

    // Price list of the coat: own row first, three cheaper by rank with a lock, "+2 satıcı daha", summary.
    const coat = screen.getByRole("link", { name: name("winterCoat") }).closest("li") as HTMLElement;
    const table = within(coat).getByRole("table");
    const rows = within(table).getAllByRole("row").map((row) => row.textContent ?? "");
    expect(rows[0]).toContain("LC Waikiki");
    expect(rows[0]).toContain(t("trackedItems.v4.bought"));
    expect(rows[1]).toContain(t("trackedItems.v4.rankFirst"));
    expect(rows[3]).toContain(t("trackedItems.v4.rank", { rank: 3 }));
    expect(within(coat).getAllByRole("img", { name: t("trackedItems.v4.hidden") })).toHaveLength(3);
    expect(within(coat).getByRole("link", { name: t("trackedItems.v4.more", { count: 2 }) })).toBeDefined();
    expect(within(coat).getAllByText(t("trackedItems.v4.stock.LOW_STOCK")).length).toBeGreaterThan(0);
    // Summary as one thin line under the table.
    expect(within(coat).getByText(t("trackedItems.v5.lowest", { count: 7, price: tl("2.999 TL", "TL 2,999") }))).toBeDefined();
    expect(within(coat).getByText(t("trackedItems.v5.highest", { count: 14, price: tl("3.399 TL", "TL 3,399") }))).toBeDefined();
    // Lower than paid: green with ↓ and a word for assistive technology.
    expect(within(table).getAllByText(t("trackedItems.v4.lower")).length).toBeGreaterThan(0);

    // Dyson: own seller now dearer than paid (red ↑), nothing cheaper.
    const dyson = screen.getByRole("link", { name: name("dysonV15") }).closest("li") as HTMLElement;
    expect(within(dyson).getByText(t("trackedItems.v4.ownNow"))).toBeDefined();
    expect(within(dyson).getByText(tl("31.299 TL", "TL 31,299")).closest("span")?.className).toContain("text-danger");
    expect(within(dyson).getByText(t("trackedItems.v4.noCheaper"))).toBeDefined();
    // AirPods: target not reached.
    expect(screen.getByText(t("trackedItems.v5.toTarget", { amount: tl("650 TL", "TL 650") }))).toBeDefined();
    expect(screen.getByText(t("trackedItems.v5.notifyHint"))).toBeDefined();
    // X4: own listing sold out.
    const x4 = screen.getByRole("link", { name: name("x4") }).closest("li") as HTMLElement;
    expect(within(x4).getByText(t("trackedItems.v4.stock.OUT_OF_STOCK"))).toBeDefined();

    // No chart, no explanation sentences — and never a cheaper seller's name or "Göster".
    expect(container.querySelector("svg polyline")).toBeNull();
    for (const seller of HIDDEN_SELLERS) expect(document.body.textContent).not.toContain(seller);
    expect(screen.queryByRole("button", { name: t("searchAdd.confirm.reveal") })).toBeNull();
    const endedToggle = screen.getByRole("button", { name: t("trackedItems.ended.title", { count: 1 }) });
    expect(endedToggle.getAttribute("aria-expanded")).toBe("false");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("“Aldım, kaydet” on a want-to-buy row opens Search and Add for that item; the search box completes from the list", async () => {
    show(locale);
    await screen.findByText(name("airPodsPro2"));
    const row = screen.getByRole("link", { name: name("airPodsPro2") }).closest("li") as HTMLElement;
    // v6: visible buttons in the card footer, no ⋯ menu.
    expect(within(row).queryByRole("button", { name: t("trackedItems.v3.more") })).toBeNull();
    const item = within(row).getByRole("link", { name: t("trackedItems.v4.markBought") });
    const tracked = controller.state.trackedItems.find((entry) => entry.productKey === "airPodsPro2");
    expect(item.getAttribute("href")).toBe(`/${locale}/${locale === "tr" ? "ara" : "search"}?urun=${PRODUCTS.airPodsPro2.id}&takip=${tracked?.id ?? ""}&mod=aldim`);

    const box = screen.getByRole("textbox", { name: t("trackedItems.search.label") }) as HTMLInputElement;
    await userEvent.type(box, "dys");
    await waitFor(() => expect(box.getAttribute("aria-autocomplete")).toBe("both"));
    await userEvent.keyboard("{Tab}");
    expect(box.value).toBe(name("dysonV15"));
  });

  it("“Takibi bitir” in the card footer (bought): how it ended + new price → saving to My Savings; the row moves to ended; “Geri al” brings it back", async () => {
    show(locale);
    await screen.findByText(name("dysonV15"));
    const row = screen.getByRole("link", { name: name("dysonV15") }).closest("li") as HTMLElement;
    const end = within(row).getByRole("button", { name: t("trackedItems.v3.end") });
    // The button is not inside the row link: pressing it never opens the row.
    expect(end.closest("a")).toBeNull();
    await userEvent.click(end);
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

  it("“Takibi bitir” in the card footer (want to buy): one confirm, no questions", async () => {
    show(locale);
    await screen.findByText(name("airPodsPro2"));
    const row = screen.getByRole("link", { name: name("airPodsPro2") }).closest("li") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: t("trackedItems.v3.end") }));
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
    await waitFor(() => expect(rowLinks()).toHaveLength(3));
    await userEvent.click(screen.getByRole("button", { name: new RegExp(`^${t("trackedItems.filters.all")}`) }));
    await waitFor(() => expect(rowLinks()).toHaveLength(6));

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
    await waitFor(() => expect(rowLinks()[3]?.textContent).toContain(name("dysonV15")));

    await userEvent.type(screen.getByRole("textbox", { name: t("trackedItems.search.label") }), "DYSON");
    await waitFor(() => expect(rowLinks()).toHaveLength(1));
    await userEvent.type(screen.getByRole("textbox", { name: t("trackedItems.search.label") }), "zzz");
    expect(await screen.findByText(t("trackedItems.states.searchEmpty"))).toBeDefined();
    // v3: nothing matches → "Ara ve Ekle'de ara" with the text.
    const searchAdd = screen.getByRole("link", { name: t("trackedItems.v3.searchAdd", { query: "DYSONzzz" }) });
    expect(searchAdd.getAttribute("href")).toContain(`q=DYSONzzz`);
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.states.clearFilters") }));
    await waitFor(() => expect(rowLinks()).toHaveLength(6));
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
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.bulk.action", { count: 6 }) }));
    expect(screen.getByText(t("trackedItems.bulk.short", { count: 3 }))).toBeDefined();
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.bulk.confirm", { count: 3 }) }));
    expect(await screen.findByText(t("trackedItems.bulk.finished"))).toBeDefined();
    expect(screen.getAllByText(t("trackedItems.bulk.itemDone"))).toHaveLength(3);
    // The other two: no checks left today, they stay on automatic checks.
    expect(screen.getAllByText(t("trackedItems.bulk.itemSkipped"))).toHaveLength(2);
    expect(screen.getByText(t("trackedItems.bulk.itemCached"))).toBeDefined();
    expect(controller.state.activity.slice(before).map((row) => row.action)).toContain("check_now_bulk");
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.bulk.close") }));
    await waitFor(() => expect((screen.getByRole("button", { name: t("trackedItems.bulk.action", { count: 6 }) }) as HTMLButtonElement).disabled).toBe(true));
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
    expect(screen.getByText(t("trackedItems.row.staleAge", { ago: t("time.hoursAgo", { count: 12 }) }))).toBeDefined();
    // The coat's market prices are the last known ones, and its stock shows its age (v4 price list).
    const coat = screen.getByRole("link", { name: PRODUCTS.winterCoat.name[locale] }).closest("li") as HTMLElement;
    expect(within(coat).getByText(t("trackedItems.row.lastKnown", { price: locale === "tr" ? "2.999 TL" : "TL 2,999" }))).toBeDefined();
    expect(within(coat).getAllByText(t("trackedItems.row.staleStock", { count: 12 }))).toHaveLength(3);
    // Fresh rows say neither.
    const ace = screen.getByRole("link", { name: PRODUCTS.acePro2FlashPrint.name[locale] }).closest("li") as HTMLElement;
    expect(within(ace).queryByText(new RegExp(t("trackedItems.row.lastKnown", { price: "" }).trim()))).toBeNull();
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
