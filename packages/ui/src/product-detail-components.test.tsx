import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HiddenOfferCard, PriceHistory, StepTick, StockHistory } from "./index";
import { axeViolations } from "./test/axe";

describe("StepTick (product_design_pattern.md §5.11)", () => {
  it("“Yaptım” turns into “Yaptım ✓” (pressed), one tap undoes it; a later step carries its warning until done", async () => {
    const onToggle = vi.fn();
    const { container, rerender } = render(
      <ol>
        <StepTick number={2} title="Daha ucuz satıcıdan sipariş ver" done={false} current onToggle={onToggle} tickLabel="Yaptım" doneLabel="Yaptım ✓" warning="Önce iade talebini oluştur" />
      </ol>,
    );
    const tick = screen.getByRole("button", { name: "Yaptım" });
    expect(tick.getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByText("Önce iade talebini oluştur")).toBeDefined();
    await userEvent.click(tick);
    expect(onToggle).toHaveBeenCalledOnce();
    expect(await axeViolations(container)).toEqual([]);
    rerender(
      <ol>
        <StepTick number={2} title="Daha ucuz satıcıdan sipariş ver" done onToggle={onToggle} tickLabel="Yaptım" doneLabel="Yaptım ✓" warning="Önce iade talebini oluştur" />
      </ol>,
    );
    expect(screen.getByRole("button", { name: "Yaptım ✓" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.queryByText("Önce iade talebini oluştur")).toBeNull();
  });

  it("a step done elsewhere has no tick control", () => {
    render(
      <ol>
        <StepTick number={3} title="Takibi bitir" done={false} tickLabel="Yaptım" doneLabel="Yaptım ✓" />
      </ol>,
    );
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("StockHistory (full, product_design_pattern.md §5.7)", () => {
  it("blocks side by side, one row per seller with its state in words, the key incl. “Veri yok”, the change log", async () => {
    const { container } = render(
      <StockHistory
        title="Stok geçmişi"
        titleId="sk"
        conclusion="En ucuz satıcı şu an stokta · en az 7 gündür"
        keyLabels={{ inStock: "Stokta", low: "Az stok", out: "Tükendi", none: "Veri yok" }}
        blocks={[
          { title: "Son 14 gün", from: "1 Kas", to: "bugün", rows: [{ label: "En ucuz satıcı", days: [null, "IN_STOCK", "OUT_OF_STOCK", "IN_STOCK"], summary: "En ucuz satıcı: şu an stokta" }] },
          { title: "Son 1 ay", from: "16 Eki", to: "bugün", rows: [{ label: "Aldığın satıcı", days: ["IN_STOCK", "LOW_STOCK"], summary: "Aldığın satıcı: şu an az kaldı" }] },
        ]}
        changes={{ title: "Değişiklikler · en yeni önce", items: [{ when: "11 Kas", what: "En ucuz satıcı yeniden stokta" }] }}
      />,
    );
    const section = screen.getByRole("region", { name: "Stok geçmişi" });
    expect(within(section).getByRole("img", { name: "En ucuz satıcı: şu an stokta" })).toBeDefined();
    expect(within(section).getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual(["En ucuz satıcı", "Aldığın satıcı"]);
    expect(within(section).getByText("Veri yok")).toBeDefined();
    expect(within(section).getByText("En ucuz satıcı yeniden stokta")).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });
});

describe("PriceHistory on Product Detail", () => {
  it("the part before tracking is dimmed with a marker and a legend entry; four tiles", () => {
    render(
      <PriceHistory
        title="16 Eki – bugün"
        range={null}
        cheapest={[3000, 3000, 2900, 2800, 2700]}
        min={2600}
        max={3100}
        grid={[{ value: 3000, label: "30" }]}
        dates={[{ index: 0, label: "16 Eki" }]}
        steps={[]}
        reference={{ value: 2900, kind: "paid", end: { name: "Ödediğin", value: "29 TL" } }}
        cheapestEnd={{ name: "En ucuz", value: "27 TL" }}
        gap={null}
        legend={{ reference: "Ödediğin", cheapest: "En ucuz satıcı" }}
        tiles={[
          { label: "a", value: "1" },
          { label: "b", value: "2" },
          { label: "c", value: "3" },
          { label: "d", value: "4" },
        ]}
        readout={() => ""}
        label="Fiyat"
        trackingStart={{ index: 2, label: "1 Kas · Aldın", legend: "Takipten önce" }}
      />,
    );
    expect(screen.getByTestId("price-before")).toBeDefined();
    expect(screen.getByTestId("tracking-start")).toBeDefined();
    expect(screen.getByText("1 Kas · Aldın")).toBeDefined();
    expect(screen.getByText("Takipten önce")).toBeDefined();
    expect(screen.getAllByRole("term")).toHaveLength(4);
  });
});

describe("HiddenOfferCard, detail layout (Product Detail v2)", () => {
  it("actions on the top row; the caller's blocks follow; revealed → seller + platform, Mağazaya git, Gizle and a primary border", async () => {
    const onReveal = vi.fn();
    const { container, rerender } = render(
      <HiddenOfferCard layout="detail" hiddenLabel="En ucuz satıcı" price={<span>25.997 TL</span>} details="Stokta · Kargo 0 TL" revealLabel="Göster" onReveal={onReveal}>
        <p>Özet</p>
      </HiddenOfferCard>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Göster" }));
    expect(onReveal).toHaveBeenCalledOnce();
    expect(screen.getByText("Özet")).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
    rerender(
      <HiddenOfferCard
        layout="detail"
        hiddenLabel="En ucuz satıcı"
        price={<span>25.997 TL</span>}
        revealLabel="Göster"
        onReveal={onReveal}
        revealed={{ sellerName: "Satıcı A", rating: null, platformName: "Platform B", goLabel: "Mağazaya git", onGo: vi.fn(), hideLabel: "Gizle", onHide: vi.fn() }}
      />,
    );
    expect(screen.getByText("Satıcı A")).toBeDefined();
    expect(screen.getByText("Platform B")).toBeDefined();
    expect(screen.getByRole("button", { name: "Mağazaya git" })).toBeDefined();
    expect(screen.getByRole("article").className).toContain("border-primary");
  });
});
