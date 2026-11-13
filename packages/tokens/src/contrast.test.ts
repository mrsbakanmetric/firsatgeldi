import { describe, expect, it } from "vitest";
import { tokens } from "../generated/tokens";
import { contrastRatio } from "./contrast";
import { componentPairs, MIN_RATIO, SEMANTIC_PAIRS, SERIES_ROLE, type ContrastPair } from "./contrast-pairs";

describe("contrastRatio", () => {
  it("matches the WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
  });

  it("is symmetric", () => {
    expect(contrastRatio("#047857", "#F7FAF9")).toBe(contrastRatio("#F7FAF9", "#047857"));
  });

  it("rejects colours with transparency", () => {
    expect(() => contrastRatio("rgba(0,0,0,0.5)", "#FFFFFF")).toThrow();
  });
});

const pairs: ContrastPair[] = [...SEMANTIC_PAIRS, ...componentPairs(tokens.components)];
const modes = ["light", "dark"] as const;

describe.each(modes)("WCAG AA contrast — %s theme", (mode) => {
  const colors: Record<string, string | readonly string[]> = tokens.themes[mode].color;
  const color = (role: string): string => {
    const value = colors[role];
    if (typeof value !== "string") throw new Error(`Colour role "${role}" is missing or not a single colour`);
    return value;
  };

  it.each(pairs.map((pair) => [`${pair.foreground} on ${pair.background} (${pair.kind}, ${pair.usage})`, pair] as const))(
    "%s",
    (_name, pair) => {
      const ratio = contrastRatio(color(pair.foreground), color(pair.background));
      expect(ratio, `${mode}: ${pair.foreground} on ${pair.background} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(MIN_RATIO[pair.kind]);
    },
  );

  it(`every ${SERIES_ROLE} colour on surface (ui)`, () => {
    const series = colors[SERIES_ROLE];
    if (!Array.isArray(series)) throw new Error(`"${SERIES_ROLE}" must be a list of colours`);
    for (const [index, value] of series.entries()) {
      const ratio = contrastRatio(value, color("surface"));
      expect(ratio, `${mode}: ${SERIES_ROLE}[${index}] on surface is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(MIN_RATIO.ui);
    }
  });
});

describe("pair list", () => {
  it("includes the pairs declared by the component settings", () => {
    expect(componentPairs(tokens.components).length).toBeGreaterThan(0);
  });
});
