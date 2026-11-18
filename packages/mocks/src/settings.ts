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
  "check_now.cache_minutes": 5,
  /** "Geri al" after ending tracking from the list (Tracked Items v3: 7 days) [ASSUMPTION — key]. */
  "tracking.restore_days": 7,
  "return.default_rule": { days: 14, startType: "DELIVERY", avgDeliveryDays: null },
  "media.max_bytes": 10 * MEGABYTE,
  "media.max_images_per_request": 5,
  "media.private_retention_hours": 24,
  "support.max_attachments": 3,
  "support.attachment_retention_days": 30,
  "upload.guest_poll_interval_seconds": 2,
  "upload.guest_poll_max_seconds": 60,
  "seller_lookup.rate_limit_per_minute": 10,
  "listing.seller_rating_good_min": 4.0,
  "tokens.welcome_gift": 3,
  /** Sign-in (database.md §9 [ASSUMPTION] values; modules.md Sign-in and Sign-up). */
  "auth.password_min_length": 8,
  "auth.lockout_attempts": 5,
  "auth.lockout_minutes": 15,
  "auth.resend_cooldown_seconds": 60,
  /** Days a deleted account can still be restored (database.md §18). */
  "account.deletion_restore_days": 30,
  /** E-mail link lifetimes [ASSUMPTION — keys and values; not in database.md yet]. */
  "auth.verify_link_hours": 24,
  "auth.reset_link_minutes": 60,
  /** Life of the choice after a correct password on a suspended / pending-deletion account [ASSUMPTION]. */
  "auth.challenge_minutes": 15,
  /** Settings and Account (database.md §18 [DECIDED 2026-11-18]). */
  "pii.reauth_minutes": 15,
  "pii.self_reveal_seconds": 60,
  "username.change_days": 30,
  "avatar.max_bytes": 5 * MEGABYTE,
  "notify.daily_cap": 5,
  "notify.digest_time": "19:00",
  /** Notifications (database.md §18): list window and the delivery question asked again [DECIDED 2026-11-13, 2026-11-19]. */
  "notify.list_days": 30,
  "notify.delivery_reask_days": 2,
  "notify.delivery_reask_max": 3,
  "account.export_download_days": 7,
  /** Profilim: "Geri al" after removing a follower or unfollowing (modules.md Profilim) [ASSUMPTION — key and value]. */
  "community.follow_undo_minutes": 10,
  /** Version id of the cookie policy the consent refers to (Legal Pages) [ASSUMPTION — mock value]. */
  "legal.cookie_version": "2026-11-01",
  /** Version id of the terms accepted at sign-up (Legal Pages) [ASSUMPTION — mock value]. */
  "legal.terms_version": "2026-11-01",
  /** Home (database.md §18 [DECIDED 2026-11-15]; values [ASSUMPTION]). */
  "home.tracked_cards": 4,
  "home.top_drops.count": 3,
  "home.top_drops.window_days": 30,
  "home.top_drops.min_drop_pct": 10,
  "home.top_drops.min_history_days": 14,
  "home.top_drops.refresh_minutes": 60,
  /** Product Detail (modules.md Ratings, Trust and Accuracy; database.md §18). */
  "ratings.min_count": 20,
  "report.suspend_threshold": 3,
  /** Buy-or-wait hint windows and minimum evidence (modules.md Price history) [ASSUMPTION — keys and values]. */
  "history.hint_short_days": 30,
  "history.hint_long_days": 180,
  "history.hint_min_days": 14,
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
  /** Simulated time to prepare a data export ("Dosyan hazırlanıyor"). */
  exportMs: 1500,
  /** Life of an export download link. */
  exportLinkMinutes: 10,
  /** Simulated time of one Check Now run before `check.finished`. */
  checkMs: 900,
} as const;
