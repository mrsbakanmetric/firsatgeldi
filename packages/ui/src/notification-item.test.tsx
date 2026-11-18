import { render, screen } from "@testing-library/react";
import { Lock, Sparkles } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ModeBadge, NotificationItem, NotificationTile } from "./index";
import { axeViolations } from "./test/axe";

describe("Notification item (product_design_pattern.md §5.29)", () => {
  it("unread dot read aloud, type and time, title, message, mode badge and check time, actions; no axe violations", async () => {
    const { container } = render(
      <ul>
        <li>
          <NotificationItem
            unread
            unreadLabel="okunmadı"
            media={<NotificationTile icon={Lock} />}
            badge={{ icon: Sparkles, tone: "ink" }}
            type="Fırsat geldi"
            time={{ label: "14.32", iso: "2026-11-19T11:32:00Z" }}
            title={<a href="/tr/takip/1">Insta360 Ace Pro 2</a>}
            body="Bunu 28.999 TL'ye aldın."
            mode={<ModeBadge mode="BOUGHT" label="Aldım" />}
            meta="Fiyat 2 dk önce yeniden kontrol edildi"
            actions={<a href="/tr/takip/1">Fırsatı gör</a>}
          />
        </li>
      </ul>,
    );
    expect(screen.getByText("okunmadı").className).toContain("sr-only");
    expect(screen.getByText("14.32").getAttribute("dateTime")).toBe("2026-11-19T11:32:00Z");
    expect(screen.getByText("Aldım")).toBeDefined();
    expect(screen.getByRole("link", { name: "Fırsatı gör" })).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("a faded row (deal ended) and the dashed \"Takipte değil\" badge", () => {
    const { container } = render(
      <NotificationItem unread={false} unreadLabel="okunmadı" faded media={<span />} badge={{ icon: Sparkles, tone: "muted" }} type="Fırsat geldi" time={{ label: "12 Kas", iso: "2026-11-12T10:00:00Z" }} title="Mont" body="…" mode={<ModeBadge mode="NOT_TRACKED" label="Takipte değil" />} />,
    );
    expect(container.firstElementChild?.className).toContain("opacity-60");
    expect(screen.getByText("Takipte değil").className).toContain("border-dashed");
    expect(screen.queryByText("okunmadı")).toBeNull();
  });
});
