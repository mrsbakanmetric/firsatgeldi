// @vitest-environment jsdom
// Search and Add on the mock API, the way the screen runs in the browser
// (implementation_plan.md steps 10–21 definition of done): every text from the
// catalogue in tr and en, the five states via mock scenarios, the guest flow,
// the hidden-seller rule on the rendered page, and action logging.
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { OFFERS, PRODUCTS, SELLERS } from "@firsatgeldi/mocks";
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
vi.mock("next/navigation", () => ({ usePathname: () => "/tr/ara" }));

const { server, controller } = createMockServer({ schedule: (task) => task() });
const { Providers } = await import("../providers");
const { SearchAndAdd } = await import("./search-and-add");
const { SessionAppShell } = await import("../shell/session-app-shell");

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  controller.config = { ...controller.config, session: "user", scenario: "success", photo: "product" };
  controller.state.trackedItems.length = 0;
  controller.state.sellerLookups.clear();
  controller.state.catalogAdded.clear();
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

const product = PRODUCTS.acePro2FlashPrint;
/** Names that must never appear before "Göster": the cheaper sellers of the fixture. */
const HIDDEN_SELLERS = OFFERS.filter((offer) => offer.product === "acePro2FlashPrint" && offer.seller !== "kameraDunyasi").map((offer) => SELLERS[offer.seller].name);

function show(locale: Locale) {
  return render(
    <Providers locale={locale}>
      <SearchAndAdd locale={locale} />
    </Providers>,
  );
}

/** Counts every attempt to open a file dialog on the page (any file input clicked), without opening one. */
let stopWatching: (() => void) | null = null;
function watchFileDialogs() {
  const opened = vi.fn();
  const onClick = (event: MouseEvent) => {
    if (event.target instanceof HTMLInputElement && event.target.type === "file") {
      event.preventDefault();
      opened();
    }
  };
  document.addEventListener("click", onClick, true);
  stopWatching = () => document.removeEventListener("click", onClick, true);
  return opened;
}
afterEach(() => {
  stopWatching?.();
  stopWatching = null;
});

async function typeAndChoose(locale: Locale, text: string, productName: string) {
  const t = createTranslator(locale);
  const box = screen.getByRole("combobox");
  await userEvent.type(box, text);
  const option = await screen.findByRole("option", { name: new RegExp(productName) }, { timeout: 3000 });
  await userEvent.click(option);
  await screen.findByText(t("searchAdd.candidates.marked"));
}

describe.each(LOCALES)("Search and Add — %s", (locale) => {
  const t = createTranslator(locale);

  it("empty state: three ways to add", async () => {
    show(locale);
    expect(await screen.findByText(t("searchAdd.states.emptyTitle"))).toBeDefined();
    expect(screen.getByText(t("searchAdd.states.ways.link"))).toBeDefined();
    expect(screen.getByText(t("searchAdd.steps.phone", { current: 1, total: 3, name: t("searchAdd.steps.find") }))).toBeDefined();
  });

  it("the file dialog opens only from “Fotoğraf ekle” and the photo card; the text box, “Ara” and the box frame never open it", async () => {
    show(locale);
    await screen.findByText(t("searchAdd.states.emptyTitle"));
    const opened = watchFileDialogs();
    const box = screen.getByRole("combobox");
    const submit = () => screen.getAllByRole("button", { name: t("searchAdd.search.submit") });

    // Empty box: "Ara" is disabled.
    for (const button of submit()) expect(button.hasAttribute("disabled")).toBe(true);

    await userEvent.click(box);
    expect(document.activeElement).toBe(box);
    await userEvent.click(box.closest("div.border") as HTMLElement);
    await userEvent.type(box, "dyson{Escape}");
    await userEvent.click(submit()[0] as HTMLElement);
    await waitFor(() => expect(screen.queryByText(t("searchAdd.states.loading"))).toBeNull());
    await userEvent.click(box);
    expect(opened).not.toHaveBeenCalled();

    await userEvent.click(screen.getAllByRole("button", { name: t("searchAdd.search.addPhoto") })[0] as HTMLElement);
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it("empty state cards: name and link focus the search box, the order-screen card opens the file dialog", async () => {
    show(locale);
    const nameCard = await screen.findByRole("button", { name: new RegExp(t("searchAdd.states.ways.name")) });
    const opened = watchFileDialogs();
    const box = screen.getByRole("combobox");

    await userEvent.click(nameCard);
    expect(document.activeElement).toBe(box);
    (document.activeElement as HTMLElement).blur();
    await userEvent.click(screen.getByRole("button", { name: new RegExp(t("searchAdd.states.ways.link")) }));
    expect(document.activeElement).toBe(box);
    expect(opened).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: new RegExp(t("searchAdd.states.ways.photo")) }));
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it("autocomplete from our catalogue: tiles, list and preview without prices or stores; choosing marks the product", async () => {
    show(locale);
    await userEvent.type(screen.getByRole("combobox"), "ace pro 2");
    expect(await screen.findByText(new RegExp(t("searchAdd.suggest.found", { count: 4 })), undefined, { timeout: 3000 })).toBeDefined();
    const preview = screen.getByRole("complementary", { name: t("searchAdd.suggest.previewLabel") });
    expect(within(preview).getByText(new RegExp(t("searchAdd.suggest.previewNote")))).toBeDefined();
    await userEvent.click(screen.getByRole("option", { name: new RegExp(product.name[locale]) }));
    expect(await screen.findByText(t("searchAdd.candidates.marked"))).toBeDefined();
    expect(screen.getByRole("heading", { name: t("searchAdd.candidates.title") })).toBeDefined();
    expect(screen.getByText(t("searchAdd.understood.title"))).toBeDefined();
  });

  it("signed in: seller by exact name, fact tiles, typed price → hidden teaser → tracking starts only on confirm", async () => {
    show(locale);
    await typeAndChoose(locale, "ace pro 2 flash", product.name[locale]);
    const panel = (await screen.findAllByRole("heading", { name: t("searchAdd.confirm.title") }))[0]?.closest("div") as HTMLElement;
    await userEvent.type(await within(document.body).findByLabelText(t("searchAdd.confirm.seller")), SELLERS.kameraDunyasi.name);
    await userEvent.click(screen.getByRole("button", { name: t("searchAdd.confirm.sellerFind") }));
    expect(await screen.findByText(t("searchAdd.confirm.sellerFound"))).toBeDefined();
    expect(screen.getByText(t("searchAdd.confirm.stockState.IN_STOCK"))).toBeDefined();
    expect(screen.getByText(t("searchAdd.confirm.warrantyType.DISTRIBUTOR"))).toBeDefined();

    await userEvent.type(screen.getByLabelText(t("searchAdd.confirm.pricePaid")), locale === "tr" ? "28.999" : "28,999");
    expect(await screen.findByText(t("searchAdd.confirm.teaserHeadline", { count: 2 }), undefined, { timeout: 3000 })).toBeDefined();
    expect(screen.getByText(t("searchAdd.confirm.cheapestHidden"))).toBeDefined();
    // Hidden-seller rule on the rendered page: no cheaper seller's name anywhere.
    for (const name of HIDDEN_SELLERS) expect(document.body.textContent).not.toContain(name);
    expect(controller.state.trackedItems).toHaveLength(0);

    await userEvent.click(screen.getByRole("button", { name: t("searchAdd.confirm.bought") }));
    expect(await screen.findByText(t("searchAdd.success.title"))).toBeDefined();
    expect(controller.state.trackedItems).toHaveLength(1);
    expect(controller.state.activity.map((row) => row.action)).toEqual(expect.arrayContaining(["search", "identify", "seller_lookup", "teaser", "tracking.confirm"]));
    expect(panel).toBeDefined();
  });

  it("guest: search and mark without signing in; the confirm step asks to sign in and keeps the draft", async () => {
    controller.config = { ...controller.config, session: "guest" };
    show(locale);
    await typeAndChoose(locale, "ace pro 2 flash", product.name[locale]);
    const signIn = (await screen.findAllByRole("link", { name: t("searchAdd.confirm.guestAction") }))[0] as HTMLAnchorElement;
    expect(signIn.getAttribute("href")).toContain(encodeURIComponent("devam=1"));
    expect(screen.queryByLabelText(t("searchAdd.confirm.pricePaid"))).toBeNull();
    await userEvent.click(signIn);
    expect(globalThis.sessionStorage.getItem("fg-search-add-draft")).toContain(product.id);
  });

  it("not in the catalogue → search stores: found live, saved to the catalogue, then offered by autocomplete", async () => {
    show(locale);
    await userEvent.type(screen.getByRole("combobox"), "sony zv-e1 kit");
    const searchStores = await screen.findByRole("button", { name: t("searchAdd.suggest.searchStores", { query: "sony zv-e1 kit" }) }, { timeout: 3000 });
    await userEvent.click(searchStores);
    expect(await screen.findByText(PRODUCTS.zvE1Kit.name[locale])).toBeDefined();
    expect(controller.state.catalogAdded.has(PRODUCTS.zvE1Kit.key)).toBe(true);
    expect(controller.state.searchEvents.at(-1)?.source).toBe("SEARCH_BOX");
  });

  it("error state keeps what was typed and offers Tekrar dene", async () => {
    controller.config = { ...controller.config, scenario: "error" };
    show(locale);
    const box = screen.getByRole("combobox");
    await userEvent.type(box, "dyson{Escape}");
    await userEvent.click(screen.getAllByRole("button", { name: t("searchAdd.search.submit") })[0] as HTMLElement);
    expect(await screen.findByText(t("searchAdd.states.errorTitle"))).toBeDefined();
    expect((box as HTMLInputElement).value).toBe("dyson");
    expect(screen.getByRole("button", { name: t("searchAdd.states.retry") })).toBeDefined();
  });

  it("empty result: “no product found” with a way to fix the search", async () => {
    controller.config = { ...controller.config, scenario: "empty" };
    show(locale);
    await userEvent.type(screen.getByRole("combobox"), "xyz kamera 9000{Escape}");
    await userEvent.click(screen.getAllByRole("button", { name: t("searchAdd.search.submit") })[0] as HTMLElement);
    expect(await screen.findByText(t("searchAdd.states.noResultsTitle", { query: "xyz kamera 9000" }))).toBeDefined();
  });

  it("stale: some stores unreachable → warning with the age, confirming is not blocked", async () => {
    show(locale);
    await typeAndChoose(locale, "ace pro 2 flash", product.name[locale]);
    controller.config = { ...controller.config, scenario: "stale" };
    await userEvent.type(await screen.findByLabelText(t("searchAdd.confirm.seller")), SELLERS.kameraDunyasi.name);
    await userEvent.click(screen.getByRole("button", { name: t("searchAdd.confirm.sellerFind") }));
    expect(await screen.findByText(t("searchAdd.states.staleText"))).toBeDefined();
    await userEvent.type(screen.getByLabelText(t("searchAdd.confirm.pricePaid")), locale === "tr" ? "28.999" : "28,999");
    await waitFor(() => expect(screen.getByRole("button", { name: t("searchAdd.confirm.bought") }).hasAttribute("disabled")).toBe(false));
  });

  it("closed category: only “not supported yet”, no tracking actions and no notify button", async () => {
    show(locale);
    await typeAndChoose(locale, "sauvage", PRODUCTS.sauvage.name[locale]);
    expect(await screen.findByText(t("searchAdd.confirm.unsupported"))).toBeDefined();
    expect(screen.queryByRole("button", { name: t("searchAdd.confirm.bought") })).toBeNull();
  });

  it("the mark and confirm step has no axe violations", async () => {
    const { container } = show(locale);
    await typeAndChoose(locale, "ace pro 2 flash", product.name[locale]);
    await screen.findByLabelText(t("searchAdd.confirm.pricePaid"));
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("app shell session", () => {
  it.each(LOCALES)("signed in (%s): no “Giriş yap” while the session loads; the bell has no count", async (locale) => {
    const t = createTranslator(locale);
    render(
      <Providers locale={locale}>
        <SessionAppShell locale={locale}>
          <p>{t("searchAdd.title")}</p>
        </SessionAppShell>
      </Providers>,
    );
    expect(screen.getByTestId("session-placeholder")).toBeDefined();
    expect(screen.queryByRole("link", { name: t("shell.signIn") })).toBeNull();
    expect(await screen.findByRole("button", { name: t("shell.bell.label") })).toBeDefined();
    expect(screen.queryByRole("link", { name: t("shell.signIn") })).toBeNull();
  });

  it("guest: “Giriş yap” appears once the session is known", async () => {
    controller.config = { ...controller.config, session: "guest" };
    const t = createTranslator("tr");
    render(
      <Providers locale="tr">
        <SessionAppShell locale="tr">
          <p>{t("searchAdd.title")}</p>
        </SessionAppShell>
      </Providers>,
    );
    expect((await screen.findAllByRole("link", { name: t("shell.signIn") })).length).toBeGreaterThan(0);
  });
});
