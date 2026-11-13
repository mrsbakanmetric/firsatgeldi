// Development only: serves MSW's service worker at /mockServiceWorker.js
// (scope "/") for the in-browser mock API. The ".dev.ts" extension is a route
// extension only in development (next.config.ts), so a production build has no
// such route and no file in public/.
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";

export async function GET() {
  // Resolved from the web app's own dependencies (msw is a devDependency).
  const require = createRequire(join(process.cwd(), "package.json"));
  const source = await readFile(require.resolve("msw/mockServiceWorker.js"), "utf8");
  return new Response(source, {
    headers: { "Content-Type": "text/javascript; charset=utf-8", "Cache-Control": "no-store", "Service-Worker-Allowed": "/" },
  });
}
