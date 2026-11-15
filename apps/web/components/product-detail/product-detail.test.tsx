// @vitest-environment jsdom
// Product Detail, bought mode, on the mock API (design "2 Ürün Detayı v2"; implementation_plan.md
// step 11, PR 2): every text from the catalogue in tr and en; the header card with visible actions
// (no ⋯) and the page's one coral element; the shared price chart with ranges, the dimmed part before
// tracking, four tiles and the buy-or-wait hint; steps with "Yaptım ✓" and request tracking; the
// price-difference message; offers by rank until Göster, store ratings on the store's scale after it;
// the own seller row; stock history; reports; ending and "Geri al"; the five states; the hidden-seller
// rule on the rendered page; axe.
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
vi.mock("next/navigation", () => ({ usePathname: () => "/tr/takip/x", useRouter: () => ({ push: vi.fn() }) }));

const { server, controller } = createMockServer({ schedule: (task) => task(), seedTracking: true });
const { Providers } = await import("../providers");
const { ProductDetail } = await import("./product-detail");

const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
Object.defineProperty(globalThis.navigator, "clipboard", { value: { writeText }, configurable: true });

function reseed() {
  controller.state.trackedItems.length = 0;
  controller.state.checkNowUsage.length = 0;
  controller.state.lastChecks.clear();
  controller.state.steps.clear();
  controller.state.requests.clear();
  seedTrackedItems(controller.state, new Date());
}

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  controller.config = { ...controller.config, session: "user", scenario: "success" };
  reseed();
  writeText.mockClear();
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

/** Cheaper sellers of every seeded product: never named before "Göster" (own sellers are). */
const OWN_SELLERS = new Set(["kameraDunyasi", "teknosaMagaza", "kameraAtolyesi"]);
const HIDDEN_SELLERS = OFFERS.filter((offer) => !OWN_SELLERS.has(offer.seller)).map((offer) => SELLERS[offer.seller].name);
const idOf = (key: keyof typeof PRODUCTS, mode: "BOUGHT" | "WANT" = "BOUGHT") => controller.state.trackedItems.find((item) => item.productKey === key && item.mode === mode)?.id ?? "";
const plain = (text: string | null | undefined) => (text ?? "").replace(/\s/g, " ");

function show(locale: Locale, id: string) {
  return render(
    <Providers locale={locale}>
      <ProductDetail locale={locale} id={id} />
    </Providers>,
  );
}

describe.each(LOCALES)("Product Detail (bought) — %s", (locale) => {
  const t = createTranslator(locale);
  const name = (key: keyof typeof PRODUCTS) => PRODUCTS[key].name[locale];
  const tl = (tr: string, en: string) => (locale === "tr" ? tr : en);

  it("header, chart, steps, message, offers by rank, own seller, stock — one coral element, no ⋯, no hidden seller", async () => {
    const { container } = show(locale, idOf("acePro2FlashPrint"));
    const header = await screen.findByRole("region", { name: name("acePro2FlashPrint") });
    expect(screen.getByRole("heading", { level: 1, name: name("acePro2FlashPrint") })).toBeDefined();
    expect(screen.getByRole("navigation", { name: t("productDetail.breadcrumb") })).toBeDefined();
    // "Fırsat geldi" is the page's one coral element (no "Fırsatı gör" on this page).
    expect(container.querySelectorAll(".bg-accent")).toHaveLength(1);
    expect(within(header).getByText(t("trackedItems.row.flags.deal")).closest("[class*='bg-accent']")).not.toBeNull();
    expect(within(header).getByText(tl("3.002 TL", "TL 3,002")).className).toContain("text-display");
    expect(within(header).getByText(t("productDetail.header.cheaperIn", { count: 2 }))).toBeDefined();
    expect(within(header).getByRole("link", { name: t("productDetail.header.seeSellers") }).getAttribute("href")).toBe("#saticilar");
    expect(within(header).getByRole("link", { name: t("productDetail.header.calendar") }).getAttribute("href")).toMatch(/\/api\/v1\/tracked-items\/[0-9a-f-]{36}\/calendar\.ics$/);
    // Seller-less rating line on the shared 5-point scale.
    await within(header).findByText(t("productDetail.header.ratingValue", { rating: tl("4,5", "4.5"), scale: 5 }));
    expect(plain(header.textContent)).toContain(plain(t("productDetail.header.ratingStores", { count: 4, ratings: tl("3.850", "3,850") })));
    expect(plain(header.textContent)).toContain(SELLERS.kameraDunyasi.name);
    // Visible actions, no ⋯ menu.
    for (const label of [t("trackedItems.v3.end"), t("productDetail.report.wrongPrice"), t("productDetail.report.differentProduct"), t("home.featured.checkNow")]) {
      expect(within(header).getByRole("button", { name: label })).toBeDefined();
    }
    expect(container.querySelector("[aria-haspopup='menu']")).toBeNull();

    // Price history: ranges with "1 ay" pressed, the dimmed part before tracking, four tiles, the hint.
    const history = screen.getByRole("region", { name: t("productDetail.history.title") });
    const ranges = within(history).getByRole("group", { name: t("productDetail.history.rangeLabel") });
    expect(within(ranges).getAllByRole("button")).toHaveLength(7);
    expect(within(ranges).getByRole("button", { name: t("productDetail.history.ranges.1m") }).getAttribute("aria-pressed")).toBe("true");
    await within(history).findByTestId("tracking-start");
    expect(within(history).getByTestId("price-before")).toBeDefined();
    expect(within(history).getByText(t("productDetail.history.before"))).toBeDefined();
    expect(within(history).getByText(t("productDetail.history.average", { count: 30 }))).toBeDefined();
    expect(within(history).getByText(t("trackedItems.v4.change", { count: 30 }))).toBeDefined();
    expect(within(history).getByText(t("productDetail.history.hintLowest", { count: 30 }))).toBeDefined();

    // Aside: steps (return → re-order with its warning → end) and the message.
    const steps = screen.getByRole("region", { name: t("productDetail.steps.title") });
    const items = within(steps).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(within(items[0] as HTMLElement).getByRole("link", { name: t("productDetail.steps.returnPage", { platform: "Hepsiburada" }) }).getAttribute("href")).toContain("hepsiburada.com");
    expect(within(items[1] as HTMLElement).getByText(t("productDetail.steps.returnFirst"))).toBeDefined();
    expect(within(items[2] as HTMLElement).queryByRole("button", { name: t("productDetail.steps.tick") })).toBeNull();
    const message = await screen.findByRole("region", { name: t("productDetail.message.title") });
    expect(plain(message.textContent)).toContain(tl("3.002 TL", "TL 3,002"));
    expect(within(message).getByText(t("productDetail.message.to", { name: SELLERS.kameraDunyasi.name }))).toBeDefined();

    // Offers by rank only, each with Göster; the own seller as the reference row.
    const offers = await screen.findByRole("region", { name: t("productDetail.offers.title", { count: 2 }) });
    const cards = within(offers).getAllByRole("article");
    expect(cards).toHaveLength(2);
    expect(within(cards[0] as HTMLElement).getByText(t("trackedItems.v4.rankFirst"))).toBeDefined();
    expect(within(offers).getAllByRole("button", { name: t("searchAdd.confirm.reveal") })).toHaveLength(2);
    expect(plain(offers.textContent)).toContain(plain(t("productDetail.offers.installments", { count: 6 })));
    expect(plain(offers.textContent)).toContain(t("productDetail.offers.own"));
    expect(plain(offers.textContent)).toContain(SELLERS.kameraDunyasi.name);

    // Stock history: the conclusion and both blocks.
    const stock = await screen.findByRole("region", { name: t("productDetail.stock.title") });
    expect(within(stock).getByText(t("productDetail.stock.last14"))).toBeDefined();
    expect(within(stock).getByText(t("productDetail.stock.lastMonth"))).toBeDefined();
    expect(within(stock).getAllByRole("rowheader").map((cell) => cell.textContent)).toContain(t("productDetail.stock.own"));

    for (const seller of HIDDEN_SELLERS) expect(document.body.textContent).not.toContain(seller);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("Göster opens the seller in place with store ratings on the store's own scale; Gizle hides it again", async () => {
    show(locale, idOf("acePro2FlashPrint"));
    const offers = await screen.findByRole("region", { name: t("productDetail.offers.title", { count: 2 }) });
    const [first] = within(offers).getAllByRole("button", { name: t("searchAdd.confirm.reveal") });
    await userEvent.click(first as HTMLElement);
    await within(offers).findByText(SELLERS.aksiyonMarket.name);
    expect(plain(offers.textContent)).toContain(plain(t("productDetail.offers.sellerRating", { rating: t("productDetail.offers.ratingValue", { rating: tl("9,4", "9.4"), scale: 10 }) })));
    expect(plain(offers.textContent)).toContain(t("productDetail.offers.ratingValue", { rating: tl("4,6", "4.6"), scale: 5 }));
    expect(within(offers).getByRole("link", { name: t("productDetail.offers.reviews") })).toBeDefined();
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "reveal", outcome: "OK" });
    // Only the revealed seller is named.
    expect(document.body.textContent).not.toContain(SELLERS.lensDeposu.name);
    await userEvent.click(within(offers).getByRole("button", { name: t("searchAdd.confirm.hide") }));
    await waitFor(() => expect(within(offers).queryByText(SELLERS.aksiyonMarket.name)).toBeNull());
  });

  it("6 months: the lowest is named by its rank on that day", async () => {
    show(locale, idOf("acePro2FlashPrint"));
    const history = await screen.findByRole("region", { name: t("productDetail.history.title") });
    await userEvent.click(within(history).getByRole("button", { name: t("productDetail.history.ranges.6m") }));
    const [before, after] = plain(t("productDetail.history.lowestThen", { price: tl("24.899 TL", "TL 24,899"), date: "@", rank: 2 })).split("@");
    const line = await within(history).findByText((_, element) => element?.tagName === "P" && plain(element.textContent).startsWith(before ?? "-"));
    expect(plain(line.textContent).endsWith(after ?? "-")).toBe(true);
  });

  it("steps tick and untick (“Yaptım ✓”); request tracking shows “Yanıt bekleniyor” and the answer; the message is copied", async () => {
    show(locale, idOf("acePro2FlashPrint"));
    const steps = await screen.findByRole("region", { name: t("productDetail.steps.title") });
    await userEvent.click(within(steps).getAllByRole("button", { name: t("productDetail.steps.tick") })[0] as HTMLElement);
    await within(steps).findByRole("button", { name: t("productDetail.steps.ticked") });
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "tracking.step", metadata: { step: "RETURN_REQUEST", done: true } });
    // Step 2's warning goes once step 1 is done.
    await waitFor(() => expect(within(steps).queryByText(t("productDetail.steps.returnFirst"))).toBeNull());

    await userEvent.click(within(steps).getByRole("button", { name: t("productDetail.request.priceDifference") }));
    await within(steps).findByText(t("productDetail.request.waiting", { count: 0 }));
    await userEvent.click(within(steps).getByRole("button", { name: t("productDetail.request.outcomeOption.GIVEN") }));
    await within(steps).findByText(t("productDetail.request.outcome.GIVEN"));
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "tracking.request", metadata: { kind: "PRICE_DIFFERENCE", outcome: "GIVEN" } });

    const message = screen.getByRole("region", { name: t("productDetail.message.title") });
    await userEvent.click(within(message).getByRole("button", { name: t("productDetail.message.copy") }));
    expect(plain(writeText.mock.calls[0]?.[0])).toContain(tl("3.002 TL", "TL 3,002"));
    expect(within(message).getByText(t("productDetail.message.copied"))).toBeDefined();
  });

  it("“Yanlış fiyat bildir”: the offer by rank, an optional note, sent and logged by rank", async () => {
    show(locale, idOf("acePro2FlashPrint"));
    const header = await screen.findByRole("region", { name: name("acePro2FlashPrint") });
    await screen.findByRole("region", { name: t("productDetail.offers.title", { count: 2 }) });
    await userEvent.click(within(header).getByRole("button", { name: t("productDetail.report.wrongPrice") }));
    const panel = screen.getByRole("dialog", { name: t("productDetail.report.wrongPrice") });
    await userEvent.type(within(panel).getByLabelText(t("productDetail.report.note")), "Sepette farklı");
    await userEvent.click(within(panel).getByRole("button", { name: t("productDetail.report.send") }));
    await within(panel).findByText(t("productDetail.report.sent"));
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "report.create", metadata: { kind: "WRONG_PRICE", rank: 1 } });
  });

  it("“Takibi bitir” → Vazgeçtim: the page says tracking ended; “Geri al” brings it back", async () => {
    show(locale, idOf("dysonV15"));
    const header = await screen.findByRole("region", { name: name("dysonV15") });
    await userEvent.click(within(header).getByRole("button", { name: t("trackedItems.v3.end") }));
    const dialog = screen.getByRole("dialog", { name: t("trackedItems.v3.endTitle") });
    await userEvent.click(within(dialog).getByRole("button", { name: t("trackedItems.v3.endOptions.NONE") }));
    await userEvent.click(within(dialog).getByRole("button", { name: t("trackedItems.v3.end") }));
    await screen.findByText(t("productDetail.end.ended"));
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "tracking.end", outcome: "OK" });
    await userEvent.click(screen.getByRole("button", { name: t("trackedItems.v3.restore") }));
    await waitFor(() => expect(screen.queryByText(t("productDetail.end.ended"))).toBeNull());
    expect(controller.state.activity.at(-1)).toMatchObject({ action: "tracking.restore", outcome: "OK" });
  });

  it("no cheaper seller (design States 2): “Şu an senin fiyatın en ucuz”, no offer list, no step 2, no message", async () => {
    show(locale, idOf("dysonV15"));
    const block = await screen.findByRole("region", { name: t("home.featured.cheapestNow") });
    expect(within(block).getByText(t("productDetail.offers.noCheaperNote"))).toBeDefined();
    expect(document.getElementById("saticilar")).toBeNull();
    const steps = screen.getByRole("region", { name: t("productDetail.steps.title") });
    expect(within(steps).queryByText(t("productDetail.steps.reorder"))).toBeNull();
    expect(screen.queryByRole("region", { name: t("productDetail.message.title") })).toBeNull();
  });

  it("stale: a warning that some stores did not answer", async () => {
    controller.config = { ...controller.config, scenario: "stale" };
    show(locale, idOf("acePro2FlashPrint"));
    await screen.findByText(t("productDetail.states.stale"));
  });

  it("error: what happened, what still works, “Tekrar dene”; an unknown item says so", async () => {
    controller.config = { ...controller.config, scenario: "error" };
    show(locale, idOf("acePro2FlashPrint"));
    await screen.findByText(t("productDetail.states.errorText"));
    expect(screen.getByRole("button", { name: t("home.states.retry") })).toBeDefined();
    cleanup();
    controller.config = { ...controller.config, scenario: "success" };
    show(locale, "00000000-0000-4000-8000-000000000000");
    await screen.findByText(t("productDetail.states.notFoundTitle"));
  });

  it("loading: a skeleton with a label; a guest is asked to sign in; want-to-buy waits for PR 3", async () => {
    controller.config = { ...controller.config, scenario: "loading" };
    show(locale, idOf("acePro2FlashPrint"));
    expect(await screen.findByRole("status", { name: t("productDetail.states.loading") })).toBeDefined();
    cleanup();
    controller.config = { ...controller.config, scenario: "success", session: "guest" };
    show(locale, idOf("acePro2FlashPrint"));
    await screen.findByText(t("home.states.signInTitle"));
    cleanup();
    controller.config = { ...controller.config, session: "user" };
    show(locale, idOf("airPodsPro2", "WANT"));
    await screen.findByText(t("productDetail.soonTitle"));
  });
});
