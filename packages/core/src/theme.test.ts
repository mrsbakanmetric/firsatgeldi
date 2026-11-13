import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_PREFERENCE, isThemePreference, parseThemePreference, resolveTheme, THEME_PREFERENCES } from "./theme";

describe("theme preference", () => {
  it("offers system, light and dark, with system as the default", () => {
    expect(THEME_PREFERENCES).toEqual(["system", "light", "dark"]);
    expect(DEFAULT_THEME_PREFERENCE).toBe("system");
  });

  it("accepts only known values", () => {
    for (const value of THEME_PREFERENCES) expect(isThemePreference(value)).toBe(true);
    for (const value of ["", "Dark", "sepia", null, undefined, 1]) expect(isThemePreference(value)).toBe(false);
  });

  it("falls back to the default for unknown stored values", () => {
    expect(parseThemePreference("dark")).toBe("dark");
    expect(parseThemePreference("sepia")).toBe("system");
    expect(parseThemePreference(null)).toBe("system");
  });

  it("resolves system to the system setting and keeps an explicit choice", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
