import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: [
    "@firsatgeldi/contracts",
    "@firsatgeldi/core",
    "@firsatgeldi/i18n",
    "@firsatgeldi/tokens",
    "@firsatgeldi/ui",
  ],
};

export default nextConfig;
