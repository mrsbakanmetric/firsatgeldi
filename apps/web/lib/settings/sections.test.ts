import { seedPermissions } from "@firsatgeldi/contracts";
import { describe, expect, it } from "vitest";
import { sectionBySlug, settingsHref, SETTINGS_SECTIONS, visibleSections } from "./sections";

describe("settings sections (design v2.1)", () => {
  it("each section has an address in each language; the first is Profil", () => {
    expect(settingsHref("tr")).toBe("/tr/ayarlar/profil");
    expect(settingsHref("en")).toBe("/en/settings/profile");
    expect(settingsHref("tr", "access")).toBe("/tr/ayarlar/eposta-ve-sifre");
    expect(settingsHref("en", "look")).toBe("/en/settings/language-and-theme");
  });

  it("a slug is read in its own language only", () => {
    for (const section of SETTINGS_SECTIONS) {
      expect(sectionBySlug("tr", section.slug.tr)).toBe(section.id);
      expect(sectionBySlug("en", section.slug.en)).toBe(section.id);
    }
    expect(sectionBySlug("en", "guvenlik")).toBeNull();
    expect(sectionBySlug("tr", "nope")).toBeNull();
  });

  it("users see eight sections; the Application Manager adds Yetkilerim and Yönetim etkinliğim and has no search history", () => {
    expect(visibleSections(seedPermissions("USER"), ["USER"]).map((section) => section.id)).toEqual(["profile", "access", "notifications", "security", "history", "look", "privacy", "data"]);
    expect(visibleSections(seedPermissions("APP_MANAGER"), ["APP_MANAGER"]).map((section) => section.id)).toEqual(["profile", "access", "notifications", "security", "permissions", "activity", "look", "privacy", "data"]);
    expect(visibleSections([])).toEqual([]);
  });

  it("the new sections have their own address in each language", () => {
    expect(settingsHref("tr", "notifications")).toBe("/tr/ayarlar/bildirimler");
    expect(settingsHref("en", "history")).toBe("/en/settings/search-history");
    expect(settingsHref("tr", "data")).toBe("/tr/ayarlar/verilerim");
    expect(settingsHref("tr", "activity")).toBe("/tr/ayarlar/yonetim-etkinligim");
    expect(settingsHref("en", "permissions")).toBe("/en/settings/permissions");
  });
});
