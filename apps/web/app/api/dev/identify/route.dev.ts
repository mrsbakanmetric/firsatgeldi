// Development only: the AI layer of the link reading test page (/tr/dev/link). Reads the link
// text (path 1), then asks the local model through Ollama what the product is
// (packages/sources/src/identify.ts). The ".dev.ts" extension is a route extension only in
// development (next.config.ts), so a production build has no such route. Answers are saved
// under packages/sources/recordings/identify and reused; one model call per new link at most.
import { readLinkText } from "@firsatgeldi/sources";
import { createLinkIdentifier, createOllamaClassifier, IdentifyAnswerError } from "@firsatgeldi/sources/identify";
import { join } from "node:path";

/** Local model for the free test (user decision 2026-11-19); override with LINK_IDENTIFY_MODEL. */
const DEFAULT_MODEL = "qwen3:4b";
const CACHE_DIR = join(process.cwd(), "..", "..", "packages", "sources", "recordings", "identify");
const CALLS_PER_REQUEST = 1;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { link?: unknown } | null;
  const link = typeof body?.link === "string" ? body.link : "";
  const read = readLinkText(link);
  if (!read.ok) return Response.json({ error: "NOT_READ" }, { status: 422 });

  const classifier = createOllamaClassifier({ model: process.env.LINK_IDENTIFY_MODEL ?? DEFAULT_MODEL });
  const identifier = createLinkIdentifier({ classifier, cacheDir: CACHE_DIR, maxCalls: CALLS_PER_REQUEST });
  try {
    return Response.json({ identity: await identifier.identify(read.reading) });
  } catch (error) {
    if (error instanceof IdentifyAnswerError) return Response.json({ error: "ANSWER" }, { status: 502 });
    return Response.json({ error: "UNAVAILABLE" }, { status: 503 });
  }
}
