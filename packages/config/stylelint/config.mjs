// Hand-written CSS in UI code: no literal colours or lengths; use the variables
// from @firsatgeldi/tokens/theme.css (var(--color-…), var(--spacing-…)).
/** @type {import("stylelint").Config} */
export default {
  rules: {
    "color-no-hex": true,
    "color-named": "never",
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch", "color"],
    "unit-disallowed-list": ["px", "rem", "em"],
  },
};
