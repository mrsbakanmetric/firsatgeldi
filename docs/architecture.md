# FırsatGeldi — System Architecture

> **Version:** 1.3
> **Status:** Approved — technology stack confirmed [DECIDED — A1]; roles (Application Manager + User), web/mobile access, indefinite histories, fraud monitoring, image architecture and personal-data protection included
> **Last updated:** 2026-11-12
> **Scope:** Web + mobile screen coverage (same API, same permissions) + API + background workers. Mobile **technology** intentionally left open.

This document describes **how the product is built**: service boundaries, modules, flows, queue jobs, the API contract and how the hidden-seller rule is enforced on the server. **The complete data model is in `database.md`.** What the product does is in `product_spect.md` and `modules.md`; how it looks is in `product_design_pattern.md` + `design-tokens.json`; acceptance rules are in `engineering_checklist.md`.

**Precedence on conflict:** `product_spect.md` → `engineering_checklist.md` → `product_design_pattern.md` → `modules.md` → this document → `database.md`.

**Labels:** **[DECIDED]** confirmed · **[RECOMMENDED]** awaiting confirmation · **[OPEN]** intentionally deferred.

---

## Table of Contents

1. [Core principles](#1-core-principles)
2. [Monorepo structure](#2-monorepo-structure)
3. [Technology stack](#3-technology-stack)
4. [Service boundaries](#4-service-boundaries)
5. [Data model (summary)](#5-data-model-summary)
6. [Hidden-seller rule and reveal gate](#6-hidden-seller-rule-and-reveal-gate)
7. [Price engine and data sources](#7-price-engine-and-data-sources)
8. [Scheduling, check allowances and budget](#8-scheduling-check-allowances-and-budget)
9. [Queue and scheduled jobs](#9-queue-and-scheduled-jobs)
10. [Product identification and matching](#10-product-identification-and-matching)
11. [Search, catalogue and SEO pages](#11-search-catalogue-and-seo-pages)
11a. [Image architecture](#11a-image-architecture)
12. [Deal, return and notification flows](#12-deal-return-and-notification-flows)
13. [Live updates (SSE)](#13-live-updates-sse)
14. [Cache strategy](#14-cache-strategy)
15. [API architecture](#15-api-architecture)
16. [API endpoint contract](#16-api-endpoint-contract)
17. [Identity, account and consents](#17-identity-account-and-consents)
18. [Roles, access, histories and fraud](#18-roles-access-histories-and-fraud)
19. [Internationalisation (i18n)](#19-internationalisation-i18n)
20. [Design system integration](#20-design-system-integration)
21. [Web and mobile applications](#21-web-and-mobile-applications)
22. [Security](#22-security)
22a. [Personal-data protection and masking](#22a-personal-data-protection-and-masking)
23. [Observability and cost](#23-observability-and-cost)
24. [CI/CD and hosting](#24-cicd-and-hosting)
25. [Build order and first vertical slice](#25-build-order-and-first-vertical-slice)
26. [Open decisions and risks](#26-open-decisions-and-risks)

---

## 1. Core principles

| # | Principle | How the architecture implements it |
|---|---|---|
| 1 | **Production product, not an MVP** [DECIDED] | Vertical slices; no temporary code, disabled tests or "fix later" notes |
| 2 | **Verify first** (mark → confirm) | Tracking is created only by the confirm endpoint; marking creates nothing on the server |
| 3 | **The owner of an offer is the seller** [DECIDED] | `offers` = product × seller × platform; comparison, ranking and reveal at seller level |
| 4 | **Cheaper seller hidden** [DECIDED] | Response shaping in the API (§6); seller-less read paths; leak test |
| 5 | **Honest data** | Every price/stock carries `lastCheckedAt`; durations say "at least"; failed checks keep the last value; estimates are labelled "tahmini" |
| 6 | **Polite data collection** | Per-site rate limits, robots.txt, identifiable User-Agent, back-off when blocked, no store accounts |
| 7 | **Track per product** | One check serves every tracker |
| 8 | **Thin client** | Business rules on the server / in `core`; web and mobile use the same API |
| 9 | **Configuration is data** | All thresholds, durations, limits, plan values, templates and legal texts in the DB; no deploy |
| 10 | **Cache first** | Known data immediately, fresh data in the background |
| 11 | **Every change is tracked** | Settings, rules, templates, catalogue and personal-data access go to the audit log; versioned records are revertible |
| 12 | **No history is ever deleted** [DECIDED] | Price, stock, product, search and activity histories are indefinite; on account deletion only the personal link is anonymised |
| 13 | **Authorisation on the server, by permission key** [DECIDED] | Web and mobile share the API and permission checks; the Application Manager sees and manages everything everywhere |
| 14 | **Images never in the DB** [DECIDED] | Object storage, content-addressed and de-duplicated, metadata stripped, size variants; user uploads private; order screenshots and identification photos deleted after 24 h, support-request screenshots after 30 days |
| 15 | **Personal data encrypted and masked** [DECIDED] | Email/phone encrypted at application level + blind index; password Argon2id; masked on screen, in logs and in exports |

---

## 2. Monorepo structure

**Tooling:** pnpm workspaces + Turborepo [DECIDED]

```
firsatgeldi/
├── apps/
│   ├── web/                 # Next.js (App Router) — user app + /admin panel + landing/SEO/legal/help
│   ├── api/                 # NestJS (Fastify) — single HTTP API (serves web and mobile)
│   └── worker/              # BullMQ workers + scheduled jobs — separate process from the API
│   # mobile/               # [OPEN] — technology to be decided; reuses core/contracts/i18n/tokens
│
└── packages/
    ├── core/                # Pure business rules: priority, return/delivery maths, net saving, rank labels,
    │                        #   gate order (Premium→monthly→token), fake discount, buy-or-wait hint,
    │                        #   masking functions, money/time formatting
    ├── contracts/           # Zod schemas + OpenAPI + shared types (HiddenOfferView, RevealedOfferView…)
    ├── db/                  # Prisma schema, migrations (raw SQL: Timescale, pgvector, RLS, views), seed
    ├── sources/             # SerpApi + store site-search adapters + page verifier + link resolver + allow-list
    ├── tokens/              # design-tokens.json → CSS variables + Tailwind theme + contrast check
    ├── i18n/                # UI translation catalogues (tr, en), typed keys
    ├── ui/                  # Pattern components — canonical list in pagedesign.md §5 (Flag, MoneyDisplay, PriceHistory, HiddenOfferCard…)
    └── config/              # env schema, ESLint (hard-coded value + i18n rules), tsconfig
```

Rules:
- `core` and `contracts` depend on no framework → the mobile client reuses them.
- `web` never accesses the database; only the API.
- No external source call inside an HTTP request (exception: single page verification on click, with timeout).

### API modules

```
apps/api/src/modules/
├── identify/        # Text/photo/link → "how we understood it", candidates, multi-product image (bulk add)
├── catalog/         # Product, category, template reads; SEO product page data
├── search/          # Autocomplete, hybrid search, personal ranking
├── tracking/        # Confirm, edit, step ticks, delivery answer, end, extend, want→bought
├── offers/          # Offer reads (seller-less view), go, notify-back-in-stock
├── reveal/          # Show/Hide, gate, price-watch refund
├── entitlements/    # Effective plan, remaining allowances (reveal, tracking, checks), tokens, package requests
├── history/         # Price/stock history, buy-or-wait hint
├── checks/          # Check now (single + bulk), check status
├── deals/           # Deal lifecycle reads
├── savings/         # My Savings, saving corrections
├── returns/         # Return rule resolution, return guide data, calendar (.ics), price-difference message
├── home/            # Home aggregation
├── notifications/   # Centre, preferences, digest, SSE
├── community/       # Following, consent, link sharing, badges (later slice)
├── reports/         # Wrong price / different product, outcome notifications
├── content/         # Legal texts, help, consent/re-consent, cookie preferences
├── support/         # Contact form, request conversation
├── affiliate/       # Outbound link + click logging
├── auth/            # Dev login → (last) email, Google, Apple
├── users/           # Profile, settings, account deletion (30 days), export
├── permissions/     # Data-driven permission checks
├── roles/           # Roles and permissions, Application Manager assignment
├── settings/        # system_settings read/write, critical-setting confirmation, rollback
├── audit/           # Audit log writing (interceptor) and reading
├── activity/        # Activity history capture (interceptor → queue), user's own search/security history
├── history-admin/   # History Explorer: price, stock, product, search, activity queries (admin)
├── risk/            # Fraud rules, signals, scores, cases, restriction gate
├── media/           # Presigned upload, processing status, /img serving, signed private links
├── pii/             # Encryption/decryption service (KMS), blind index, masking, time-limited reveal
└── admin/           # Overview KPIs, return rules, templates, campaigns, platforms/health, reports,
                     #   users, notification templates, catalogue, package settings/requests, legal content,
                     #   support requests, provider cost
```

Internal pattern: `controller` (HTTP + Zod) → `service` (business rules) → `repository` (Prisma/raw SQL, no business rules) → `dto` (`contracts`). Shared: `common/response-shaping` (§6), `common/audit` and `common/activity` interceptors (§18).

---

## 3. Technology stack

**[DECIDED — A1]** Versions are not pinned; the current stable version of each component is used. Priority: **security → speed → instant data → modern look and feel**.

| Layer | Technology |
|---|---|
| Monorepo | pnpm + Turborepo |
| Web | Next.js (App Router) + React + TypeScript (strict) |
| Interface | Tailwind CSS (generated from tokens) + Radix UI / React Aria |
| Server state | TanStack Query |
| Live updates | Server-Sent Events |
| Charts | In-house SVG components |
| Installable web | PWA |
| API | NestJS (Fastify) + Zod + OpenAPI |
| ORM | Prisma + raw SQL migrations |
| Database | PostgreSQL + TimescaleDB + pgvector |
| Queue / cache | Redis + BullMQ |
| Search | Meilisearch |
| Files / images | S3-compatible object storage (catalogue: public behind CDN · private: signed short-lived links · quarantine) + image processing library (libvips-based) |
| Key management | KMS (envelope encryption, key rotation) + secret manager |
| AI | Vision-capable LLM + embeddings, behind a provider interface; **provider [OPEN]** |
| Email | Transactional email provider, behind an interface; **provider [OPEN]** |
| Observability | OpenTelemetry + error tracking + metrics/alerts |
| Hosting | Containers, region close to Türkiye, CDN + WAF |

**Mobile:** screen coverage decided (§21), technology [OPEN].

---

## 4. Service boundaries

```
                ┌──────────────┐   HTTPS (cookie session)  ┌──────────────┐
  Browser ───▶  │  apps/web    │ ────────────────────────▶ │   apps/api   │
  (PWA)    ◀─── │  Next.js     │ ◀──── SSE /me/stream ──── │   NestJS     │
                └──────────────┘                            └──────┬───────┘
  Mobile app ─────────── same API, same permissions ──────────────▶│
  [tech OPEN]                                                      │ enqueue / read
                    ┌──────────────┐     ┌──────────┐      ┌───────▼───────┐
                    │ PostgreSQL   │◀───▶│  Redis   │◀────▶│  apps/worker  │
                    │ +Timescale   │     │ BullMQ   │      │ scheduler     │
                    │ +pgvector    │     │ cache    │      │ discov/verify │
                    └──────────────┘     └──────────┘      │ notify/digest │
                    ┌──────────────┐  ┌──────────────┐     │ media/risk    │
                    │ Meilisearch  │  │ Object store │◀────┤ cleanup/KPI   │
                    └──────────────┘  │ + CDN, KMS   │     └───────┬───────┘
                                      └──────────────┘             │ allow-listed domains
                                                    ┌──────────────▼───────────────┐
                                                    │ SerpApi · store sites ·      │
                                                    │ LLM · email                  │
                                                    └──────────────────────────────┘
```

| Component | Responsibility | Does not |
|---|---|---|
| `web` | Screens, SSR (incl. SEO product/help/legal pages), i18n, theme, /admin | Access the DB; know hidden seller identities |
| mobile client [tech OPEN] | Screens in the access matrix (`modules.md`), push | Contain business rules; same API and permission checks |
| `api` | Identity, authorisation, validation, response shaping, audit/activity capture, enqueueing | Call external sources (except click verification) |
| `worker` | Scheduling, discovery, verification, matching, deals, notifications/digest, expiries, media processing, risk evaluation, cleanup, KPIs, budget | Serve HTTP |

---

## 5. Data model (summary)

**Full definition in `database.md`.** Only the architectural decisions here:

- Money in integer kuruş; time in UTC, day calculations in Europe/Istanbul; statuses as `text + CHECK`.
- **System of record is PostgreSQL**; Redis and Meilisearch are rebuildable.
- **Time series** (`price_history`, `stock_history`, `activity_events`, `search_events`, `product_events`, `api_usage`) are TimescaleDB hypertables, **indefinite**, compressed; "cheapest price" and KPIs are continuous aggregates.
- **Append-only** tables: histories, `offer_reveals`, `token_ledger`, `tracked_item_events`, `setting_changes`, `audit_logs`, `risk_signals`.
- **Return-policy reader [DECIDED 2026-11-12]:** a daily worker job per platform fetches the policy page (same adapter limits and robots rules as price checks), extracts days / start / cancel / shipping, applies the plausibility guard, writes a new rule version or keeps the last value and counts a failure (job `return-policy-reader`).
- **Versioned** records: return rules, category templates, notification templates, legal/help content, settings.
- **Images:** metadata only (`media_assets`, `media_variants`, `uploads`); binaries in object storage.
- **Personal data:** encrypted columns + blind indexes; masked values computed in `core`.
- **Seller-less read view** `v_offer_public` + RLS on user data — §6, §18.

---

## 6. Hidden-seller rule and reveal gate

**Hiding happens when the API response is built, not in the UI.**

### 6.1 Two views

| Field | `HiddenOfferView` | `RevealedOfferView` | Seller bought from |
|---|---|---|---|
| `ref` (opaque) | ✓ | ✓ | ✓ |
| `rankLabel` | ✓ | ✓ | — |
| price, previousPrice, saving, netSaving | ✓ | ✓ | ✓ |
| shippingCost, deliveryDays [DECIDED] | ✓ | ✓ | ✓ |
| stockState, stockSince, priceSince, warrantyType, lastCheckedAt | ✓ | ✓ | ✓ |
| fakeDiscountNote | ✓ | ✓ | ✓ |
| sellerName, sellerRating, platformName [DECIDED — A3] | ✗ | ✓ | ✓ |
| listingUrl (our outbound link) + commission note | ✗ | ✓ | ✓ |
| revealExpiresAt, gateUsed | — | ✓ | — |
| DB ids | ✗ | ✗ | ✗ |

- Identity fields are **not defined** in the `HiddenOfferView` schema; output validation strips extras.
- Repositories reading hidden offers use the `v_offer_public` view (no seller/platform/link columns).
- Identity comes only in the reveal response and in later reads while the reveal has not expired (`expires_at`).
- More expensive sellers [OPEN, spec §17-7]: for now only the seller bought from is named.

**Application Manager [DECIDED]:** sees all seller identities with `admin.offers.view_hidden_seller` and uses Göster without spending allowance (`gate=ADMIN`); every view goes to the audit log (`contains_hidden_seller`).

### 6.2 Opaque reference
`ref = base64url(HMAC(secret, userId ‖ trackedItemId ‖ offerId))` + Redis mapping (24 h). Does not work for another user; cannot be enumerated.

### 6.3 Reveal gate

```ts
interface RevealGate {
  check(user, offer): Promise<
    | { allowed: true; gate: 'FREE_TOGGLE' | 'PREMIUM' | 'MONTHLY_FREE' | 'TOKEN' | 'ADMIN'; cost: number }
    | { allowed: false; reason: 'LIMIT_REACHED' | 'RESTRICTED'; options: ('REQUEST_PREMIUM' | 'REQUEST_TOKENS')[] }
  >;
  commit(user, offer, decision): Promise<RevealRecord>;  // offer_reveals + token_ledger when needed, one transaction
  refund(revealId, reason: 'PRICE_UP' | 'OUT_OF_STOCK'): Promise<void>;
}
```

| Stage | Implementation |
|---|---|
| First release [DECIDED] | `FreeToggleGate`: always allowed, cost 0, reveals recorded |
| Packages and Premium live [DECIDED] | `EntitlementGate`: order **Premium → monthly free allowance → token → "allowance used up"**; the allowance used is returned in the response |

- **Reveal lifetime** `reveal.open_hours` (def. 168) [DECIDED]; on expiry an `EXPIRE` row is written and revealing again goes through the gate.
- **Price protection** [DECIDED]: the `go` endpoint re-checks price/stock; additionally, within `reveal.price_watch_minutes` (def. 60), a price rise or stock-out triggers a notification + refund of the allowance/token.
- Token cost is a flat 1 [DECIDED — interim]; tiered pricing later.
- A user restriction (`NO_REVEAL`) returns `RESTRICTED` with a neutral message (§18.4).

### 6.4 Leak channels

| Channel | Countermeasure |
|---|---|
| JSON response | View schemas + output validation + `v_offer_public` |
| Image URL | Images served from our storage at `/img/{sha256}/{variant}` (§11a) |
| URL / query string | Opaque `ref` only |
| Notification / email | **No seller/platform variable** in templates [DECIDED]; identity-less payload schema; forbidden-phrase check on save |
| Charts | `product_cheapest_hourly` (seller-less) |
| SEO product page | Server-rendered from a seller-less data path; included in the leak test [DECIDED] |
| Discover links | A verified link becomes an offer shown as a hidden seller; the raw link is never published [DECIDED] |
| Price-difference message | Addressed only to the seller bought from; no hidden seller name [DECIDED] |
| Audit / activity logs | `contains_hidden_seller` rows readable only with permission |
| Confirm-step seller entry (R1) | **Closed [DECIDED]:** no seller list; exact-match seller lookup (rate-limited); price paid from the user (or their own link/screenshot) |

### 6.5 Mandatory test
**Hidden-seller leak contract test:** every endpoint returning offers (from OpenAPI) + SEO product pages + notification/email outputs are scanned as a second user; any hidden seller name, `external_id`, platform name/domain or listing URL breaks the build.

---

## 7. Price engine and data sources

### 7.1 Source interfaces (`packages/sources`)

```ts
interface DiscoverySource { discover(q: ProductQuery): Promise<RawOffer[]> }                         // SerpApi
interface SiteSearchAdapter { platform: PlatformCode; search(q: ProductQuery): Promise<RawOffer[]> } // per store
interface ProductPageVerifier { verify(listingUrl: string): Promise<VerifiedOffer> }                 // price, shipping, delivery, stock, seller, warranty, claimed old price
interface LinkResolver { resolve(url: string): Promise<ResolvedListing> }                            // Search and Add link detection + Discover links
```

- [DECIDED] SerpApi + store site searches **together**; adapters are independent (separate queue, separate circuit breaker).
- Extraction order: official API/feed → JSON-LD → site JSON endpoints → HTML → LLM (last resort); alarm on every fallback.
- **Ratings [DECIDED 2026-11-12]:** the same page read extracts `AggregateRating` (average, count) and, where exposed, the star distribution; review texts are never stored. The same page read also extracts the **installment table** (programme, months, interest-free, minimum) where the page shows it [DECIDED 2026-11-13]. A daily job `seller-trust` computes `seller_trust` from offers, stock history, reports and `buyer_feedback`.
- **Carrier tracking (next phase):** `CarrierSource` adapters per cargo company read status by tracking number, same politeness rules.
- New fields [DECIDED]: **shipping cost, delivery time, claimed old price** are collected.

### 7.2 Merge pipeline

```
RawOffer[] ─▶ 1 Clean ─▶ 2 Match ─▶ 3 De-duplicate ─▶ 4 Outlier filter ─▶ 5 Suspension check ─▶ 6 Write
```

1. Accessories, second-hand, foreign stores, other generations/bundles separated.
2. Bind to a product (§10); unbound offers are not written.
3. Key (product, platform, seller); on conflict the store's own data wins.
4. Prices far outside the category norm → `is_outlier`.
5. Suspended offers (multiple wrong-price reports [DECIDED]) are excluded from comparison.
6. `offers` upsert + `price_history` + `stock_history` on change + `product_events` on offer add/remove; one transaction, idempotent by `check_id`.

### 7.3 Source failure
If one source fails the other continues; alarm (`alerts`); the last known value is never erased.

---

## 8. Scheduling, check allowances and budget

### 8.1 Per-product scheduling
- `check_schedules` opens with the first active tracker and closes when the last leaves. The scheduler takes due rows every minute with `FOR UPDATE SKIP LOCKED`.
- Intervals (`system_settings`, critical):

| Situation | Interval | Path |
|---|---|---|
| A tracker's return in 1–3 days | 15–30 min | Known offers' pages |
| Campaign / mass drop | 15–30 min | Site search + page |
| Volatile product | 30–60 min | Site search |
| Normal | 2–4 h | SERP + site search |
| Has a Premium tracker | normal interval ÷ `plans.PREMIUM.check_frequency_multiplier` (2) [DECIDED] | — |
| Saving mode (budget 100%) | normal interval lengthens; return-soon / campaign / "check now" protected [DECIDED] | Cheaper sources first |
| No tracker / return window over | stop | — |

### 8.2 Check Now
- If checked within `check_now.cache_minutes` (def. **5**), the cached result is returned and no allowance is used [DECIDED].
- Daily allowance `plans.*.daily_check_limit` (Free **10**, Premium 30) [DECIDED]; Redis counter + `check_now_usage` as truth. Application Manager: unlimited.
- **Bulk check** [DECIDED]: visible active items in Tracked Items; as many as the remaining allowance, stated in advance; cached items use no allowance.
- Cheap path (known offers' pages); idempotency `productId + minute`; result via SSE.

### 8.3 Polite crawling
robots.txt (daily cache), ~1–2 req/s per site, `max_concurrency`, identifiable User-Agent; 403/429/captcha → exponential back-off + circuit breaker; no evasion, no store accounts.

### 8.4 Campaigns and mass drops
- The ready yearly list is copied each year as `PENDING`, the Application Manager approves [DECIDED].
- On a mass drop the platform is automatically boosted + "save as campaign?" suggestion [DECIDED].
- **Campaign reader [DECIDED 2026-11-13]:** a daily job `campaign-reader` reads stores' campaign pages, banks' card-campaign pages and affiliate promotion feeds (where available), within the same politeness rules; each found campaign is stored as `PENDING` with its source, conditions and read time. Unreadable sources keep the last value and raise an admin task. Personal coupons and cart-only discounts are not readable and are never guessed.

### 8.5 Provider budget [DECIDED]
80% → panel + email warning; 100% → warning + **saving mode**; usage does not stop, overrun shown separately for protected work; the Application Manager can turn saving mode off.

---

## 9. Queue and scheduled jobs

**BullMQ + Redis.** All jobs idempotent.

| Job | Trigger | What it does |
|---|---|---|
| `schedule-tick` | every minute | Due products → `discovery` / `site-search` / `verify` |
| `discovery` | tick, new product | SerpApi → `merge` |
| `site-search:{platform}` | tick | Store site search (seller level) → `merge` |
| `merge` | source jobs | §7.2 pipeline |
| `verify` | deal candidate, click, final days, reveal price watch | Product-page verification |
| `deal-evaluate` | after merge/verify | Open/update/close `deals` (net price, same warranty, stock) → `notify` |
| `reveal-watch` | reveal + within `price_watch_minutes` | Price/stock changed → notification + `refund` [DECIDED] |
| `reveal-expiry` | every 15 min | `EXPIRE` rows for expired reveals [DECIDED] |
| `notify` | events | Preferences, quiet hours, daily cap (5), uncapped urgent/mandatory, digest routing → channel |
| `digest` | hourly | Combined notification for digest users [DECIDED] |
| `return-reminder` | daily | Items with return ≤ 2 days: "İade edecek bir şey var mı?" [DECIDED] |
| `delivery-prompt` | daily | Estimated delivery passed: "Teslim aldın mı?" [DECIDED] |
| `expiry` | hourly | Return window / tracking duration ended; extension question 3 days before |
| `report-threshold` | on report write | Threshold (3) reached → offer suspended [DECIDED] |
| `identify` | user input | LLM extraction, candidates, multi-product image |
| `link-resolve` | pasted link, Discover link | Seller, price, product resolution |
| `index` | catalogue change | Meilisearch |
| `image-ingest` | new store image | Download store image → `media-process` (catalogue) |
| `media-process` | upload completed | Validate, strip metadata, de-duplicate, variants, pHash, extraction with personal data stripped |
| `media-cleanup` | hourly | Private images past `purge_at`, ref_count 0 assets, expired presigned uploads |
| `campaign-yearly-copy` | yearly | Copy the ready list to the new year as `PENDING` |
| `mass-drop-detect` | hourly | Mass drop → boost + suggestion |
| `budget-guard` | hourly | Budget 80%/100% → alarm, saving mode |
| `rule-staleness` | daily | Return rules unverified for 90+ days / missing → alarm |
| `kpi-rollup` | hourly | `admin_kpi_hourly` |
| `account-purge` | daily | Anonymise accounts past `purge_after` [DECIDED] |
| `token-reconcile` | nightly | `token_balance` ↔ `token_ledger` reconciliation |
| `activity-ingest` | every request (async) | Batch-write activity and search events; salted device/IP hashes |
| `product-event` | catalogue/offer change | `product_events` |
| `risk-evaluate` | event stream + every 5 min | Run rules → `risk_signals` → `risk_scores`; above threshold → `risk_cases` + admin notification; automatic action only flag / rate limit / hold rewards [RECOMMENDED] |
| `risk-decay` | daily | Decay risk scores over time; lift expired restrictions |
| `new-device-notify` | on sign-in | Unseen device → `NEW_DEVICE_SIGNIN` |
| `admin-digest` | daily | Pending package/support/case digest to the Application Manager |
| `pii-rekey` | manual / planned | Re-encrypt encrypted fields with a new key on rotation |
| `health` | every 5 min | Site success/latency, queues, stuck jobs → `alerts` |

Rule: request handlers never wait for a queue job; they only enqueue and return an id.

---

## 10. Product identification and matching

### 10.1 Inputs [DECIDED]
- **Text / photo:** classification → category template (generic template if none approved) → LLM fields with confidence → 1–2 questions only for low-confidence **and** critical fields.
- **Link detection:** `link-resolve` → product + seller + price; "Nasıl anladık" skipped.
- **Order screenshot:** product + seller + price + order date; **several products** → a list, mark → confirm in turn. Personal data in the screenshot is stripped (§11a).
- **Multiple images:** up to 5 per request; identification runs once all are processed.
- Guests: kept under `anon_id`, linked to the user at sign-in.

### 10.2 Candidate list
Products/variants only: image, name, model/generation, bundle, colour, number of stores. No seller, platform or price.

### 10.3 Matching order
EAN → brand + normalised model → embedding (pgvector) + image pHash → LLM "same product and bundle?" when uncertain → user confirmation (feedback).

### 10.4 Rules
- Same generation, variant/bundle and **warranty type** required.
- No exact match → said explicitly, closest three shown.
- Launch: **electronics + clothing** [DECIDED]; clothing without brand/code → same seller only; closed categories → "not yet supported" + notify me.
- Catalogue corrections (merge/split/relink) are revertible via `product_merge_log` and written to `product_events`.

---

## 11. Search, catalogue and SEO pages

- **Hybrid flow:** own index (~50 ms) → if missing/stale, live source (1–3 s) → clean, match, save, index.
- **Meilisearch:** Turkish normalisation, typo tolerance, synonyms, brand/model boosting, accessory demotion.
- **Personal ranking:** `text × (1 + 0.4·personal + 0.3·social + 0.2·popularity + 0.1·deal)`; signals derived from `activity_events`, kept in Redis.
- **Every search is recorded** in `search_events` (indefinite) [DECIDED]; email/phone patterns masked before storing.
- **SEO product pages** [DECIDED]: `/[locale]/urun/[slug]`, server-rendered; product, attributes, price history, "N satıcıda X TL'den başlayan" — seller-less; `noindex` with insufficient data. Help guides are indexed too.
- Targets: own index < 100 ms; live < 3 s (first 3–5 first); add end-to-end < 10 s.

---

## 11a. Image architecture

**Goals:** saving space, privacy, multiple images. **No binary data in the database** [DECIDED]; details in `database.md` §14b.

### Flow

```
Client ──(1) POST /uploads/presign {purpose, files}──▶ API
       ◀── presigned PUT URLs (quarantine bucket, 10 min, size/type locked)
Client ──(2) uploads directly to object storage (not through the API)
Client ──(3) POST /uploads/complete {batchId}──▶ API ──▶ queue: media-process
                                                              │
   media-process (worker):                                     ▼
   a. Real type check (magic bytes), size, max pixels, decode
   b. Strip EXIF/GPS and all metadata, fix orientation, convert to sRGB, HEIC → JPEG
   c. SHA-256 → if it already exists, link to the existing asset (de-duplication), delete quarantine copy
   d. Re-encode: master + variants (160/480/1080/1200 × AVIF/WebP/JPEG)
   e. Perceptual hash (pHash) → near-duplicate / matching signal
   f. User upload: OCR + LLM extraction → product/seller/price/date only;
      name, address, phone, order number STRIPPED
   g. Move to the target bucket (catalog | private), media_assets READY, SSE: upload.ready
```

### Rules [DECIDED]
| Topic | Rule |
|---|---|
| Space | Content-addressed single copy; no original kept; AVIF/WebP variants; ref_count 0 → cleanup; quarantine bucket with 24 h lifecycle |
| Privacy | All metadata stripped; user uploads in a **private bucket**, only signed short-lived links to the owner; order screenshots and identification photos **deleted after 24 h**; support-request screenshots after **30 days** (`support.attachment_retention_days`) [DECIDED 2026-11-13]; no personal data taken from images |
| Platform privacy | Store images copied to our storage and served at `/img/{sha256}/{variant}`; source URL not kept (hash only) |
| Multiple images | Up to 5 per request (setting), batch presign, parallel processing, order kept; one rejection does not stop the others; identification runs once all finish; a multi-product screenshot → bulk-add list |
| Limits | File ≤ 10 MB, ≤ 40 MP, daily per-user count (all settings); types JPEG/PNG/WebP/HEIC |
| Serving | Catalogue: CDN, `Cache-Control: immutable` (the URL derives from content and never changes); `<picture>` with AVIF → WebP → JPEG; size-appropriate variant (`srcset`) |
| Sending to the LLM | Only processed (metadata-stripped) images; provider must not retain data |
| Avatar | Separate kind; signed link or CDN according to privacy level; deleted with the account |
| Fraud | Upload count and rejection ratio are risk-rule signals |
| Admin | The Application Manager can view private uploads within their retention period (24 h, or 30 days for support screenshots) with a reason; every view audited |

---

## 12. Deal, return and notification flows

### 12.1 Deals
`deal-evaluate` for each active tracker: active, not outlier/suspended, new, same warranty, in-stock offers; **net price (price + shipping) < price paid** (in want mode ≤ target or a notable drop). No notification before the cheapest candidate is verified. A `deals` row opens; if it expires unused → `EXPIRED` → missed deal in My Savings.

### 12.2 Return window [DECIDED]
- Last day = rule start (`ORDER`/`DELIVERY`) + days; unknown delivery → order + average delivery → **estimated**; once the estimated day passes, "Teslim aldın mı?".
- No rule → default (14 days from delivery) + "not verified" note + missing-rule list for admins.
- Rule changes apply to new tracking only.
- Frequent-return warning from the user's own records.
- The `.ics` calendar file and ready price-difference message are produced in the `returns` module.

### 12.3 Notification channels and rules [DECIDED]
- Channels: `IN_APP`, `EMAIL` (v1); `PUSH` with mobile. `NotificationChannel` interface.
- **Email on by default for all types except** "Aradığın ürün ucuzladı" (`SEARCHED_PRODUCT_DROP`), whose e-mail is **off by default** [DECIDED 2026-11-13]; type × channel preferences. Legal nature [OPEN — later]; once decided the default changes via setting.
- Daily cap 5 (setting); return ≤ 2 days uncapped; when the cap is reached, lower priority goes to the next day / digest.
- Daily digest optional; urgent ones never wait.
- **Account and security notifications are mandatory:** independent of preferences, never capped or digested; in-app + email always.
- Texts come from **versioned templates in the DB** (Notification Templates), in the recipient's language; no seller variable, no full email/phone. The recipient address is decrypted only at send time (§22a).

### 12.4 Event → notification

| Event | Type |
|---|---|
| Verified cheaper offer | `DEAL_FOUND` |
| Notable drop in want mode | `PRICE_DROP` |
| Return ≤ 3 days | `DEADLINE_SOON` |
| Return ≤ 2 days without a deal | `RETURN_REMINDER` |
| Estimated delivery passed | `DELIVERY_PROMPT` |
| Target price | `TARGET_REACHED` |
| Back in stock | `BACK_IN_STOCK` |
| Tracking ending | `TRACKING_EXPIRING` |
| Saving recorded | `SAVING_RECORDED` |
| Price rose after reveal | `REVEAL_PRICE_UP` |
| Open deal ends: no cheaper offer remains (seller raised the price); the earlier deal notification is dimmed | `DEAL_ENDED` |
| Cheapest price of a recent search dropped (search not hidden, product not tracked; lowest priority, counts toward the daily cap) | `SEARCHED_PRODUCT_DROP` |
| Digest time slot reached for a user on the daily digest (job `digest`) | `DIGEST` |
| Report resolved | `REPORT_RESOLVED` |
| Package request outcome | `PACKAGE_REQUEST_RESULT` |
| Support reply | `SUPPORT_REPLY` |
| Legal text re-consent | `CONSENT_REQUIRED` |
| Sign-up / email / new device / password / sign-in method | `WELCOME`, `VERIFY_EMAIL`, `NEW_DEVICE_SIGNIN`, `PASSWORD_CHANGED`, `IDENTITY_LINKED` |
| Account deletion / suspension / data ready | `DELETION_*`, `ACCOUNT_SUSPENDED`, `ACCOUNT_UNSUSPENDED`, `DATA_EXPORT_READY` |
| Admin | `ADMIN_FRAUD_CASE`, `ADMIN_SOURCE_ALERT`, `ADMIN_BUDGET`, `ADMIN_PENDING_DIGEST`, `ADMIN_ROLE_CHANGED` |

---

## 13. Live updates (SSE)

`GET /api/v1/me/stream`; workers publish to Redis pub/sub `user:{id}`.

| Event | Client |
|---|---|
| `check.finished` | invalidate related queries, "az önce" |
| `deal.found` / `deal.closed` | home + list + detail |
| `reveal.expired` / `reveal.refunded` | return the offer row to hidden / update the allowance counter |
| `entitlement.changed` | remaining allowances (package approval, tokens) |
| `upload.ready` / `upload.rejected` | image processing result (identification continues) |
| `notification.new` | bell counter |
| `tracking.expired` | list |
| `admin.alert` | live alerts and pending work in /admin |

Event payloads contain no identity and no personal data.

---

## 14. Cache strategy

| Key | TTL | Content |
|---|---|---|
| `home:{userId}` | 60 s, cleared by events | Home |
| `offerref:{ref}` | 24 h | Opaque reference mapping |
| `entitlement:{userId}` | 5 min, cleared by events | Effective plan + remaining allowances + tokens |
| `checknow:daily:{userId}:{day}` | end of day | Daily check counter (DB is truth) |
| `check:recent:{productId}` | `check_now.cache_minutes` | Last check result |
| `restrictions:{userId}` | 5 min, cleared by events | Active user restrictions |
| `perm:{userId}` | 5 min, cleared by role changes | Resolved permission keys |
| `q:{query}` | 1–4 h | Search |
| `rank:signals:{userId}` | 1 h | Ranking |
| `robots:{platform}` | 24 h | robots.txt |
| `settings:{key}` / `plans` | 60 s | Settings, plan values |
| `templates:{type}:{channel}:{locale}` | 5 min | Active notification template |
| `content:{slug}:{locale}` | 5 min | Published legal/help version |
| `kpi:admin` | 1 h | Admin Overview |
| `ratelimit:*` | window | Endpoint and site limits |

Decrypted personal data is **never cached**.

---

## 15. API architecture

### 15.1 Request lifecycle
```
Rate limit → Session → Account state (suspended / pending deletion) → Authorisation (permission key)
 → Restriction gate (user_restrictions) → View-as-user session is read-only → Consent gate (re-consent legal text)
 → Idempotency → Controller (Zod) → Service → Repository → Response shaping (§6) + masking (§22a) → Output validation
 → Audit + activity interceptors (§18) → Exception filter
```
- **Authorisation without a session** [DECIDED 2026-11-13]: only endpoints on the explicit **public allow-list** pass; every other endpoint is refused without a session (sign-in required). Signed-in callers are checked by permission key on every endpoint, allow-listed or not.
- **Consent gate** [DECIDED]: if the user has not accepted a "consent required" version, tracking/write endpoints return `CONSENT_REQUIRED`; reading, data download and account deletion stay open.
- **Suspended users** cannot reach write endpoints.

### 15.2 Response envelope
```ts
{ data: T, meta?: { nextCursor?: string; total?: number; checkedAt?: string; entitlements?: EntitlementSummary } }
{ error: { code: string; messageKey: string; params?: Record<string, string|number>; fields?: Record<string, string> } }
```
Money `{ amount, currency }`; formatting on the client via `core`; error text translated on the client from the catalogue. Personal fields come as `emailMasked` / `phoneMasked`; full values only from dedicated endpoints.

### 15.3 Headers
Cookie `fg_session` (httpOnly, Secure, SameSite=Lax; mobile session storage decided with mobile technology) · `X-CSRF-Token` · `Accept-Language` · `X-Client-Platform` (`web`/`mobile`) · `Idempotency-Key` (confirm, reveal, check, end, package request, upload complete).

### 15.4 Versioning
`/api/v1`; OpenAPI from `contracts`.

---

## 16. API endpoint contract

Each page's data needs map to these endpoints in `pagedesign.md` §8.

> Every response with hidden offers uses the §6 views; personal fields are masked by default.

### AUTH (built last)
```
POST /auth/dev-login (non-prod) · POST /auth/register · POST /auth/login · POST /auth/google · POST /auth/apple
POST /auth/verify-email · POST /auth/password/forgot · POST /auth/password/reset
POST /auth/refresh · POST /auth/logout · POST /auth/logout-all
```

### ME
```
GET|PATCH /me                          # name, username, language, theme, privacy (email/phone masked)
GET|PUT   /me/notification-preferences # time slots, digest, type × channel
GET|PUT   /me/cookie-consent
GET       /me/entitlements             # plan, remaining reveal/tracking/checks, tokens
GET       /me/search-history?cursor=   # own searches; also feeds "Son aramaların" and SEARCHED_PRODUCT_DROP (hidden entries excluded)
POST      /me/search-history/:id/hide  # hide from list (record kept)
GET       /me/security                 # devices, recent sign-ins
DELETE    /me/devices/:id
POST      /me/reauth                   # re-authentication before sensitive actions
POST      /me/2fa/setup · POST /me/2fa/verify · GET /me/2fa/backup-codes   # mandatory for Application Manager accounts [DECIDED]
GET       /me/sessions · DELETE /me/sessions/:id · POST /auth/logout-all
GET       /me/admin-activity?q=&type=   # Application Manager: own audit entries (read-only)
GET       /me/pii                      # full email/phone (only after re-authentication)
PATCH     /me/email · PATCH /me/phone  # re-authentication + verification email/SMS
POST      /me/export
DELETE    /me                          # deletion, restorable for 30 days
POST      /me/restore                  # restore within the period (also automatic at sign-in)
GET       /me/stream                   # SSE
```

### IDENTIFY, SEARCH AND UPLOADS
```
GET  /search/autocomplete?q=        # own catalogue only: id, name, image variant, category, brand, generation, colours, bundles, store count; never price or store; ranked, paged for the scroll list
POST /uploads/presign            # { purpose, files:[{mime, bytes}] } → batchId + presigned URLs
POST /uploads/complete           # { batchId } → processing queue; result via SSE upload.ready
GET  /uploads/:id                # status, extraction (personal data stripped)
GET  /img/:sha256/:variant       # catalogue image (CDN)
POST /identify                   # { text?, uploadIds?, link? } → { understood, questions[], candidates[] | items[] }
POST /identify/:requestId/answer
GET  /products/:id · GET /products/:id/similar
```

### CONFIRM AND TRACKING
```
GET   /products/:id/confirm-context    # platforms, return suggestion, withdrawal warning
POST  /products/:id/seller-lookup      # { platformId, name } → exact match or none; rate-limited
POST  /products/:id/teaser             # { pricePaid, sellerRef } → hidden cheaper offers (HiddenOfferView); price in the body, never in the URL
POST  /tracked-items                   # BOUGHT | WANT; pricePaid from the user
GET   /tracked-items?filter=all|bought|want|deal|ended&sort=priority|deadline|saving&q=&category=&cursor=
GET   /tracked-items/summary
GET   /tracked-items/:id
PATCH /tracked-items/:id               # price paid, order status, last day, target
POST  /tracked-items/:id/delivered     # "Teslim aldın mı?" answer
POST  /tracked-items/:id/steps/:step   # { done: boolean } — Yaptım ✓
POST  /tracked-items/:id/end           # { method, refundForm?, reboughtPrice? } → saving
POST  /tracked-items/:id/extend
POST  /tracked-items/:id/bought
GET   /tracked-items/:id/offers
GET   /tracked-items/:id/price-history?range=14d|1m|3m|6m|1y|2y|all
GET   /tracked-items/:id/stock-history?range=
GET   /tracked-items/:id/calendar.ics
GET   /tracked-items/:id/price-difference-message?locale=
POST  /tracked-items/:id/check-now
POST  /tracked-items/check-now-bulk    # { trackedItemIds[] } → { willCheck, skippedCached, remaining }
```

### REVEAL AND OFFERS
```
POST /offers/:ref/reveal               # → RevealedOfferView | { allowed:false, reason, options }
POST /offers/:ref/hide
POST /offers/:ref/go                   # re-check → { url } | { gone|priceChanged, next }
POST /offers/:ref/notify-back-in-stock
```

### PACKAGES
```
GET  /plans                            # Free/Premium values (price hidden when empty)
POST /package-requests                 # { type: PREMIUM|TOKENS, days?, tokens?, note? }
GET  /package-requests/mine
GET  /me/token-ledger?cursor=
GET  /me/reveals?period=&q=&category=&group=product|event&cursor=   # "Nereye harcadın?": per product or per event; price_at_reveal + seller rank, never seller identity
```

### HOME, NOTIFICATIONS, SAVINGS, TRUST
```
GET  /home
GET  /notifications?type=&q=&category=&unread=&cursor= · PATCH /notifications/:id/read · POST /notifications/read-all · GET /notifications/unread-count
GET  /savings?period=&q=&category= · PATCH /savings/:id   # correction within 7 days (method incl. NOT_USED → missed deal)
POST /reports
```

### CONTENT AND SUPPORT (public reads)
```
GET  /content/:slug?locale=            # legal + help
GET  /content/consents/pending
POST /content/consents                 # { versionIds[] }
GET  /help/search?q=&topic=
GET  /help/stores?q=                  # store picker: logo, rule, source_state, read_at (public)
POST /content/:slug/feedback          # { helpful }
GET  /public/products/:slug            # SEO product page data (seller-less)
GET  /public/stats                     # landing aggregate figures + weekly showcase total (hidden below threshold)
GET  /public/deals?category=&limit=3   # deal showcase: anonymous examples of the last 7 days (no user/seller)
POST /support-requests · GET /support-requests/mine · POST /support-requests/:id/messages
GET  /products/:id/ratings              # aggregate across stores, seller-less
POST /tracked-items/:id/feedback        # two buyer questions
PATCH /tracked-items/:id/request        # request tracking: kind, outcome
```

### COMMUNITY (later slice)
```
POST|DELETE /follows/:userId · POST /follows/:userId/approve|decline
POST|DELETE /blocks/:userId
GET  /users/:username · GET /discover?tab=&q=&category=
POST /link-submissions · GET /me/link-submissions
PUT  /me/community-consents
```

### ADMIN (permission-keyed; Application Manager holds all)
```
GET            /admin/overview?period=
GET|POST|PATCH /admin/return-rules   # incl. POST /:id/lock|unlock, POST /:id/approve-pending
GET|POST|PATCH /admin/category-templates
GET|POST|PATCH /admin/campaigns · GET /admin/mass-drops
GET|PATCH      /admin/platforms · GET /admin/health
GET|PATCH      /admin/reports · POST /admin/offers/:id/suspend|unsuspend
GET|PATCH      /admin/settings · GET /admin/setting-changes · POST /admin/setting-changes/:id/rollback
GET|PATCH      /admin/budgets · GET /admin/usage
GET            /admin/users · GET /admin/users/:id · POST /admin/users/:id/suspend|unsuspend|revoke-sessions
POST           /admin/users/:id/pii-reveal         # { fields, reason } → time-limited full value; audited
GET|POST       /admin/users/:id/restrictions · DELETE /admin/restrictions/:id
GET            /admin/users/:id/linked             # accounts sharing device/IP digests
POST           /admin/users/:id/view-as            # read-only session [RECOMMENDED]
GET            /admin/audit-logs · GET /admin/audit-logs/export.csv
GET            /admin/history/prices?productId=&offerId=&sellerId=&from=&to=   # with seller names
GET            /admin/history/stock · GET /admin/history/products/:id/events
GET            /admin/history/searches?userId=&q=&noResults=&from=&to=
GET            /admin/history/activity?userId=&action=&deviceHash=&from=&to=
GET            /admin/history/*/export.csv
GET            /admin/risk/overview · GET /admin/risk/cases?status= · GET /admin/risk/cases/:id
POST           /admin/risk/cases/:id/decide        # dismiss · warn · restrict · suspend
GET|PATCH      /admin/risk/rules
GET|PATCH      /admin/roles · GET /admin/permissions · POST /admin/users/:id/roles · DELETE /admin/users/:id/roles/:roleId
GET|POST       /admin/notification-templates · POST /admin/notification-templates/:id/publish|test
GET|POST       /admin/catalog/products · POST /admin/catalog/merge|split|relink · POST /admin/catalog/log/:id/revert
GET|PATCH      /admin/plans · GET|PATCH /admin/package-requests · POST /admin/users/:id/grant-tokens|grant-premium|revoke
GET|POST       /admin/content · POST /admin/content/:id/publish
GET|PATCH      /admin/support-requests · POST /admin/support-requests/:id/reply|forward
GET|POST       /admin/link-submissions (later slice)
```

---

## 17. Identity, account and consents

- **Order:** last [DECIDED]; `/auth/dev-login` in development, absent from production builds.
- **Methods:** Google and Apple at the top of the screen [DECIDED], email + password below; the same verified email links to one account (blind-index match).
- **Session:** short-lived session + rotating refresh in httpOnly Secure cookies; `sessions` hashed; new device → `NEW_DEVICE_SIGNIN`.
- **Guest** [DECIDED]: search and mark allowed; sign-in at confirmation, then continue (`anon_id` → `user_id`).
- **At sign-up:** KVKK notice + terms consent (`user_consents`); welcome tokens (`token_ledger WELCOME`, once, held if fraud signals) [DECIDED]; `WELCOME` + `VERIFY_EMAIL`.
- **Account deletion** [DECIDED]: closes immediately (tracking, checks, notifications stop), restorable by sign-in within 30 days, then `account-purge` removes personal data while histories remain anonymous.
- **Suspension:** by the Application Manager with a reason; suspended users can read but not write.
- **Sensitive actions** (view full email/phone, change email/phone/password): re-authentication within `pii.reauth_minutes` [RECOMMENDED].

---

## 18. Roles, access, histories and fraud

### 18.1 Roles and permissions [DECIDED]
- **Two roles:** `APP_MANAGER` (Application Manager) and `USER`. Guest is not a role and has no data representation: guest-reachable endpoints are an **explicit public allow-list in the API** [DECIDED 2026-11-13].
- Built as data: `roles`, `permissions`, `role_permissions`, `user_roles`. Code checks **permission keys**; new roles (support, moderator…) are added as data only.
- The **Application Manager** holds every permission and **sees and manages everything on web and mobile**; the role cannot be deleted; at least one always remains.
- **Page and action authorisation:** every screen and endpoint is bound to a permission key (`modules.md` access matrix; catalogue in `database.md` §4 [DECIDED 2026-11-13]). Web: Next.js middleware + server component checks; mobile calls the same API; **the final decision is always in the API**.
- **User data:** service ownership check + PostgreSQL RLS (`app.user_id`); the Application Manager reads through a separate DB role (`app_admin`), every access audited.
- **View-as-user** [RECOMMENDED]: read-only via `admin_view_sessions`; write endpoints closed in that session.

### 18.2 Critical settings [DECIDED]
The Application Manager **applies critical settings alone** (preview + confirmation; no second approval). `setting_changes` keeps every change; **one-click rollback**. The second-approval mechanism stays in the schema: if a role without the critical permission is added, its changes go to the Application Manager for approval.

### 18.3 Audit log and activity history
| Record | Scope | Retention |
|---|---|---|
| `audit_logs` | Application Manager actions and views (personal data, hidden seller, view-as-user, PII reveal), critical user actions | Indefinite, immutable |
| `activity_events` | **Every user action** (web and mobile): sign-in, search, upload, add, confirm, reveal, go to store, check, report, share, request, settings | Indefinite [DECIDED] |
| `search_events` | All searches (users + guests), filters, results, picks | Indefinite [DECIDED] |
| `product_events`, `price_history`, `stock_history` | Product, price and stock history | Indefinite [DECIDED] |

- Captured in the API interceptor, written **asynchronously** (`activity-ingest`) — no effect on request time.
- Device and IP only as **salted hashes**; on account deletion the salt changes and the link breaks.
- Monitoring: the **History Explorer** admin module (price/stock/product/search/activity tabs, CSV) — every view audited.
- Volume: hypertables + compression; date range required in queries; cold storage later.

### 18.4 Fraud monitoring [DECIDED]
```
activity_events / reports / link_submissions / package_requests / uploads
        │
        ▼
 risk-evaluate (rules: risk_rules, parameterised)
        │  signal
        ▼
 risk_signals ──▶ risk_scores (0–100, Low/Medium/High)
                        │ above threshold
                        ▼
                  risk_cases ──▶ Application Manager notification
                        │ decision
                        ▼
            user_restrictions / users.status (suspended)
```
- Starting rules [RECOMMENDED]: multiple accounts (same device/IP digest), reveal burst (reveal without going to the store), automation/scraping, check allowance abuse, fake/targeted reports, link spam and reward farming, repeated package requests, savings inflation, frequent returns, upload abuse.
- **Automatic action limit** [RECOMMENDED]: only flag, rate-limit, hold rewards/welcome tokens. Restriction and suspension only by Application Manager decision.
- Restrictions are enforced as an API gate; the user gets a neutral message, no rule details.
- Rules, thresholds and weights are critical settings; audited.

---

## 19. Internationalisation (i18n)

- `tr` (default), `en` [DECIDED]. URLs `/tr/...`, `/en/...`; path segments translated (`/tr/takip` ↔ `/en/tracking`).
- **Locale resolution [DECIDED]**, first match wins: (1) locale in the URL → (2) signed-in user's `users.locale` → (3) `fg_locale` cookie (guests) → (4) `Accept-Language` (`tr*` → `tr`, `en*` → `en`, anything else → `tr`) → (5) `i18n.default_locale` (`tr`). The root `/` redirects to the resolved locale. A guest's choice is stored in `fg_locale` and copied to `users.locale` at sign-up; changing the language in Settings updates both. Implemented in Next.js middleware; the API reads the same order from `Accept-Language` + session.
- **Supported locales are data:** `i18n.locales` / `i18n.default_locale` (`database.md` §18). Translatable admin data is stored as locale-keyed `jsonb` (`tr` and `en` required); adding a language needs a setting change, translation files and translations of admin data — no schema change.
- Notifications and searches record the `locale` used (`notifications.locale`, `search_events.locale`).
- **UI texts:** file-based catalogue (`packages/i18n`), typed keys, a missing key breaks the build; shared by web and mobile.
- **Exception [DECIDED]:** **notification/email templates and legal/help content live in the DB, versioned**, edited in the panel; TR and EN required for each. TR is legally binding for legal texts.
- Store data is not translated; category/attribute names via template translations.
- Formats via `Intl`; LLM output in the user's language.

---

## 20. Design system integration

- `design-tokens.json` is the single source [DECIDED]; `packages/tokens` produces CSS variables + Tailwind theme + contrast checks, plus platform-neutral JSON for mobile.
- The hard-coded value lint rule breaks the build. Active theme in `system_settings.theme.active` (critical).
- Pattern components: the canonical list is `pagedesign.md` §5 [DECIDED 2026-11-13]; `packages/ui` uses exactly those names. The server-side `RevealGate` interface (§6.3) is not a UI component; its UI is `HiddenOfferCard`.
- **Patterns to add** (first to `product_design_pattern.md`): remaining-allowance indicator · step tick ("Yaptım ✓") · dimmed pre-tracking history · "tahmini" last day · fake-discount note · buy-or-wait hint · contextual help panel · consent dialog (legal) · masked field + time-limited "Göster" · multi-image upload (per-file progress and rejection) · image privacy note.
- Screen designs follow `modules.md` Appendix E as visual drafts.

---

## 21. Web and mobile applications

### 21.1 Web route structure

```
apps/web/app/[locale]/
├── (public)/
│   ├── page.tsx                  # Landing Page (signed out) — Home when signed in
│   ├── urun/[slug]/page.tsx      # SEO product page
│   ├── yardim/page.tsx · yardim/[slug]/page.tsx
│   ├── yardim/iletisim/page.tsx  # Bize yaz + Taleplerim (`pagedesign.md` §8.11)
│   ├── u/[username]/page.tsx     # another user's profile — later slice
│   └── kvkk · kosullar · cerezler · komisyon
├── (app)/
│   ├── ara/page.tsx              # Search and Add (guests too)
│   ├── takip/page.tsx            # Tracked Items
│   ├── takip/[id]/page.tsx       # Product Detail
│   ├── bildirimler/page.tsx
│   ├── kazancim/page.tsx
│   ├── paketim/page.tsx
│   ├── ayarlar/[section]/page.tsx # Settings and Account — one URL per section (`/ayarlar/{section}`)
│   ├── kesfet/page.tsx           # later slice
│   └── profil/page.tsx           # Profilim (own profile) — later slice
├── (auth)/
│   ├── giris/page.tsx            # sign-in / sign-up tabs
│   ├── sifre-sifirla/page.tsx    # password reset
│   └── dogrula/page.tsx          # e-mail verification [ASSUMPTION]
└── admin/                        # permission-gated; Admin Overview + all admin screens (history, fraud, roles included)
```

### 21.2 Mobile [technology OPEN]
Every user and admin screen in the access matrix also exists on mobile [DECIDED]; same API, same permission keys, same `contracts`/`core`/`i18n`/`tokens` packages. The push channel is added with mobile. Technology and infrastructure to be decided separately.

### 21.3 Data flow
Server components stream the first view, TanStack Query takes over; actions update optimistically; SSE invalidates queries; every screen draws the five states; all calls through the typed client generated from `contracts`.

### 21.4 Performance
LCP < 2.5 s · INP < 200 ms · CLS < 0.1 · API p95 < 300 ms · JS bundle budget in the build.

---

## 22. Security

| Topic | Measure |
|---|---|
| Session | httpOnly Secure SameSite cookies, CSRF, revocation; new-device notification |
| Headers | Strict CSP, HSTS, `nosniff`, `strict-origin-when-cross-origin`, `frame-ancestors 'none'` |
| Input | Zod at the boundary |
| Store text and user links | Untrusted data; never rendered as HTML; passed to the LLM as data |
| SSRF | Outbound requests only to `platforms.domain` + provider allow-list; user links limited to allow-listed domains |
| Authorisation | Server check on every endpoint + RLS + separate admin DB role |
| Hidden seller | View schemas, `v_offer_public`, leak test |
| Personal data | §22a |
| Secrets | Secret manager + KMS; key scan of client bundles |
| Images | Real type check, pixel limit, metadata stripping, private bucket, short-lived signed links, quarantine |
| Rate limiting | Reveal, check, report, sign-in, support, package request and upload endpoints additionally limited; WAF + bot protection |
| Fraud | Activity history + risk rules + restriction gate; salted device/IP hashes; stated in the KVKK notice |
| Admin power | Every Application Manager action in the immutable audit log; assigning/revoking an Application Manager notifies all Application Managers |
| Data | Encrypted in transit and at rest |
| Supply chain | Continuous dependency scanning; OWASP ASVS + penetration test before launch |

---

## 22a. Personal-data protection and masking

Details in `database.md` §14c.

| Layer | Rule [DECIDED] |
|---|---|
| **Password** | Argon2id + pepper (in the secret manager); never in any response, log, audit record or export; on change all sessions revoked + notification |
| **Tokens** | Session, refresh, verification and reset tokens stored as hashes only; single-use and time-limited |
| **Email / phone** | Application-level AES-256-GCM (envelope encryption, KMS, key version) + blind index with a separate key (sign-in, uniqueness, exact-match search). Database and backups hold ciphertext only |
| **Who decrypts** | Only the `pii` service: email sending (in the worker, at send time), the user's own full data (after re-authentication), the admin's time-limited reveal |
| **Masking** | API responses carry masked fields by default (`emailMasked`, `phoneMasked`); full values via a separate endpoint and permission. Masking is a single `core` function (web and mobile alike) |
| **Application Manager** | Masked by default; `admin.users.view_pii` + reason + 10-minute window; every reveal audited (`pii_reveal`) |
| **Logs and error tracking** | Structured log redaction: `password`, `token`, `authorization`, `cookie`, `email`, `phone` fields and email/phone patterns → `[gizlendi]`; request bodies and headers scrubbed in error tracking |
| **URLs** | Personal data never in paths or query strings |
| **Free text** | Email/phone patterns in search, notes and support messages masked in the record |
| **Images** | No personal data taken from order screenshots; image deleted after 24 h (§11a) |
| **Activity history** | IP/device only as salted hashes, user-agent family instead of raw; salt changes on account deletion |
| **Exports** | Admin CSVs masked; the user's own KVKK export full and only to themselves |
| **Analytics** | No personal data sent to third-party analytics; subject to cookie consent |
| **Test** | **Personal-data leak test** (CI): all endpoint responses, logs and notification outputs scanned for plain email/phone patterns; any match breaks the build |

---

## 23. Observability and cost

- **Traces:** OpenTelemetry — one trace from source call to notification.
- **Metrics:** site success/latency, parser fallbacks, queue depth, stuck jobs, deal and action rates, reveal counts, upload/processing times, risk case counts, SSE connections.
- **Alerts** (`alerts`, panel + email, no repeat until the state changes) [DECIDED]: circuit breaker, success rate, parser fallback, budget 80%/100%, stale/missing return rules, high-risk fraud case.
- **Cost:** every external call in `api_usage`; provider budget and saving mode (§8.5); storage and image processing cost tracked; cost per active user on Admin Overview.
- Logs and traces carry no personal data (redaction, §22a).

---

## 24. CI/CD and hosting

```
push → lint (tokens + i18n + hard-coded values) → typecheck → unit tests (core, sources)
     → integration tests (API + Postgres/Timescale + Redis + object storage emulator)
     → hidden-seller leak test (endpoints + SEO pages + notification outputs) → personal-data leak test (responses + logs + notifications)
     → data isolation test (second user) → permission matrix test (every endpoint × role, allowed and denied)
     → build (web, api, worker) → migration check → deploy
```

| App | Deployment |
|---|---|
| web | Container, behind CDN |
| api | Container, horizontal scaling |
| worker | Separate container(s), scaled per queue type (media and risk separately) |
| Postgres | Managed (Timescale + pgvector support) |
| Redis, Meilisearch | Managed or container |
| Object storage + CDN | Managed; buckets `catalog` (public via CDN), `private`, `quarantine` (24 h lifecycle) |
| KMS / secret manager | Managed |

Environments `dev` → `staging` → `prod`; no production without backups + a **tested restore** (including KMS key recovery).

**Development providers [DECIDED 2026-11-13]:** until hosting is chosen, every external provider runs as a local implementation behind its interface:

| Interface | Local implementation |
|---|---|
| Object storage | S3-compatible emulator (`catalog`, `private`, `quarantine` buckets) |
| KMS / envelope encryption | Local key (development only; never used outside `dev`) |
| Email (`NotificationChannel` `EMAIL`) | Console sink (messages written to the log, recipient masked) |
| LLM + embeddings | **None** — the interface exists, no implementation is wired; LLM steps are unavailable in `dev` |

Hosting provider, LLM provider and transactional email provider are **[OPEN]**; code depends only on the interfaces.

---

## 25. Build order and first vertical slice

Same as `modules.md` Appendix A and `CLAUDE.md` › Stages (4) [DECIDED 2026-11-13].

| Order | Scope |
|---|---|
| 1 | **First vertical slice:** Search and Add (text + link + image upload) → confirm → tracking + `check_schedules` → scheduled check (SerpApi + at least one store adapter) → merge + history → verified deal (`deals`) → hidden seller (leak test included) → Göster/Gizle (`FreeToggleGate`) → outbound. With dev login; **permission checks, activity capture and personal-data encryption from day one**. |
| 2 | Product Detail + Want to Buy (mode of Product Detail) + Price and Stock History + Return Window + Check Now + Trust and Accuracy (user side) |
| 3 | Tracked Items |
| 4 | Notifications and Preferences (incl. account/security) |
| 5 | Home |
| 6 | My Savings |
| 7 | Packages and Premium (`EntitlementGate`) |
| 8 | Landing Page (+ SEO product page) |
| 9 | Legal Pages + Help and FAQ |
| 10 | Settings and Account |
| 11 | Sign-in and Sign-up |
| 12 | Discover and Community + Profile and Following |
| 13 | Admin modules (incl. History Explorer, Fraud Monitoring, Roles and Permissions) |

First slice approval: [DECIDED 2026-11-13 — A2].

---

## 26. Open decisions and risks

### Closed in this version
Roles (Application Manager + User) · web/mobile screen coverage · indefinite histories · Application Manager applies critical settings alone · image architecture · personal-data encryption and masking · A1 technology stack · A3 platform name hidden before reveal · all sellers hidden in want mode · R1 seller entry (no seller list, exact-match lookup, price paid from the user) · launch categories · follow model · package model and defaults · A2 first vertical slice and build order (2026-11-13) · permission catalogue and guest public allow-list (2026-11-13).

### Open
| # | Topic |
|---|---|
| — | Show more expensive sellers by name? (spec §17-7) |
| — | Legal nature of email (decide later) |
| — | Premium/token prices, tiered tokens, payment provider (decide later) |
| — | Critical settings list approval |
| — | Fraud rule list and automatic action limit approval |
| — | View-as-user (read-only) approval |
| — | Re-authentication for own email/phone approval |
| — | Indefinite history + search-history hiding ↔ KVKK right to erasure (legal opinion) |
| — | Discover sharing reward (interim) |
| — | Mobile technology and infrastructure |
| — | Hosting provider (§24) |
| — | LLM provider (§2; none wired in development) |
| — | Transactional email provider (§2; console sink in development) |
| — | Screen designs (`modules.md` Appendix E) |

### Risks
| # | Risk | Mitigation |
|---|---|---|
| R2 | Image URLs might reveal the platform | Served from our own storage by content hash |
| R3 | SerpApi cost grows at scale | Weight on site searches, list pages, saving mode, cheaper SERP provider benchmark |
| R4 | Stores blocking access | Circuit breaker + two sources; no evasion |
| R5 | Deal frequency not validated | 2-week validation test before code |
| R6 | Prisma limits with Timescale/pgvector | Raw SQL migrations + typed raw queries |
| R7 | Shipping/delivery data missing in some sources | "kargo hariç" when unknown; complete during page verification |
| R8 | Indefinite history volume and cost | Compression, summary tables, cold storage; cost watched on Provider Usage and Cost |
| R9 | Multi-product image reading accuracy | Each product marked → confirmed separately; questions on low confidence |
| R10 | False positives in fraud rules | Only light automatic actions; suspension is a human decision; thresholds/weights adjustable |
| R11 | No partial search on encrypted fields | Admin search by full email (blind index) or name/username |
| R12 | KMS key loss / leak | Redundant keys, rotation procedure (`pii-rekey`), recovery test; blind-index key separate |
| R13 | Image processing cost | De-duplication, configurable variant count, lazy variant generation option |

---

*When a decision changes, this document is updated together with `product_spect.md`, `product_design_pattern.md`, `engineering_checklist.md`, `design-tokens.json`, `modules.md` and `database.md`; the documents must not contradict each other.*
