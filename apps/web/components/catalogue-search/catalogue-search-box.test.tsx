// @vitest-environment jsdom
// CatalogueSearchBox is one behaviour on every page (pagedesign.md §5 [DECIDED 2026-11-15]):
// the same tests run on Search and Add and on Home, in tr and en — inline completion (Tab / →),
// ↑/↓ / Enter / Esc on the suggestion list, recent searches, and choosing a product. Only
// what a pick does differs: Search and Add marks it in place; Home hands over to Search and
// Add with the product marked.
import { createTranslator, LOCALES, type Locale } from "@firsatgeldi/i18n";
import { PRODUCTS, USERS } from "@firsatgeldi/mocks";
import { createMockServer } from "@firsatgeldi/mocks/node";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AnchorHTMLAttributes, ReactElement } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://mock.test");
vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "off");
vi.mock("next/link", () => ({
  default: ({ href, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props} />,
}));
const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: () => "/tr", useRouter: () => ({ push }) }));

const { server, controller } = createMockServer({ schedule: (task) => task() });
const { Providers } = await import("../providers");
const { SearchAndAdd } = await import("../search-add/search-and-add");
const { Home } = await import("../home/home");

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  push.mockClear();
  controller.config = { ...controller.config, session: "user", scenario: "success" };
  controller.state.trackedItems.length = 0;
  // Each test starts with the fixture's search history only.
  controller.state.searchEvents.length = 0;
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

const searchPath = (locale: Locale) => `/${locale}/${locale === "tr" ? "ara" : "search"}`;

interface PageCase {
  readonly name: string;
  readonly page: (locale: Locale) => ReactElement;
  /** What choosing `productKey` must lead to on this page. */
  readonly expectChosen: (locale: Locale, productKey: keyof typeof PRODUCTS) => Promise<void>;
}

const PAGES: readonly PageCase[] = [
  {
    name: "Search and Add",
    page: (locale) => <SearchAndAdd locale={locale} />,
    // Marked in place: the product is the selected candidate.
    expectChosen: async (locale, key) => {
      expect(await screen.findByRole("radio", { name: new RegExp(PRODUCTS[key].name[locale]), checked: true }, { timeout: 3000 })).toBeDefined();
      expect(push).not.toHaveBeenCalled();
    },
  },
  {
    name: "Home",
    page: (locale) => <Home locale={locale} />,
    // Handed over to Search and Add with the product marked.
    expectChosen: async (locale, key) => {
      await waitFor(() => expect(push).toHaveBeenCalledWith(`${searchPath(locale)}?urun=${PRODUCTS[key].id}`));
    },
  },
];

describe.each(PAGES.flatMap((page) => LOCALES.map((locale) => [page.name, locale, page] as const)))("CatalogueSearchBox on %s — %s", (_name, locale, page) => {
  const t = createTranslator(locale);

  function show() {
    return render(<Providers locale={locale}>{page.page(locale)}</Providers>);
  }

  it("inline completion: the first matching suggestion completes the text; Tab and → accept with the product's own spelling", async () => {
    show();
    const box = (await screen.findByRole("combobox", { name: t("searchAdd.search.label") })) as HTMLInputElement;
    await userEvent.type(box, "insta");
    await waitFor(() => expect(box.getAttribute("aria-autocomplete")).toBe("both"), { timeout: 3000 });
    await userEvent.keyboard("{Tab}");
    expect(box.value.startsWith("Insta360")).toBe(true);
    expect(document.activeElement).toBe(box);

    await userEvent.clear(box);
    await userEvent.type(box, "dys");
    await waitFor(() => expect(box.getAttribute("aria-autocomplete")).toBe("both"), { timeout: 3000 });
    await userEvent.keyboard("{ArrowRight}");
    expect(box.value).toBe(PRODUCTS.dysonV15.name[locale]);
  });

  it("↓/↑ move through the list (combobox semantics), Esc closes it, Enter chooses the active product", async () => {
    show();
    const box = await screen.findByRole("combobox", { name: t("searchAdd.search.label") });
    await userEvent.type(box, "ace pro 2");
    const list = await screen.findByRole("listbox", undefined, { timeout: 3000 });
    expect(box.getAttribute("aria-expanded")).toBe("true");
    const options = () => screen.getAllByRole("option");
    expect(options()[0]?.getAttribute("aria-selected")).toBe("true");
    await userEvent.keyboard("{ArrowDown}");
    expect(options()[1]?.getAttribute("aria-selected")).toBe("true");
    expect(box.getAttribute("aria-activedescendant")).toBe(options()[1]?.id);
    await userEvent.keyboard("{ArrowUp}");
    expect(options()[0]?.getAttribute("aria-selected")).toBe("true");
    expect(list).toBeDefined();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();

    await userEvent.type(box, " flash");
    // The list follows the text: wait until the only match is the active one.
    await waitFor(() => expect(screen.getAllByRole("option").map((option) => [option.textContent?.includes(PRODUCTS.acePro2FlashPrint.name[locale]), option.getAttribute("aria-selected")])).toEqual([[true, "true"]]), { timeout: 3000 });
    await userEvent.keyboard("{Enter}");
    await page.expectChosen(locale, "acePro2FlashPrint");
  });

  it("recent searches: an empty box offers them; one press puts the search back in the box", async () => {
    show();
    const box = (await screen.findByRole("combobox", { name: t("searchAdd.search.label") })) as HTMLInputElement;
    await userEvent.click(box);
    expect(await screen.findByText(t("searchAdd.suggest.recent"))).toBeDefined();
    const query = USERS.user.searchHistory[0]?.query[locale] ?? "";
    await userEvent.click(await screen.findByRole("button", { name: query }));
    expect(box.value).toBe(query);
  });

  it("choosing a product from the list (click)", async () => {
    show();
    const box = await screen.findByRole("combobox", { name: t("searchAdd.search.label") });
    await userEvent.type(box, "dyson");
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(PRODUCTS.dysonV15.name[locale]) }, { timeout: 3000 }));
    await page.expectChosen(locale, "dysonV15");
  });
});
