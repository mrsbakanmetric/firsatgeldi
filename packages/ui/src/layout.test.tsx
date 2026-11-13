import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { List } from "lucide-react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { EmptyState, PageTemplate, SegmentedChoice, SkeletonRow, StatusBanner, StepIndicator } from "./index";
import { axeViolations } from "./test/axe";

describe("PageTemplate", () => {
  it("renders the regions in the fixed order with one h1", () => {
    const { container } = render(
      <PageTemplate
        kind="list"
        title="Takip ettiklerim"
        caption="Takipte 3 ürün"
        actions={<button type="button">Ürün ekle</button>}
        summary={<p>özet</p>}
        toolbar={<p>araçlar</p>}
        side={<p>yan</p>}
        sideLabel="Senin için"
        footnote="dipnot"
      >
        <p>içerik</p>
      </PageTemplate>,
    );
    expect(screen.getAllByRole("heading", { level: 1 }).map((heading) => heading.textContent)).toEqual(["Takip ettiklerim"]);
    const order = ["Takip ettiklerim", "Ürün ekle", "özet", "araçlar", "içerik", "yan", "dipnot"];
    const text = container.textContent ?? "";
    const positions = order.map((part) => text.indexOf(part));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(screen.getByRole("complementary", { name: "Senin için" })).toBeDefined();
  });

  it("settings template places the section menu before the content", () => {
    const { container } = render(
      <PageTemplate kind="settings" title="Ayarlar" sectionMenu={<p>menü</p>}>
        <p>bölüm</p>
      </PageTemplate>,
    );
    const text = container.textContent ?? "";
    expect(text.indexOf("menü")).toBeLessThan(text.indexOf("bölüm"));
  });
});

describe("states", () => {
  it("error banner is an alert, stale/info banners are status; empty state offers one action", () => {
    render(
      <main>
        <StatusBanner tone="danger" title="Liste yüklenemedi">
          Tekrar dene
        </StatusBanner>
        <StatusBanner tone="warning">Son bilinen değerler</StatusBanner>
        <EmptyState icon={List} title="Henüz takip ettiğin ürün yok" description="Bir ürün ekle." action={<button type="button">Ürün ekle</button>} />
        <SkeletonRow />
      </main>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Liste yüklenemedi");
    expect(screen.getByRole("status").textContent).toContain("Son bilinen değerler");
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });
});

describe("StepIndicator and SegmentedChoice", () => {
  it("marks the current step and announces completed ones", () => {
    render(<StepIndicator label="Adımlar" steps={["Bul", "Hangisi seninki?", "Onayla"]} current={1} completedLabel="tamamlandı" />);
    const items = screen.getAllByRole("listitem");
    expect(items[1]?.getAttribute("aria-current")).toBe("step");
    expect(items[0]?.textContent).toContain("tamamlandı");
    expect(items[1]?.querySelector("span")?.className).toContain("size-(--size-step-indicator-dot)");
  });

  it("announces the selected option as pressed", async () => {
    function Harness() {
      const [value, setValue] = useState("shipped");
      return (
        <SegmentedChoice
          label="Sipariş durumu"
          value={value}
          onValueChange={setValue}
          variant="chips"
          options={[
            { value: "shipped", label: "Kargoda" },
            { value: "delivered", label: "Teslim aldım", count: 2 },
          ]}
        />
      );
    }
    render(
      <main>
        <Harness />
      </main>,
    );
    await userEvent.click(screen.getByRole("button", { name: /Teslim aldım/ }));
    expect(screen.getByRole("button", { name: /Teslim aldım/ }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Kargoda" }).getAttribute("aria-pressed")).toBe("false");
    expect(await axeViolations()).toEqual([]);
  });
});
