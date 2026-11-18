// Data-test runner (implementation_plan.md step 23, Appendix A). Development tool, not
// part of the app. Usage:
//
//   pnpm --filter @firsatgeldi/sources data-test link <url>
//
// `link` runs path 1 (link text): it sends no request to the store and spends no
// SerpApi query. Paths 2 and 3 are added as their own commands later.
import { readLinkText } from "./link-text.ts";

const USAGE = "Usage: data-test link <url>";

function main(args: readonly string[]): number {
  const [command, url] = args;
  if (command !== "link" || !url) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  const result = readLinkText(url);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result.ok ? 0 : 1;
}

process.exitCode = main(process.argv.slice(2));
