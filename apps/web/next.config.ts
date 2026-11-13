import type { NextConfig } from "next";

/**
 * Pages named `page.dev.tsx` (the shell preview) exist only in development:
 * a production build does not know the "dev.tsx" extension, so the route and
 * its code are not part of it.
 */
export const DEV_ONLY_PAGE_EXTENSION = "dev.tsx";
const isDevelopment = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  pageExtensions: isDevelopment ? [DEV_ONLY_PAGE_EXTENSION, "tsx", "ts"] : ["tsx", "ts"],
  transpilePackages: [
    "@firsatgeldi/contracts",
    "@firsatgeldi/core",
    "@firsatgeldi/i18n",
    "@firsatgeldi/tokens",
    "@firsatgeldi/ui",
  ],
};

export default nextConfig;
