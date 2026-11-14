// `system_settings` values the mock API needs, with the defaults from
// database.md §9 and §18. The real API reads them from the database; screen
// code never sees these numbers directly.

const MEGABYTE = 1024 * 1024;

export const SYSTEM_SETTINGS = {
  "search.autocomplete_tiles": 3,
  "search.autocomplete_page_size": 20,
  "reveal.open_hours": 168,
  "reveal.price_watch_minutes": 60,
  "tracking.stale_hours": 6,
  "return.default_rule": { days: 14, startType: "DELIVERY", avgDeliveryDays: null },
  "media.max_bytes": 10 * MEGABYTE,
  "media.max_images_per_request": 5,
  "media.private_retention_hours": 24,
  "upload.guest_poll_interval_seconds": 2,
  "upload.guest_poll_max_seconds": 60,
  "seller_lookup.rate_limit_per_minute": 10,
  "tokens.welcome_gift": 3,
} as const;

/** Plan limits (database.md §9 `plans`); reveals are unlimited while the first-release gate is FREE_TOGGLE. */
export const PLAN_LIMITS = {
  FREE: { maxActiveTracking: 10, dailyCheckLimit: 10, monthlyRevealLimit: 3 },
  PREMIUM: { maxActiveTracking: 50, dailyCheckLimit: 30, monthlyRevealLimit: null },
} as const;

/** Reveal gate of the first release [DECIDED] (architecture.md §6.3): always allowed, cost 0. */
export const REVEAL_GATE_STAGE = "FREE_TOGGLE" as const;

/** Values that exist only in the mock (development behaviour, not product rules). */
export const MOCK_SETTINGS = {
  /** Default network delay so loading states are visible in development. */
  defaultLatencyMs: 300,
  /** Presigned upload URL lifetime (architecture.md §11a: 10 min). */
  presignMinutes: 10,
  /** Simulated image processing time before `upload.ready`. */
  processingMs: 600,
  /** Stale scenario: checks are moved back by this many times `tracking.stale_hours`. */
  staleFactor: 2,
} as const;
