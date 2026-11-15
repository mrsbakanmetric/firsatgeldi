import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PriceHistory, type PriceHistoryProps } from "./index";
import { axeViolations } from "./test/axe";

const props: PriceHistoryProps = {
  title: "Fiyat · son 4 gün",
  range: "11 Kas – bugün",
  cheapest: [2_900_000, 2_800_000, 2_800_000, 2_600_000],
  min: 2_500_000,
  max: 3_000_000,
  grid: [
    { value: 3_000_000, label: "30.000" },
    { value: 2_750_000, label: "27.500" },
  ],
  dates: [
    { index: 0, label: "11 Kas" },
    { index: 3, label: "Bugün" },
  ],
  steps: [
    { index: 0, label: "29.000" },
    { index: 1, label: "28.000" },
    { index: 3, label: "26.000" },
  ],
  reference: { value: 2_950_000, kind: "paid", end: { name: "Ödediğin", value: "29.500 TL" } },
  cheapestEnd: { name: "En ucuz", value: "26.000 TL" },
  gap: "Fark 3.500 TL",
  legend: { reference: "Ödediğin", cheapest: "En ucuz satıcı", gap: "Kazanabileceğin" },
  tiles: [
    { label: "4 günün en yükseği", value: "29.000 TL" },
    { label: "4 günün en düşüğü", value: "26.000 TL · bugün", tone: "saving" },
  ],
  readout: (index, value) => `gün ${index} · ${value}`,
  label: "Son 4 günde en ucuz fiyat 29.000 TL iken şimdi 26.000 TL.",
};

describe("PriceHistory (Home Hemen Gözat chart, design v2)", () => {
  it("titled period, grid and date labels, step points (not the last day), gap fill + pill, legend, tiles; one sentence for assistive technology", async () => {
    const { container } = render(<PriceHistory {...props} />);
    expect(screen.getByRole("img", { name: props.label })).toBeDefined();
    expect(screen.getByText("Fiyat · son 4 gün")).toBeDefined();
    expect(screen.getAllByText("30.000")).toHaveLength(2);
    expect(screen.getByText("Bugün")).toBeDefined();
    // Steps on days 0 and 1 are hollow points; the last day has the large end point instead.
    expect(screen.getAllByTestId("step-point")).toHaveLength(2);
    expect(screen.getByTestId("price-gap")).toBeDefined();
    expect(screen.getByText("Fark 3.500 TL").className).toContain("bg-savings");
    expect(screen.getByText("Kazanabileceğin")).toBeDefined();
    expect(screen.getByText("26.000 TL · bugün").closest("div")?.className).toContain("bg-savings-subtle");
    expect(container.querySelector("[class*='h-(--size-chart-summary-height)']")).not.toBeNull();
    // Paid solid, cheapest dashed: different by pattern, not only by colour.
    expect(container.querySelector("polyline")?.getAttribute("stroke-dasharray")).toBeTruthy();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("no gap (cheapest not below the reference) → no fill, no pill, no gap legend; hover reads out the day", () => {
    render(<PriceHistory {...props} reference={{ value: 2_500_000, kind: "target", end: { name: "Hedefin", value: "25.000 TL" } }} gap={null} />);
    expect(screen.queryByTestId("price-gap")).toBeNull();
    expect(screen.queryByText("Kazanabileceğin")).toBeNull();
    const chart = screen.getByRole("img", { name: props.label });
    // jsdom has no layout: give the chart a width.
    vi.spyOn(chart, "getBoundingClientRect").mockReturnValue({ left: 0, width: 300, top: 0, height: 180, right: 300, bottom: 180, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(chart, { clientX: 0 });
    expect(screen.getByRole("status").textContent).toBe("gün 0 · 2900000");
  });
});
