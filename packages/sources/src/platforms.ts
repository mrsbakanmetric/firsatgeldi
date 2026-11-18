// Launch stores (database.md §6 `platforms.code`; implementation_plan.md Appendix A).
// In Phase 2 the domains come from the `platforms` table; until then this list is the
// single place that knows them.

export type PlatformCode = "TRENDYOL" | "HEPSIBURADA" | "AMAZON_TR" | "MEDIAMARKT" | "TEKNOSA";

export interface PlatformDomain {
  readonly code: PlatformCode;
  /** Registrable domain; `www.` and `m.` sub-domains map to it. */
  readonly domain: string;
  /**
   * Share-link hosts that only redirect to a product page. Reading them needs a request
   * to the store, so path 1 (link text) cannot read them. [ASSUMPTION — confirm in the data test]
   */
  readonly shortLinkHosts: readonly string[];
}

export const PLATFORM_DOMAINS: readonly PlatformDomain[] = [
  { code: "TRENDYOL", domain: "trendyol.com", shortLinkHosts: ["ty.gl"] },
  { code: "HEPSIBURADA", domain: "hepsiburada.com", shortLinkHosts: [] },
  { code: "AMAZON_TR", domain: "amazon.com.tr", shortLinkHosts: ["amzn.to", "amzn.eu"] },
  { code: "MEDIAMARKT", domain: "mediamarkt.com.tr", shortLinkHosts: [] },
  { code: "TEKNOSA", domain: "teknosa.com", shortLinkHosts: [] },
];

const SUB_DOMAINS = /^(www|m)\./;

/** The store of a host name, or null when it is not a launch store. */
export function platformOfHost(host: string): PlatformDomain | null {
  const bare = host.toLowerCase().replace(SUB_DOMAINS, "");
  return PLATFORM_DOMAINS.find((platform) => platform.domain === bare) ?? null;
}

/** The store whose share-link host this is, or null. */
export function platformOfShortLinkHost(host: string): PlatformDomain | null {
  const bare = host.toLowerCase().replace(SUB_DOMAINS, "");
  return PLATFORM_DOMAINS.find((platform) => platform.shortLinkHosts.includes(bare)) ?? null;
}
