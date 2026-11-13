/** Joins class names, skipping empty values. */
export function cn(...classes: ReadonlyArray<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** Visible keyboard focus ring (components.button.focus): 2 px focus-ring colour, 2 px offset. */
export const focusRing =
  "outline-none focus-visible:outline-solid focus-visible:outline-(length:--border-width-strong) focus-visible:outline-focus-ring focus-visible:outline-offset-(length:--component-button-focus-ring-offset)";
