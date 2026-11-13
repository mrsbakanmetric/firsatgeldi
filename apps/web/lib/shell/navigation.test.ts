import { describe, expect, it } from "vitest";
import { ADMIN_NAV, APP_NAV, currentAppSection, isProfileMenuPage, switchLocalePath, TAB_BAR_IDS } from "./navigation";

describe("shell navigation", () => {
  it("keeps the decided main navigation order (Ana Sayfa · Takip · Ara ve Ekle · Keşfet · Kazancım)", () => {
    expect(APP_NAV.map((entry) => entry.route)).toEqual(["/", "/takip", "/ara", "/kesfet", "/kazancim"]);
    expect(TAB_BAR_IDS).toEqual(["home", "tracking", "search", "savings"]);
  });

  it("keeps the admin menu order (Genel bakış · Kullanıcılar · Ürünler · Kaynaklar · Suistimal · Sistem)", () => {
    expect(ADMIN_NAV.map((entry) => entry.id)).toEqual(["overview", "users", "products", "sources", "fraud", "system"]);
  });

  it.each([
    ["/tr", "tr", "home"],
    ["/tr/takip", "tr", "tracking"],
    ["/tr/takip/42", "tr", "tracking"],
    ["/en/tracking/42", "en", "tracking"],
    ["/en/search", "en", "search"],
    ["/en/savings", "en", "savings"],
    ["/tr/kesfet", "tr", "discover"],
    ["/tr/bildirimler", "tr", null],
    ["/tr/takipci", "tr", null],
  ] as const)("%s is in section %s", (pathname, locale, section) => {
    expect(currentAppSection(pathname, locale)).toBe(section);
  });

  it("marks the profile menu as current on its pages, in both languages", () => {
    expect(isProfileMenuPage("/tr/paketim", "tr")).toBe(true);
    expect(isProfileMenuPage("/en/settings/bildirimler", "en")).toBe(true);
    expect(isProfileMenuPage("/en/profile", "en")).toBe(true);
    expect(isProfileMenuPage("/tr/takip", "tr")).toBe(false);
  });

  it.each([
    ["/tr/takip/42", "tr", "en", "/en/tracking/42"],
    ["/en/tracking", "en", "tr", "/tr/takip"],
    ["/tr", "tr", "en", "/en"],
    ["/en/settings/bildirimler", "en", "tr", "/tr/ayarlar/bildirimler"],
    ["/tr/dev/shell", "tr", "en", "/en/dev/shell"],
  ] as const)("switches %s to %s→%s as %s", (pathname, from, to, expected) => {
    expect(switchLocalePath(pathname, from, to)).toBe(expected);
  });
});
