// @vitest-environment jsdom
// Development-only link reading test page: a pasted link adds one row with what path 1 reads,
// in tr and en, every text from the catalogue; a link it cannot read says why; axe clean.
import { createTranslator, LOCALES } from "@firsatgeldi/i18n";
import { axeViolations } from "@firsatgeldi/ui/test";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { LinkReader } from "./link-reader";

const IPHONE = "https://www.trendyol.com/apple/iphone-18-pro-max-512gb-burgundy-p-1198082362?boutiqueId=691662&merchantId=968";

afterEach(cleanup);

describe.each(LOCALES)("link reading test page (%s)", (locale) => {
  const t = createTranslator(locale);

  async function read(link: string) {
    const user = userEvent.setup();
    render(<LinkReader locale={locale} />);
    await user.type(screen.getByLabelText(t("devLink.field")), link);
    await user.click(screen.getByRole("button", { name: t("devLink.read") }));
    return user;
  }

  it("starts empty and adds one row per link with what the link says", async () => {
    const user = userEvent.setup();
    const { container } = render(<LinkReader locale={locale} />);
    expect(screen.getByText(t("devLink.emptyTitle"))).toBeTruthy();
    await user.type(screen.getByLabelText(t("devLink.field")), IPHONE);
    await user.click(screen.getByRole("button", { name: t("devLink.read") }));

    const table = screen.getByRole("table", { name: t("devLink.tableLabel") });
    expect(within(table).getByRole("columnheader", { name: new RegExp(t("devLink.linkNumber", { number: 1 })) })).toBeTruthy();
    const valueOf = (column: Parameters<typeof t>[0]) => {
      const row = within(table).getByRole("rowheader", { name: t(column) }).closest("tr");
      if (!row) throw new Error(`no row for ${column}`);
      return within(row).getAllByRole("cell").map((cell) => cell.textContent);
    };
    expect(valueOf("devLink.columns.result")).toEqual([t("devLink.values.ok")]);
    expect(valueOf("devLink.columns.store")).toEqual(["trendyol.com"]);
    expect(valueOf("devLink.columns.productId")).toEqual(["1198082362"]);
    expect(valueOf("devLink.columns.sellerId")).toEqual(["968"]);
    expect(valueOf("devLink.columns.brand")).toEqual(["apple"]);
    expect(valueOf("devLink.columns.category")).toEqual([t("devLink.values.categoryLater")]);
    expect(valueOf("devLink.columns.generation")).toEqual(["iphone 18"]);
    expect(valueOf("devLink.columns.series")).toEqual(["pro, max"]);
    expect(valueOf("devLink.columns.storage")).toEqual([t("devLink.values.storage", { value: "512" })]);
    expect(valueOf("devLink.columns.colours")).toEqual(["BURGUNDY"]);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("says why a link cannot be read", async () => {
    await read("https://www.trendyol.com/");
    expect(screen.getByText(t("devLink.problems.NOT_A_PRODUCT_PAGE"))).toBeTruthy();
  });

  it("removes a row and clears the table", async () => {
    const user = await read(IPHONE);
    await user.click(screen.getByRole("button", { name: t("devLink.remove", { number: 1 }) }));
    expect(screen.queryByRole("table")).toBeNull();
    await user.type(screen.getByLabelText(t("devLink.field")), IPHONE);
    await user.click(screen.getByRole("button", { name: t("devLink.read") }));
    await user.click(screen.getByRole("button", { name: t("devLink.clear") }));
    expect(screen.getByText(t("devLink.emptyTitle"))).toBeTruthy();
  });
});

describe("link reading test page — several links", () => {
  it("puts each link in its own column, newest first", async () => {
    const t = createTranslator("tr");
    const user = userEvent.setup();
    render(<LinkReader locale="tr" />);
    for (const link of [IPHONE, "https://www.hepsiburada.com/apple-iphone-15-128-gb-siyah-p-HBCV00004X9ZCH"]) {
      await user.type(screen.getByLabelText(t("devLink.field")), link);
      await user.click(screen.getByRole("button", { name: t("devLink.read") }));
    }
    const storage = screen.getByRole("rowheader", { name: t("devLink.columns.storage") }).closest("tr");
    if (!storage) throw new Error("no storage row");
    expect(within(storage).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([t("devLink.values.storage", { value: "128" }), t("devLink.values.storage", { value: "512" })]);
  });
});
