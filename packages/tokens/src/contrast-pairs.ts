// Colour-role pairs checked for WCAG AA contrast in every theme (light and dark).
// Role names only; the values come from docs/design-tokens.json.
//
// - "text": normal-size text on a background → at least 4.5:1.
// - "ui":   UI parts and graphical objects (focus ring, borders that identify a
//           control, icons, chart lines, stock boxes) → at least 3:1.
// Not checked (decorative, no WCAG requirement): border, divider, chart-grid,
// hero-line, sparkle, overlay.

export type PairKind = "text" | "ui";

export interface ContrastPair {
  kind: PairKind;
  foreground: string;
  background: string;
  /** Where the pair is used, shown in the failure message. */
  usage: string;
}

export const MIN_RATIO: Record<PairKind, number> = { text: 4.5, ui: 3 };

const text = (foreground: string, background: string, usage: string): ContrastPair => ({ kind: "text", foreground, background, usage });
const ui = (foreground: string, background: string, usage: string): ContrastPair => ({ kind: "ui", foreground, background, usage });

export const SEMANTIC_PAIRS: readonly ContrastPair[] = [
  ...["background", "surface", "surface-alt"].flatMap((background) => [
    text("text", background, "body text"),
    text("text-muted", background, "secondary text, captions, placeholders"),
  ]),
  ...["background", "surface"].flatMap((background) => [
    text("primary", background, "secondary / ghost button label, links"),
    text("savings", background, "saving amount"),
    text("accent-text", background, "deal text"),
    text("danger", background, "error text"),
    text("info", background, "information text"),
  ]),
  text("on-primary", "primary", "primary button"),
  text("on-primary", "primary-hover", "primary button, hover"),
  text("on-primary-subtle", "primary-subtle", "primary subtle surface"),
  text("on-primary-subtle", "savings-subtle", "savings badge"),
  text("on-accent", "accent", "deal button, deal badge"),
  text("on-accent", "accent-hover", "deal button, hover"),
  text("on-warning-subtle", "warning-subtle", "warning badge"),
  text("danger", "danger-subtle", "danger badge"),
  text("text-inverse", "danger", "danger button"),
  text("info", "info-subtle", "info badge"),
  text("on-hero-surface", "hero-surface", "deal hero text"),
  text("on-hero-muted", "hero-surface", "deal hero secondary text"),
  text("hero-savings", "hero-surface", "deal hero saving"),
  text("on-logo-surface", "logo-surface", "store logo tile"),

  ...["background", "surface"].map((background) => ui("focus-ring", background, "focus ring")),
  ui("primary", "surface", "secondary button border, focused input border"),
  ui("primary", "surface-alt", "focused input border"),
  ui("on-hero-muted", "hero-surface", "secondary button border on the deal hero"),
  ui("accent-text", "surface", "deal notification icon"),
  ui("accent", "surface", "deal notification left border"),
  ui("warning", "surface", "deadline notification icon and border"),
  ui("info", "surface", "info notification icon and border"),
  ui("chart-paid", "surface", "price history: paid line"),
  ui("chart-best", "surface", "price history: cheapest line"),
  ui("chart-deal", "surface", "price history: deal point"),
  ui("stock-in", "surface", "stock history: in-stock box"),
  // The low-stock box is identified by its border; the amber fill alone is too
  // light on a light surface (design-tokens.json stock-low-border, spec PR #23).
  ui("stock-low-border", "surface", "stock history: low-stock box border"),
  ui("stock-out-border", "surface", "stock history: out-of-stock box border"),
];

/** Every chart-series colour is a graphical object on the surface. */
export const SERIES_ROLE = "chart-series";

type ComponentTree = { readonly [key: string]: unknown };

/**
 * Text/background pairs declared by the component settings themselves
 * (e.g. button.primary: bg color.primary + text color.on-primary), so a new
 * component in the token file is checked without editing this list.
 */
export function componentPairs(components: ComponentTree, path = "components"): ContrastPair[] {
  const role = (value: unknown) => (typeof value === "string" && value.startsWith("color.") ? value.slice("color.".length) : null);
  const pairs: ContrastPair[] = [];
  const foreground = role(components["text"]);
  if (foreground) {
    for (const key of ["bg", "bg-hover"]) {
      const background = role(components[key]);
      if (background) pairs.push(text(foreground, background, `${path}.${key}`));
    }
  }
  for (const [key, value] of Object.entries(components)) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      pairs.push(...componentPairs(value as ComponentTree, `${path}.${key}`));
    }
  }
  return pairs;
}
