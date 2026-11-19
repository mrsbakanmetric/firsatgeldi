// @vitest-environment jsdom
// Development-only link reading test page: a pasted link adds one row with what path 1 reads,
// in tr and en, every text from the catalogue; a link it cannot read says why; axe clean.
import { createTranslator, LOCALES } from "@firsatgeldi/i18n";
import { axeViolations } from "@firsatgeldi/ui/test";
import type { LinkIdentity } from "@firsatgeldi/sources/identify";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LinkReader } from "./link-reader";

const IPHONE = "https://www.trendyol.com/apple/iphone-18-pro-max-512gb-burgundy-p-1198082362?boutiqueId=691662&merchantId=968";

/** What /api/dev/identify answers for the iPhone link (the route itself runs the local model). */
const IPHONE_IDENTITY: LinkIdentity = {
  category: { key: "phone", name: { tr: "Cep telefonu", en: "Mobile phone" } },
  brand: { value: "Apple", source: "LINK" },
  model: { value: "iPhone 18 Pro Max", source: "LINK" },
  fields: [{ key: "storage", kind: "VARIANT", name: { tr: "Depolama", en: "Storage" }, value: "512 GB", source: "LINK" }],
  name: "Apple iPhone 18 Pro Max 512 GB",
  stockCode: null,
  dropped: [{ key: "colour", value: "black", reason: "VARIANT_NOT_IN_LINK" }],
  confidence: "HIGH",
  provider: "ollama",
  modelId: "qwen3:4b",
  durationMs: 11500,
  fromCache: false,
};

let answer: () => Promise<Response> = async () => Response.json({ identity: IPHONE_IDENTITY });
beforeEach(() => {
  answer = async () => Response.json({ identity: IPHONE_IDENTITY });
  vi.stubGlobal("fetch", vi.fn(() => answer()));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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
    await waitFor(() => expect(valueOf("devLink.columns.category")).toEqual([IPHONE_IDENTITY.category.name[locale]]));
    expect(valueOf("devLink.columns.generation")).toEqual(["iphone 18 pro max"]);
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
  it("starts over on each read: only the last link is shown", async () => {
    const t = createTranslator("tr");
    const user = userEvent.setup();
    render(<LinkReader locale="tr" />);
    for (const link of [IPHONE, "https://www.hepsiburada.com/apple-iphone-15-128-gb-siyah-p-HBCV00004X9ZCH"]) {
      await user.type(screen.getByLabelText(t("devLink.field")), link);
      await user.click(screen.getByRole("button", { name: t("devLink.read") }));
    }
    const rules = screen.getByRole("table", { name: t("devLink.tableLabel") });
    const storage = within(rules).getByRole("rowheader", { name: t("devLink.columns.storage") }).closest("tr");
    if (!storage) throw new Error("no storage row");
    expect(within(storage).getAllByRole("cell").map((cell) => cell.textContent)).toEqual([t("devLink.values.storage", { value: "128" })]);
    expect(screen.queryByText("1198082362")).toBeNull();
  });
});

describe("link reading test page — rows follow the link", () => {
  const t = createTranslator("tr");
  const rowNames = () =>
    within(screen.getByRole("table", { name: t("devLink.tableLabel") }))
      .getAllByRole("rowheader")
      .map((header) => header.textContent);

  async function readOne(link: string) {
    const user = userEvent.setup();
    render(<LinkReader locale="tr" />);
    await user.type(screen.getByLabelText(t("devLink.field")), link);
    await user.click(screen.getByRole("button", { name: t("devLink.read") }));
  }

  it("AirPods: no gender, storage, screen or colour rows — the link says nothing about them", async () => {
    await readOne("https://www.trendyol.com/apple/airpods-4-nesil-mxp63tu-a-p-857508954");
    expect(rowNames()).toEqual(
      ["result", "store", "productId", "brand", "category", "modelCode", "generation", "name", "link"].map((column) => t(`devLink.columns.${column}` as "devLink.columns.result")),
    );
  });

  it("a shoe link shows gender; a TV link shows the screen size", async () => {
    await readOne("https://www.trendyol.com/asics/gel-dedicate-8-kadin-tenis-ayakkabisi-1042a237-101-p-754059415");
    expect(rowNames()).toContain(t("devLink.columns.gender"));
    expect(rowNames()).not.toContain(t("devLink.columns.screen"));
    cleanup();
    await readOne("https://www.trendyol.com/tcl/75t8c-75-190-ekran-uydu-alicili-4k-ultra-hd-smart-qled-google-tv-p-940343537");
    expect(rowNames()).toContain(t("devLink.columns.screen"));
    expect(rowNames()).not.toContain(t("devLink.columns.gender"));
  });
});

describe.each(LOCALES)("link reading test page — AI layer (%s)", (locale) => {
  const t = createTranslator(locale);

  async function readIphone() {
    const user = userEvent.setup();
    render(<LinkReader locale={locale} />);
    await user.type(screen.getByLabelText(t("devLink.field")), IPHONE);
    await user.click(screen.getByRole("button", { name: t("devLink.read") }));
  }

  it("adds the model's rows with their source, what was dropped, and which model ran", async () => {
    await readIphone();
    const ai = await screen.findByRole("table", { name: t("devLink.ai.section") });
    const rowOf = (label: string) => within(ai).getByRole("rowheader", { name: label }).closest("tr")?.textContent ?? "";
    expect(rowOf(t("devLink.ai.name"))).toContain("Apple iPhone 18 Pro Max 512 GB");
    expect(rowOf(t("devLink.ai.model"))).toContain(t("devLink.ai.valueWithSource", { value: "iPhone 18 Pro Max", source: t("devLink.ai.sources.LINK") }));
    expect(rowOf(IPHONE_IDENTITY.fields[0]?.name[locale] ?? "")).toContain("512 GB");
    expect(rowOf(t("devLink.ai.dropped"))).toContain(t("devLink.ai.reasons.VARIANT_NOT_IN_LINK"));
    expect(rowOf(t("devLink.ai.runtime"))).toContain("qwen3:4b");
  });

  it("says when the local model is not running", async () => {
    answer = async () => Response.json({ error: "UNAVAILABLE" }, { status: 503 });
    await readIphone();
    expect(await screen.findByText(t("devLink.ai.UNAVAILABLE"))).toBeTruthy();
    expect(screen.queryByRole("table", { name: t("devLink.ai.section") })).toBeNull();
  });
});
