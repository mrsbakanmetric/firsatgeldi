// The user's colour theme choice. Platform-neutral: web and the future mobile
// app offer the same three options (product_design_pattern.md: "each user
// chooses light / dark / system").

export const THEME_PREFERENCES = ["system", "light", "dark"] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Themes that can actually be applied; "system" resolves to one of these. */
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";

export function isThemePreference(value: unknown): value is ThemePreference {
  return typeof value === "string" && (THEME_PREFERENCES as readonly string[]).includes(value);
}

/** Unknown or missing stored values fall back to the default (follow the system). */
export function parseThemePreference(value: unknown): ThemePreference {
  return isThemePreference(value) ? value : DEFAULT_THEME_PREFERENCE;
}

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}
