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
    const row = within(table).getAllByRole("row")[1];
    if (!row) throw new Error("no row");
    for (const text of [t("devLink.values.ok"), "trendyol.com", "1198082362", "968", "apple", "iphone 18", "pro, max", "BURGUNDY", t("devLink.values.categoryLater")]) {
      expect(within(row).getByText(text)).toBeTruthy();
    }
    expect(within(row).getByText(t("devLink.values.storage", { value: "512" }))).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("says why a link cannot be read", async () => {
    await read("https://www.trendyol.com/");
    expect(screen.getByText(t("devLink.problems.NOT_A_PRODUCT_PAGE"))).toBeTruthy();
  });

  it("removes a row and clears the table", async () => {
    const user = await read(IPHONE);
    await user.click(screen.getByRole("button", { name: t("devLink.remove") }));
    expect(screen.queryByRole("table")).toBeNull();
    await user.type(screen.getByLabelText(t("devLink.field")), IPHONE);
    await user.click(screen.getByRole("button", { name: t("devLink.read") }));
    await user.click(screen.getByRole("button", { name: t("devLink.clear") }));
    expect(screen.getByText(t("devLink.emptyTitle"))).toBeTruthy();
  });
});
