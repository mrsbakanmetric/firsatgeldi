// Automated accessibility check for UI tests (engineering_checklist.md: no axe
// violation). WCAG 2.x A/AA rules; colour contrast is checked on the tokens
// themselves (packages/tokens contrast test), since jsdom has no layout or CSS.
import axe from "axe-core";

export async function axeViolations(root: Element = document.body): Promise<string[]> {
  const result = await axe.run(root, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
    rules: { "color-contrast": { enabled: false } },
    resultTypes: ["violations"],
  });
  return result.violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`);
}
