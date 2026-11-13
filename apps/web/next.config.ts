import type { NextConfig } from "next";

/**
 * Pages named `page.dev.tsx` (the shell preview) and routes named `route.dev.ts`
 * (the mock API's service worker) exist only in development: a production build
 * does not know the "dev.tsx" / "dev.ts" extensions, so the routes and their
 * code are not part of it.
 */
export const DEV_ONLY_PAGE_EXTENSION = "dev.tsx";
export const DEV_ONLY_ROUTE_EXTENSION = "dev.ts";
const isDevelopment = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  pageExtensions: isDevelopment ? [DEV_ONLY_PAGE_EXTENSION, DEV_ONLY_ROUTE_EXTENSION, "tsx", "ts"] : ["tsx", "ts"],
  transpilePackages: [
    "@firsatgeldi/contracts",
    "@firsatgeldi/core",
    "@firsatgeldi/i18n",
    // Development only: loaded behind the mock API switch (lib/api/ready.ts).
    "@firsatgeldi/mocks",
    "@firsatgeldi/tokens",
    "@firsatgeldi/ui",
  ],
};

export default nextConfig;
