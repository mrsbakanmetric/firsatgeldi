import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Package } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { CategoryFilter, FilterChips, PriceSparkline, ProductImage, ProductRow, SearchBox, SortSelect, StatTile, StatTiles, StockKey, StockStrip } from "./index";
import { axeViolations } from "./test/axe";

describe("StatTiles (design v2 summary row)", () => {
  it("four small figures in one described list: caption label, price-size value, muted detail", async () => {
    const { container } = render(
      <StatTiles label="Özet">
        <StatTile label="Takipte" value="4 ürün" detail="3 aldım · 1 almak istiyorum" />
        <StatTile label="Açık fırsat" value="2 ürün" detail="en çok 3.302 TL" tone="saving" />
      </StatTiles>,
    );
    expect(screen.getByLabelText("Özet").tagName).toBe("DL");
    expect(screen.getByText("2 ürün").className).toContain("text-savings");
    expect(screen.getByText("4 ürün").className).toContain("text-price");
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("FilterChips", () => {
  it("grey chips with counts; the pressed one is marked by aria-pressed and a check, not colour alone", async () => {
    const onChange = vi.fn();
    render(
      <FilterChips
        label="Filtreler"
        options={[
          { id: "all", label: "Tümü", count: 5 },
          { id: "deal", label: "Fırsat var", count: 2 },
        ]}
        value="all"
        onChange={onChange}
      />,
    );
    const all = screen.getByRole("button", { name: /Tümü/ });
    expect(all.getAttribute("aria-pressed")).toBe("true");
    expect(all.querySelector("svg")).not.toBeNull();
    expect(all.className).toContain("h-(--component-chip-height)");
    expect(all.className).not.toContain("border-primary");
    await userEvent.click(screen.getByRole("button", { name: /Fırsat var/ }));
    expect(onChange).toHaveBeenCalledWith("deal");
  });
});

describe("SortSelect and CategoryFilter (chip + menu overlay)", () => {
  const sortOptions = [
    { id: "priority", label: "Öncelik" },
    { id: "saving", label: "Kazanç" },
  ] as const;

  it("the chip shows the choice; the menu overlays the page and one click applies", async () => {
    const onChange = vi.fn();
    const { container } = render(<SortSelect label="Sırala" options={sortOptions} value="priority" onChange={onChange} />);
    const chip = screen.getByRole("button", { name: /Sırala/ });
    expect(chip.textContent).toContain("Öncelik");
    await userEvent.click(chip);
    expect(container.querySelector("[role='listbox']")).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("option", { name: "Öncelik" }));
    expect(screen.queryByRole("button", { name: "Kapat" })).toBeNull();
    await userEvent.click(screen.getByRole("option", { name: "Kazanç" }));
    expect(onChange).toHaveBeenCalledWith("saving");
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("closes on Esc (focus back on the chip) and on a click outside, without a change", async () => {
    const onChange = vi.fn();
    render(
      <main>
        <p>dışarısı</p>
        <CategoryFilter
          label="Kategori"
          options={[
            { id: "", label: "Tümü" },
            { id: "c1", label: "Mont", count: 1 },
          ]}
          value=""
          onChange={onChange}
        />
      </main>,
    );
    const chip = screen.getByRole("button", { name: "Kategori" });
    await userEvent.click(chip);
    expect(screen.getByRole("option", { name: /Mont/ }).textContent).toContain("1");
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(chip);
    await userEvent.click(chip);
    await userEvent.click(screen.getByText("dışarısı"));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("a chosen category is written on the chip", () => {
    render(<CategoryFilter label="Kategori" options={[{ id: "", label: "Tümü" }, { id: "c1", label: "Mont", count: 1 }]} value="c1" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Kategori/ }).textContent).toContain("Mont");
  });
});

describe("PriceSparkline and StockStrip", () => {
  it("v3: paid solid ending in “Sen …”, cheapest dashed with min/max labels and the lowest point; target dotted; hover reads day and price", async () => {
    const labels = { min: "En düşük 280", max: "En yüksek 300", cheapest: "En ucuz", paid: "Sen 295" };
    const { container, rerender } = render(
      <PriceSparkline cheapest={[300, 290, null, 280]} paid={295} labels={labels} readout={(index, value) => `gün ${index} · ${value}`} label="Ödediğin 295, en ucuz 280" />,
    );
    const chart = screen.getByRole("img", { name: "Ödediğin 295, en ucuz 280" });
    expect(container.querySelector("line.stroke-chart-paid")?.getAttribute("stroke-dasharray")).toBeNull();
    expect(container.querySelector("polyline.stroke-chart-best")?.getAttribute("stroke-dasharray")).not.toBeNull();
    expect(screen.getByText("En düşük 280")).toBeDefined();
    expect(screen.getByText("En yüksek 300")).toBeDefined();
    expect(screen.getByTestId("lowest-point")).toBeDefined();
    expect(screen.getAllByText("Sen 295").length).toBeGreaterThan(0);
    expect(screen.getAllByText("En ucuz").length).toBeGreaterThan(0);
    chart.getBoundingClientRect = () => ({ left: 0, width: 300, top: 0, height: 64, right: 300, bottom: 64, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerMove(chart, { clientX: 0 });
    expect(screen.getByRole("status").textContent).toBe("gün 0 · 300");
    rerender(<PriceSparkline cheapest={[300, 280]} target={250} labels={{ min: "a", max: "b", cheapest: "En ucuz", target: "Hedef 250" }} readout={() => ""} label="Hedef 250, en ucuz 280" />);
    expect(container.querySelector("line.stroke-text")?.getAttribute("stroke-dasharray")).not.toBeNull();
    expect(container.querySelector("line.stroke-chart-paid")).toBeNull();
  });

  it("one box per day; low and out differ by border as well as fill; no data stays blank", () => {
    render(<StockStrip days={["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK", null]} label="Stokta · en az 1 gündür" />);
    const strip = screen.getByRole("img", { name: "Stokta · en az 1 gündür" });
    const boxes = Array.from(strip.children);
    expect(boxes).toHaveLength(4);
    expect(boxes[1]?.className).toContain("border-stock-low-border");
    expect(boxes[2]?.className).toContain("border-dashed");
    expect(boxes[3]?.className).toContain("border-divider");
  });

  it("the key names the three states", () => {
    render(<StockKey labels={{ inStock: "Stokta", low: "Az stok", out: "Tükendi" }} />);
    expect(screen.getByText("Az stok")).toBeDefined();
    expect(screen.getByText("Tükendi")).toBeDefined();
  });
});

describe("ProductRow", () => {
  it("the whole row opens its link (no separate Detay button); actions sit above the link; ended rows are dimmed", async () => {
    const { container, rerender } = render(
      <ul>
        <li>
          <ProductRow
            href="/tr/takip/1"
            image={<ProductImage src={null} size="sm" fallbackIcon={Package} />}
            title="Dyson V15 Detect Absolute"
            line="Aldın 30.999 TL · Teknosa"
            columns={[{ key: "state", width: "1/5", content: <span>Senin fiyatın en ucuz</span> }]}
          />
        </li>
      </ul>,
    );
    const link = screen.getByRole("link", { name: /Dyson V15 Detect Absolute/ });
    expect(link.getAttribute("href")).toBe("/tr/takip/1");
    expect(screen.queryByRole("button")).toBeNull();
    expect(await axeViolations(container)).toEqual([]);
    // The title link is stretched over the row (::after covers it).
    expect(link.className).toContain("after:absolute");
    const onMore = vi.fn();
    rerender(<ProductRow href="/tr/takip/1" image={null} title="Biten" dimmed tone="deal" actions={<button type="button" onClick={onMore}>⋯</button>} />);
    const row = screen.getByRole("link", { name: /Biten/ }).closest("div") as HTMLElement;
    expect(row.className).toContain("border-savings");
    expect(row.querySelector("[class*='opacity-(--component-button-disabled-opacity)']")).not.toBeNull();
    const more = screen.getByRole("button", { name: "⋯" });
    expect(more.parentElement?.className).toContain("z-(--z-index-raised)");
    await userEvent.click(more);
    expect(onMore).toHaveBeenCalled();
  });
});

describe("SearchBox (canonical: one look everywhere, only the handler differs)", () => {
  const texts = { label: "Ara", submitLabel: "Ara", addPhotoLabel: "Fotoğraf ekle", clearLabel: "Aramayı temizle" };

  it("48 px box, camera icon, × only with text, compact “Ara”; Enter and “Ara” call the page's handler", async () => {
    const onSubmit = vi.fn();
    const onAddPhoto = vi.fn();
    const { rerender } = render(<SearchBox {...texts} value="" onValueChange={vi.fn()} onSubmit={onSubmit} onAddPhoto={onAddPhoto} />);
    expect(screen.getByLabelText("Ara", { selector: "input" }).closest("div.border")?.className).toContain("min-h-(--component-search-box-min-height)");
    expect(screen.queryByRole("button", { name: "Aramayı temizle" })).toBeNull();
    rerender(<SearchBox {...texts} value="dyson" onValueChange={vi.fn()} onSubmit={onSubmit} onAddPhoto={onAddPhoto} />);
    await userEvent.type(screen.getByLabelText("Ara", { selector: "input" }), "{Enter}");
    await userEvent.click(screen.getByRole("button", { name: "Ara" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
    await userEvent.click(screen.getByRole("button", { name: "Fotoğraf ekle" }));
    expect(onAddPhoto).toHaveBeenCalled();
  });

  it("the overlay closes on the camera, “Ara”, Esc and a press outside", async () => {
    const onOverlayClose = vi.fn();
    render(
      <main>
        <p>dışarısı</p>
        <SearchBox {...texts} value="ace" onValueChange={vi.fn()} onSubmit={vi.fn()} onAddPhoto={vi.fn()} overlay={<p>öneriler</p>} overlayOpen onOverlayClose={onOverlayClose} />
      </main>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Fotoğraf ekle" }));
    await userEvent.click(screen.getByRole("button", { name: "Ara" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByText("dışarısı"));
    expect(onOverlayClose.mock.calls.length).toBeGreaterThanOrEqual(4);
  });
});

describe("ProductRow card layout (Tracked Items v5)", () => {
  it("header with the title link stretched over the card, actions top-right above it, columns at full width, the footer last", () => {
    render(
      <ul>
        <li>
          <ProductRow
            layout="card"
            href="/tr/takip/1"
            image={<ProductImage src={null} size="card" fallbackIcon={Package} />}
            title="Insta360 X4"
            columns={[{ key: "prices", width: "fill", content: <table aria-label="Fiyatlar" /> }]}
            actions={<button type="button">⋯</button>}
            footer={<div>alt şerit</div>}
            tone="deal"
          />
        </li>
      </ul>,
    );
    const link = screen.getByRole("link", { name: "Insta360 X4" });
    const card = link.closest("div.h-full") as HTMLElement;
    expect(card.className).toContain("border-savings");
    expect(link.className).toContain("line-clamp-2");
    expect(screen.getByRole("button", { name: "⋯" }).parentElement?.className).toContain("z-(--z-index-raised)");
    expect(card.lastElementChild?.textContent).toBe("alt şerit");
    expect(card.querySelector("[class*='size-(--size-thumb-card)']")).not.toBeNull();
  });
});
