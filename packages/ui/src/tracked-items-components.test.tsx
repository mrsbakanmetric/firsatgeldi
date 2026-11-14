import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Package } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { CategoryFilter, FilterChips, PriceSparkline, ProductImage, ProductRow, SortSelect, StatTile, StatTiles, StockKey, StockStrip } from "./index";
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
  it("draws paid solid with the hollow purchase point, cheapest dashed, target dotted; states the values in words", () => {
    const { container, rerender } = render(<PriceSparkline cheapest={[300, 290, null, 280]} paid={295} paidIndex={1} label="Ödediğin 295, en ucuz 280" />);
    expect(screen.getByRole("img", { name: "Ödediğin 295, en ucuz 280" })).toBeDefined();
    const solid = container.querySelector("line.stroke-chart-paid");
    expect(solid?.getAttribute("stroke-dasharray")).toBeNull();
    // A day without data splits the cheapest line: one dashed segment + one single point.
    expect(container.querySelectorAll("polyline.stroke-chart-best")).toHaveLength(1);
    expect(container.querySelector("polyline")?.getAttribute("stroke-dasharray")).not.toBeNull();
    expect(container.querySelector("circle.fill-surface")).not.toBeNull();
    rerender(<PriceSparkline cheapest={[300, 280]} target={250} label="Hedef 250, en ucuz 280" />);
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
  it("the whole row is one link (no separate Detay button); ended rows are dimmed", async () => {
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
    rerender(<ProductRow href="/tr/takip/1" image={null} title="Biten" dimmed />);
    expect(screen.getByRole("link", { name: /Biten/ }).className).toContain("opacity-(--component-button-disabled-opacity)");
  });
});
