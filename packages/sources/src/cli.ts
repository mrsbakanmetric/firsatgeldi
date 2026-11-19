// Data-test runner (implementation_plan.md step 23, Appendix A). Development tool, not
// part of the app. Usage:
//
//   pnpm --filter @firsatgeldi/sources data-test link <url>
//   pnpm --filter @firsatgeldi/sources data-test link <url> --search [--max-queries N]
//
// `link` runs path 1 (link text): no request to the store, no SerpApi search.
// `--search` adds path 2: one Google Shopping search through SerpApi with what path 1
// read, then the product match (matching.ts): one proposed offer (HIGH) or the closest
// three (LOW). Saved answers (recordings/serpapi) are reused and cost nothing; a run spends
// at most `--max-queries` live searches (default 1). The key is read from the root `.env`.
import { join } from "node:path";
import { readLinkText } from "./link-text.ts";
import { pathTwoQuery, readGoogleShopping } from "./google-shopping.ts";
import { matchProduct, type ProductMatch, type ScoredOffer } from "./matching.ts";
import { createSerpApiClient } from "./serpapi.ts";

const USAGE = "Usage: data-test link <url> [--search] [--max-queries N]";
const ROOT = join(import.meta.dirname, "..", "..", "..");
export const RECORDINGS_DIR = join(import.meta.dirname, "..", "recordings", "serpapi");
const DEFAULT_MAX_QUERIES = 1;

function flagValue(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const brief = (scored: ScoredOffer) => ({ index: scored.index, title: scored.offer.title, score: Number(scored.score.toFixed(3)) });

function matchSummary(match: ProductMatch) {
  const dropped = match.dropped.length;
  return match.confidence === "HIGH"
    ? { confidence: match.confidence, proposed: brief(match.proposed), candidates: match.ranked.length, dropped }
    : { confidence: match.confidence, closest: match.closest.map(brief), candidates: match.ranked.length, dropped };
}

function print(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main(args: readonly string[]): Promise<number> {
  const [command, url] = args;
  if (command !== "link" || !url) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  const result = readLinkText(url);
  if (!args.includes("--search") || !result.ok) {
    print(result);
    return result.ok ? 0 : 1;
  }

  try {
    process.loadEnvFile(join(ROOT, ".env"));
  } catch {
    // No .env: the key check below explains what is missing.
  }
  const apiKey = process.env.SERPAPI_API_KEY ?? "";
  if (!apiKey) {
    process.stderr.write("SERPAPI_API_KEY is not set in the root .env.\n");
    return 2;
  }
  const maxQueries = Number(flagValue(args, "--max-queries") ?? DEFAULT_MAX_QUERIES);
  const client = createSerpApiClient({ apiKey, maxQueries, cacheDir: RECORDINGS_DIR });
  const query = pathTwoQuery(result.reading);
  const answer = await client.googleShopping(query);
  const shopping = readGoogleShopping(answer.body);
  const match = matchSummary(matchProduct(result.reading, shopping.offers));
  print({ path1: result.reading, path2: { query, fromCache: answer.fromCache, searchesSpent: client.spent(), ...shopping }, match });
  return 0;
}

process.exitCode = await main(process.argv.slice(2));
