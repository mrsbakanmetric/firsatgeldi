// Data sources (architecture.md §7.1). Server side only: the API and the worker use it,
// never the browser. Path 1 of link reading (link text) is the first piece.
export { type LinkTextFailure, type LinkTextReading, type LinkTextResult, readLinkText } from "./link-text.ts";
export { PLATFORM_DOMAINS, type PlatformCode, type PlatformDomain, platformOfHost, platformOfShortLinkHost } from "./platforms.ts";
