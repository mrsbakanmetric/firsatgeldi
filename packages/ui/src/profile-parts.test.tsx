import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PersonRow, ProfileHeader, SharedDealRow, tabPanelId, Tabs, ViewAsPreview, VisibilityCard } from "./index";
import { axeViolations } from "./test/axe";

describe("Profile parts (product_design_pattern.md §5.34, §5.39)", () => {
  it("ProfileHeader: h1, badge, privacy pill, counts, member since, actions; no axe violations", async () => {
    const { container } = render(
      <ProfileHeader
        avatar={{ initials: "SB" }}
        title="@sinan.b"
        badge="Fırsat Avcısı"
        privacy="Takipçilerime"
        counts={[
          { value: "3", label: "takipçi" },
          { value: "4", label: "takip" },
        ]}
        since="Ekim 2026'dan beri üye"
        actions={<button type="button">Profili düzenle</button>}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "@sinan.b" })).toBeDefined();
    expect(screen.getByText("Fırsat Avcısı")).toBeDefined();
    expect(screen.getByText("Takipçilerime")).toBeDefined();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(["3 takipçi", "4 takip"]);
    expect(screen.getByText("Ekim 2026'dan beri üye")).toBeDefined();
    expect(await axeViolations(container)).toEqual([]);
  });

  it("PersonRow: @username as plain text, one line, actions", () => {
    render(<PersonRow avatar={{ initials: "AD" }} username="ayse_d" meta="Fırsat Avcısı" actions={<button type="button">Takipten çıkar</button>} />);
    expect(screen.getByText("@ayse_d").tagName).toBe("SPAN");
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByRole("button", { name: "Takipten çıkar" })).toBeDefined();
  });

  it("Tabs: tablist, selected tab, arrows move, panels referenced; no axe violations", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <div>
        <Tabs
          label="Profil sekmeleri"
          idBase="me"
          value="fol"
          onChange={onChange}
          tabs={[
            { id: "fol", label: "Takipçilerim" },
            { id: "ing", label: "Takip ettiklerim" },
          ]}
        />
        <div role="tabpanel" id={tabPanelId("me", "fol")} aria-labelledby="me-tab-fol" />
        <div role="tabpanel" id={tabPanelId("me", "ing")} aria-labelledby="me-tab-ing" hidden />
      </div>,
    );
    const selected = screen.getByRole("tab", { name: "Takipçilerim" });
    expect(selected.getAttribute("aria-selected")).toBe("true");
    selected.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("ing");
    expect(await axeViolations(container)).toEqual([]);
  });

  it("SharedDealRow: name, category, price with its note, status pill", () => {
    render(<SharedDealRow image={<span />} name="JBL Charge 5" category="Hoparlör" price="4.650 TL" note="Paylaşıldı 20 dk önce" status={{ label: "İnceleniyor", tone: "wait" }} />);
    expect(screen.getByText("4.650 TL")).toBeDefined();
    expect(screen.getByText("İnceleniyor")).toBeDefined();
  });

  it("VisibilityCard and ViewAsPreview: audience rows, link, radio choice; no axe violations", async () => {
    const onChange = vi.fn();
    const { container } = render(
      <div>
        <VisibilityCard
          title="Neyi kim görüyor?"
          rows={[
            { label: "Profilim", audience: "Takipçilerime", shared: true },
            { label: "Aramalarım", audience: "Hiç paylaşılmaz", shared: false },
          ]}
          link={{ href: "/tr/ayarlar/gizlilik", label: "Ayarlar › Gizlilik" }}
        />
        <ViewAsPreview
          title="Başkaları nasıl görüyor?"
          value="me"
          onChange={onChange}
          note="Sen her şeyi görürsün"
          options={[
            { value: "me", label: "Ben" },
            { value: "follower", label: "Bir takipçi" },
          ]}
        />
      </div>,
    );
    expect(screen.getByText("Hiç paylaşılmaz")).toBeDefined();
    expect(screen.getByRole("link", { name: "Ayarlar › Gizlilik" }).getAttribute("href")).toBe("/tr/ayarlar/gizlilik");
    await userEvent.click(screen.getByRole("radio", { name: "Bir takipçi" }));
    expect(onChange).toHaveBeenCalledWith("follower");
    expect(await axeViolations(container)).toEqual([]);
  });
});
