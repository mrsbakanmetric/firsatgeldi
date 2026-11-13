# FırsatGeldi — Implementation Plan

> **Status:** Stage 0 — user answers to §5 received 2026-11-13 and applied; waiting for PR approval · **Last updated:** 2026-11-13 · **Owner:** implementation side (Claude Code)
> **Sources:** `architecture.md` (§2, §9, §15, §16, §21, §24, §25), `modules.md`, `database.md`, `pagedesign.md` §8, `engineering_checklist.md`, `product_spect.md`, `screen_status.md`, `CLAUDE.md` (incl. Core rules 1–10).

This plan describes **how and in which order** the product is built. It decides nothing about the product: every item marked [OPEN], [DECIDE LATER], [RECOMMENDED], [ASSUMPTION] or [INTERIM] in the specs stays open until the user decides it. Items this plan introduces itself are marked **[PROPOSAL]** and need approval like any other change.

**Labels used here:** [PROPOSAL] = introduced by this plan, needs approval · **[USER 2026-11-13]** = answered by the user on PR #4 (see §5); written into the affected docs only in separate `spec` PRs, not in this one · **Gate** = the point where work stops for the user's approval.

---

## Contents
1. [Monorepo skeleton and package boundaries](#1-monorepo-skeleton-and-package-boundaries)
2. [Stages 1–4: outputs and approval gates](#2-stages-14-outputs-and-approval-gates)
3. [Screens: endpoints, tables, UI components, permission keys](#3-screens-endpoints-tables-ui-components-permission-keys)
4. [Contradictions between documents](#4-contradictions-between-documents)
5. [Answers to the Stage 0 questions](#5-answers-to-the-stage-0-questions)

---

## 1. Monorepo skeleton and package boundaries

Source: `architecture.md` §2 (pnpm workspaces + Turborepo [DECIDED]), §3, §4, §21.1.

```
firsatgeldi/
├── apps/
│   ├── web/        Next.js (App Router), TypeScript strict — user app, /[locale]/admin, landing/SEO/legal/help
│   ├── api/        NestJS (Fastify) + Zod + OpenAPI — the only HTTP API (web and mobile)
│   └── worker/     BullMQ workers + scheduled jobs — separate process, no HTTP
│   # mobile/       [OPEN] — not created
├── packages/
│   ├── core/       pure business rules (no framework)
│   ├── contracts/  Zod schemas, OpenAPI, shared types, typed API client
│   ├── db/         Prisma schema, raw SQL migrations, seed
│   ├── sources/    SerpApi + store adapters, page verifier, link resolver, allow-list
│   ├── tokens/     design-tokens.json → CSS variables, Tailwind theme, contrast check, neutral JSON
│   ├── i18n/       tr/en catalogues, typed keys, missing-key check
│   ├── ui/         pattern components (React), built only from tokens
│   └── config/     env schema, ESLint rules (hard-coded values, i18n), tsconfig bases
├── infra/          [PROPOSAL] local docker compose: PostgreSQL+TimescaleDB+pgvector, Redis, Meilisearch, S3 emulator
└── .github/workflows/  CI (architecture §24)
```

### 1.1 Dependency rules (enforced by lint, not by convention)

| Package | May depend on | Must not |
|---|---|---|
| `core` | nothing (only TS standard library) | import any framework, I/O or other package |
| `contracts` | `core` (types), `zod` | import `db`, Nest, Next or React |
| `config` | — | contain runtime code used by apps beyond env parsing |
| `tokens` | — (reads `docs/design-tokens.json` at build time) | contain hand-written colour or size values |
| `i18n` | — | contain business values |
| `ui` | `tokens`, `i18n`, `core` (formatting) | call the API, read seller identity, hard-code values |
| `sources` | `core`, `contracts` | write to the DB (returns `RawOffer`/`VerifiedOffer`; the worker writes) |
| `db` | — | contain business rules (repositories live in the apps) |
| `apps/api` | `core`, `contracts`, `db`, `config`, `i18n` (error keys) | call external sources (exception: single click verification with timeout, §2 rule) |
| `apps/worker` | `core`, `contracts`, `db`, `sources`, `config` | serve HTTP |
| `apps/web` | `core`, `contracts` (typed client), `ui`, `tokens`, `i18n`, `config` | import `db` or `sources`; know hidden seller identity |

- `core` and `contracts` are framework-free so the future mobile client can reuse them (§2).
- The mobile client is not created; nothing in `core`/`contracts` may assume the web.

### 1.2 Inside `apps/api`
One Nest module per area as listed in `architecture.md` §2 (identify, catalog, search, tracking, offers, reveal, entitlements, history, checks, deals, savings, returns, home, notifications, community, reports, content, support, affiliate, auth, users, permissions, roles, settings, audit, activity, history-admin, risk, media, pii, admin). Internal pattern `controller → service → repository → dto`; shared `common/response-shaping`, `common/audit`, `common/activity`. A module is created when the first screen that needs it is built, not before.

### 1.3 Request lifecycle (built once in Stage 3, used by every endpoint)
Rate limit → session → account state → **permission key guard** → restriction gate → view-as-user read-only → consent gate → idempotency → Zod input → service → repository → response shaping (`HiddenOfferView` / `RevealedOfferView`) + masking → output validation → audit + activity interceptors → exception filter (`architecture.md` §15.1).

---

## 2. Stages 1–4: outputs and approval gates

Each stage ends with a **Gate**: work stops, the user reviews, nothing of the next stage starts before approval (`CLAUDE.md` › Stages). Every stage is delivered in small PRs (one change = one branch = one PR).

### Stage 0 — Implementation plan (this document)
- **Output:** `docs/implementation_plan.md` on `spec/implementation-plan`, `spec` PR.
- **Gate:** the user approves the plan. Answers to §5 received 2026-11-13.
- **Follow-up `spec` PRs after approval (not in this PR):** (1) write the §5 decisions into the affected docs; (2) fix the §4 contradictions, one PR per group (§4.1 … §4.6).

### Stage 1 — Data test
**Goal:** know, before building, which source really gives which field and how reliably (`product_spect.md` §17-8a [DECIDED 2026-11-13]; `architecture.md` §26 R4, R7).

| Item | Content |
|---|---|
| Sample | ~20 products × 5 stores; electronics and clothing (launch categories); products chosen from the spec's live tests (e.g. Insta360 Ace Pro 2, Dyson V15) plus clothing with and without brand/model code |
| Stores [USER 2026-11-13] | Trendyol, Hepsiburada, Amazon TR, MediaMarkt, Teknosa (the five named in `product_spect.md` §6.1) |
| Sources | SerpApi Google Shopping (`engine=google_shopping`, `gl=tr`, `hl=tr`, Istanbul) **and** each store's site search **and** the product page (JSON-LD → site JSON → HTML; no LLM in the test) |
| Fields measured | seller (owner of the offer), seller name, seller rating + count, product rating + count (+ distribution), stock state, campaign note, **installments**, shipping cost, delivery time, warranty type, claimed old price, return-policy page readability |
| Per field | found yes/no per store × source, extraction path used, agreement between sources, read time |
| Politeness | robots.txt respected, ~1–2 req/s per site, identifiable User-Agent, no store accounts, stop on 403/429/captcha (`architecture.md` §8.3) |
| Code | [PROPOSAL] written as the first production pieces of `packages/sources` (`DiscoverySource`, `SiteSearchAdapter`, `ProductPageVerifier` interfaces + adapters with unit tests on recorded fixtures) and a CLI runner; no throwaway code |
| Cost | SerpApi queries counted; expected well under one Starter plan month (≈ 20 products × a few queries) |

- **Output:** (1) `feat/sources-data-test` PR — workspace root + `packages/config` + `packages/sources` (adapters, fixtures, tests, CLI); (2) `docs/data_test_report.md` in a `spec` PR — table per store × field × source with reliability, gaps, and what each gap means for the screens (e.g. installment note not shown for a store that does not expose it).
- **Needs from the user:** the user puts the SerpApi key into the local `.env` themself [USER 2026-11-13]; it is never committed (`.env.example` holds only the variable name).
- **Not in Stage 1:** the 2-week deal-frequency validation (`product_spect.md` §17-8, `architecture.md` R5) is a **separate task after Stage 1** [USER 2026-11-13].
- **Gate:** the user reads the report and decides which stores/fields go into v1; affected docs are updated in a separate `spec` PR.

### Stage 2 — Open decisions and [ASSUMPTION] review
- **Output:** `docs/open_decisions.md` [PROPOSAL] in a `spec` PR — **a list only**: every [OPEN], [DECIDE LATER], [RECOMMENDED], [ASSUMPTION], [INTERIM] item across `docs/`, one row each: id · item · file + section · current default · which screen/stage it blocks · options as written in the docs. Plus the contradictions in §4 that were not fixed in Stage 0.
- **Not done in this stage:** no item is decided or changed by the implementation side.
- **Gate:** the user decides; decisions are written into the affected docs together (one `spec` PR per topic). Items the user leaves open stay labelled and are built as the docs say (e.g. `FreeToggleGate`), never guessed.

### Stage 3 — Infrastructure
Delivered as separate PRs, in this order; each PR is green in CI before the next starts.

| # | PR | Content | Done when |
|---|---|---|---|
| 3a | `chore/monorepo-skeleton` | pnpm workspace, Turborepo pipeline, `packages/config` (env schema with Zod, tsconfig strict bases, ESLint + Prettier), dependency-boundary lint (§1.1), `.env.example`, `infra/` docker compose | `pnpm install && pnpm build && pnpm lint` pass on a clean clone |
| 3b | `feat/tokens` | `packages/tokens`: `design-tokens.json` → CSS variables (light/dark, `theme.active`), Tailwind theme, platform-neutral JSON, contrast check (AA) as a test; lint rule that fails on literal colours/sizes in `apps/web` and `packages/ui` | contrast test and hard-coded-value lint run in CI |
| 3c | `feat/i18n` | `packages/i18n`: tr/en catalogues, typed keys, missing-key check fails the build; locale resolution order (`architecture.md` §19) as a pure function in `core` | missing key breaks CI |
| 3d | `feat/db-schema` | `packages/db`: full schema of `database.md` (all tables, CHECKs, indexes, partial uniques); raw SQL migrations for hypertables, continuous aggregates, pgvector index, `v_offer_public`, RLS policies, `app_admin` role, `audit_logs` INSERT-only privileges; seed: roles, permission catalogue (§3, approved as the catalogue [USER 2026-11-13]), plans, all `system_settings` defaults of §18, launch categories (electronics + clothing open), generic category template, platforms | migrations apply and roll forward on a clean DB; migration check in CI |
| 3e | `feat/api-core` | `apps/api` skeleton with the request lifecycle (§1.3): rate limit, session (`fg_session` cookie), **dev login** (absent from production builds), permission-key guard + `perm:{userId}` cache, **explicit public allow-list** for guest endpoints (no `GUEST` role or access level [USER 2026-11-13]; an endpoint not on the list requires a session), restriction and consent gates, idempotency, response envelope, output validation, response shaping base, `pii` service (envelope encryption behind a KMS interface, blind index, masking in `core`), log redaction, audit + activity interceptors → `activity-ingest` queue, OpenAPI generation, typed client into `contracts` | permission-matrix and second-user test harnesses run on the first endpoints (`GET /me`, `GET /me/entitlements`) |
| 3f | `feat/worker-core` | `apps/worker` skeleton: BullMQ queues, idempotent job base, `schedule-tick` frame, `activity-ingest`, `health`, `alerts` writing, OpenTelemetry | jobs retried without duplicate rows (test) |
| 3g | `feat/web-shell` | `apps/web`: `/[locale]` routing + locale middleware, `AppShell`, `AuthShell`, `AdminShell` (sub-navigation only after the admin review — see §4), five page templates, base primitives in `packages/ui` (button, input, dialog, sheet, skeleton, status banner, empty/error state), theme switch, typed API client + TanStack Query + SSE hook | shell renders tr/en, light/dark, phone and desktop widths; no hard-coded value |
| 3h | `chore/ci` | GitHub Actions per `architecture.md` §24: lint → typecheck → unit → integration (Postgres/Timescale/pgvector, Redis, Meilisearch, S3 emulator services) → hidden-seller leak test → personal-data leak test → data-isolation test → permission-matrix test → build (web, api, worker) → migration check; dependency scan; secret scan of client bundles | all jobs required on `main` |

- **Development providers [USER 2026-11-13]:** until hosting is chosen, every external provider runs as a local emulator behind its interface: S3 emulator (object storage), local KMS key (envelope encryption), console e-mail sink (`NotificationChannel`), **no LLM** (the LLM interface exists, no implementation is wired).
- **Providers still [OPEN]:** LLM provider and transactional e-mail provider — not chosen now; code depends only on the interfaces.
- **Not in Stage 3:** deploy/hosting (provider [OPEN] in the docs), real sign-in (built last, `architecture.md` §17), any screen.
- **Gate:** the user approves the infrastructure before the first screen.

### Stage 4 — Screens
Order from `CLAUDE.md` [USER 2026-11-13] (`modules.md` Appendix A and `architecture.md` §25 are aligned to it in a later `spec` PR, §4 C1): **Search and Add → Product Detail → Tracked Items → Notifications and Preferences → Home → My Savings → others → Application Manager screens.** For "others" this plan uses the order of `modules.md` Appendix A: Packages and Premium → Landing Page + SEO product page → Legal Pages + Help and FAQ → Settings and Account → Sign-in and Sign-up → Discover and Profile. Want to Buy mode is built **with Product Detail** [USER 2026-11-13] (§4 C2).

Per screen:
1. **Precondition (Core rule 8):** the screen's PNG boards are in `design/<NN-screen>/` **and** its row in `screen_status.md` is ✅. Without both, the page is not built — no exception, no building from a canvas link. Stop and tell the user.
2. Branch `feat/<module>`; build **API + worker jobs + web + tests** for the screen as one vertical slice; split into several PRs when a slice is large (API first, then web), never mixing spec and code.
3. Pass `engineering_checklist.md` (Definition of Done) including the leak, isolation and permission-matrix tests for every new endpoint, **plus** the per-screen items below.
4. Update `docs/build_status.md` (Built, Design version implemented, Last PR) in the code PR.
5. **Gate:** stop after each screen for approval.

**Per-screen Definition of Done additions (Core rules 3, 4, 9)** — a screen is not done until all three hold:

| Rule | Done when |
|---|---|
| 3 · Multi-language | Every string comes from the i18n catalogue (tr default, en second); missing-key check passes; unit, integration and UI tests run in **both `tr` and `en`** (formatting of money, dates and plurals included); no hard-coded text. |
| 4 · Multi-platform | Business rules live in `core`, contracts in `contracts`, strings in `i18n`, values in `tokens` — all **platform-independent** (no DOM, Next or React imports; lint-enforced, §1.1); every endpoint is usable by web, Android and iOS clients alike (same API, same server-side permission checks, no web-only cookie assumptions in the contract); the web UI is checked at phone and desktop widths. The mobile app itself is not built. |
| 9 · Log everything | Every user, system and admin action of the screen writes its record — `activity_events`, `audit_logs` (admin and sensitive actions, before/after), entity events (`tracked_item_events`, `product_events`, …) per `database.md` §14, §14a; tests assert the record (who, what, when, before/after) for each action. No action ships without its logging. |

**Screen 1 carries the first vertical slice** (`architecture.md` §25, A2 — approved [USER 2026-11-13]): the background price engine (sources, merge, schedule, verify, deal evaluation), `FreeToggleGate` and the outbound link are built here, because Search and Add's teaser already shows hidden cheaper offers with Göster.

---

## 3. Screens: endpoints, tables, UI components, permission keys

**Permission keys.** `database.md` §4 gives only examples; there is no complete catalogue in `docs/`. The keys below follow the examples' pattern `<area>.<scope>.<action>` (scope `own` = the user's own data). The user approved them as the **official permission catalogue** [USER 2026-11-13]; they are written into `database.md` §4 and `modules.md` in a separate `spec` PR. Guest-reachable endpoints are marked *(guest)*: they form the API's **explicit public allow-list** — there is no `GUEST` role or access level [USER 2026-11-13]. Keys marked *(guest)* are listed for completeness of the catalogue; the allow-list, not a role, grants guest access.

Endpoints are from `architecture.md` §16 unless noted; tables from `database.md` §19; components from `pagedesign.md` §5 and `modules.md` › Shared Rules.

### 3.1 Search and Add — `/[locale]/ara` (`pagedesign.md` §8.2) + first vertical slice

| | |
|---|---|
| **Endpoints** | `GET /search/autocomplete` *(guest)* · `POST /uploads/presign` *(guest)* · `POST /uploads/complete` *(guest)* · `GET /uploads/:id` · `GET /img/:sha256/:variant` *(guest)* · `POST /identify` *(guest)* · `POST /identify/:requestId/answer` *(guest)* · `GET /products/:id` *(guest)* · `GET /products/:id/similar` *(guest)* · `GET /products/:id/confirm-context` · `POST /products/:id/seller-lookup` · `POST /products/:id/teaser` · `POST /tracked-items` · `POST /offers/:ref/reveal` · `POST /offers/:ref/hide` · `POST /offers/:ref/go` · `GET /me/stream` (`upload.ready`, `upload.rejected`) · `POST /auth/dev-login` (non-prod) |
| **Worker jobs** | `identify`, `link-resolve`, `media-process`, `media-cleanup`, `image-ingest`, `index`, `schedule-tick`, `discovery`, `site-search:{platform}`, `merge`, `verify`, `deal-evaluate`, `product-event`, `activity-ingest`, `reveal-expiry`, `reveal-watch`, `budget-guard` |
| **Tables** | `identify_requests`, `uploads`, `media_assets`, `media_variants`, `product_images`, `products`, `product_attributes`, `product_aliases`, `categories`, `category_templates`, `platforms`, `sellers`, `offers` (via `v_offer_public`), `platform_return_rules`, `tracked_items`, `tracked_item_events`, `check_schedules`, `checks`, `price_history`, `stock_history`, `product_cheapest_hourly`, `deals`, `offer_reveals`, `affiliate_clicks`, `search_events`, `activity_events`, `product_events`, `api_usage`, `provider_budgets`, `alerts`, `seller_trust` (read; tile fallback to store rating) |
| **UI components** | `AppShell` · `PageTemplate` (Flow) · `SearchField` (combobox + listbox, 3 image tiles, scroll list, preview) · `MultiImageUpload` · `ImagePrivacyNote` · `AttributeChip` with value list · `ProductImage` · candidate card ("Hangisi seninki?") · `StepIndicator` · confirm panel (`MarkConfirm` / `ConfirmPanel`) · `FactTile` ×3 · `SegmentedChoice` (order status) · `MoneyDisplay` · `FreshnessLine` · `HiddenOfferCard` + `RevealGate` (teaser) · `Flag` · `StatusBanner` · `SkeletonBlock` · `EmptyState` · `ErrorState` |
| **Permission keys** | `catalog.view` *(guest)* · `search.use` *(guest)* · `identify.use` *(guest)* · `upload.own.create` *(guest)* · `tracking.own.write` · `reveal.own.use` · `offer.own.go` · `admin.offers.view_hidden_seller` (Application Manager, gate `ADMIN`) |

### 3.2 Product Detail — `/[locale]/takip/[id]` (`pagedesign.md` §8.3) incl. Want to Buy mode, Hidden Seller, Price and Stock History, Return Window, Check Now, Ratings and Seller Trust, Trust and Accuracy

| | |
|---|---|
| **Endpoints** | `GET /tracked-items/:id` · `GET /tracked-items/:id/offers` · `GET /tracked-items/:id/price-history?range=` · `GET /tracked-items/:id/stock-history?range=` · `GET /tracked-items/:id/calendar.ics` · `GET /tracked-items/:id/price-difference-message?locale=` · `PATCH /tracked-items/:id` · `POST /tracked-items/:id/delivered` · `POST /tracked-items/:id/steps/:step` · `PATCH /tracked-items/:id/request` · `POST /tracked-items/:id/end` · `POST /tracked-items/:id/extend` · `POST /tracked-items/:id/bought` · `POST /tracked-items/:id/check-now` · `POST /tracked-items/:id/feedback` · `POST /offers/:ref/reveal` · `POST /offers/:ref/hide` · `POST /offers/:ref/go` · `POST /offers/:ref/notify-back-in-stock` · `GET /products/:id/ratings` · `POST /reports` · `GET /me/entitlements` (allowance slot) · `GET /me/stream` (`check.finished`, `deal.*`, `reveal.*`) |
| **Worker jobs** | `verify`, `deal-evaluate`, `reveal-watch`, `reveal-expiry`, `report-threshold`, `return-policy-reader`, `seller-trust`, `campaign-reader`, `expiry`, `delivery-prompt` (prompt state; notification sent from 3.4) |
| **Tables** | `tracked_items` (+ request columns), `tracked_item_events`, `deals`, `offers`, `sellers`, `offer_reveals`, `price_history`, `stock_history`, `product_cheapest_hourly`, `checks`, `check_now_usage`, `savings_records`, `buyer_feedback`, `seller_trust`, `reports`, `affiliate_clicks`, `campaigns`, `platform_return_rules`, `categories` |
| **UI components** | `PageTemplate` (Detail) · `ProductImage` · `Flag` / `ModeBadge` · `DealHero` · `PriceHistory` (full: ranges, "Aldın", deal point, dimmed pre-tracking, lowest by rank, target line in want mode) · buy-or-wait hint · `HiddenOfferCard` + `RevealGate` + one-line offer summary (trust · installments · campaign) · fake-discount note · `StockHistory` (14 days + 1 month) · step tick ("Yaptım ✓") · request tracking block · price-difference message (copy) · "tahmini" last day · `AllowanceIndicator` · contextual help panel · end-tracking dialog · buyer questions · report dialog · `FreshnessLine` · `StatusBanner` · `SkeletonBlock` |
| **Permission keys** | `tracking.own.view` · `tracking.own.write` · `reveal.own.use` · `offer.own.go` · `checknow.own.use` · `report.own.create` · `savings.own.write` (end tracking) · `feedback.own.write` · admin: `admin.tracking.view` · `admin.offers.view_hidden_seller` |

### 3.3 Tracked Items — `/[locale]/takip` (`pagedesign.md` §8.4) + Add product dialog

| | |
|---|---|
| **Endpoints** | `GET /tracked-items?filter=&sort=&q=&category=&cursor=` · `GET /tracked-items/summary` · `POST /tracked-items/check-now-bulk` · dialog reuses 3.1 (`/search/autocomplete`, `/identify`, `/products/:id/confirm-context`, `/seller-lookup`, `/teaser`, `POST /tracked-items`) · `GET /me/entitlements` · `GET /me/stream` |
| **Tables** | `tracked_items`, `deals`, `check_now_usage`, `checks`, `product_cheapest_hourly`, `stock_history`, `categories`, `savings_records` (ended rows) |
| **UI components** | `PageTemplate` (List) · `StatTile` ×4 · `SearchField` · `CategoryFilter` · `FilterChips` (with counts) · `SortSelect` · `AllowanceMeter` (bulk check) · `ProductRow` · `PriceSparkline` · `StockStrip` · dimmed ended section · `Dialog` (1120 + 360 aside) · `StepIndicator` · confirm panel (from 3.1) · `EmptyState` · `StatusBanner` · `SkeletonBlock` |
| **Permission keys** | `tracking.own.view` · `tracking.own.write` · `checknow.own.use` · admin: `admin.tracking.view` |

### 3.4 Notifications and Preferences — `/[locale]/bildirimler` + bell panel (`pagedesign.md` §8.5)

| | |
|---|---|
| **Endpoints** | `GET /notifications?type=&q=&category=&unread=&cursor=` · `PATCH /notifications/:id/read` · `POST /notifications/read-all` · `GET /notifications/unread-count` · `GET\|PUT /me/notification-preferences` · `GET /me/search-history` ("Senin için") · `POST /tracked-items/:id/delivered` (answer inside the notification) · "Takip et" dialog step 2 reuses 3.1/3.3 · `GET /me/stream` (`notification.new`) |
| **Worker jobs** | `notify` (preferences, quiet hours, daily cap, digest routing, mandatory types), `digest`, `return-reminder`, `delivery-prompt`, `expiry`, email channel behind `NotificationChannel` (provider [OPEN]) |
| **Tables** | `notifications`, `notification_deliveries`, `notification_digests`, `notification_preferences`, `notification_type_preferences`, `notification_templates` (seeded TR + EN, no seller variable), `search_events` |
| **UI components** | `PageTemplate` (List + right column) · `NotificationItem` · `NotificationPreview` (560, left of panel) · bell panel (`Sheet` 440) · `ModeBadge` · `ProductImage` (80 / 52) · `FilterChips` · `SearchField` · `CategoryFilter` · `PriceSparkline` · fact tiles · `Dialog` (Takip et step 2) · `StatusBanner` (digest on, cap reached, live connection lost) |
| **Preferences UI** | [PROPOSAL] the **Ayarlar › Bildirimler** section is built in this step inside the Settings template (only this section); the other Settings sections come with 3.10. Preferences are edited only there (`modules.md` › Notifications and Preferences). |
| **Permission keys** | `notifications.own.view` · `notifications.own.write` (read state) · `notification_prefs.own.write` · admin: `admin.notifications.receive` (admin notification types) |

### 3.5 Home — `/[locale]` signed in (`pagedesign.md` §8.1)

| | |
|---|---|
| **Endpoints** | `GET /home` · `GET /search/autocomplete` · `POST /offers/:ref/reveal\|hide` · `POST /tracked-items/:id/check-now` · `GET /me/stream` |
| **Tables** | `tracked_items`, `deals`, `offers` (via `v_offer_public`), `product_cheapest_hourly`, `stock_history`, `check_schedules`, `offer_reveals`; cache `home:{userId}` |
| **UI components** | `PageTemplate` (Summary) · summary line · `SearchField` with inline 3-tile area (pushes content) · `HeroBlock` / Hemen Gözat (image 120, flags, two aligned columns: `PriceHistory` compact | up to 3 `HiddenOfferCard`) · return reminder strip · `ProductRow` (image 56, emphasised border for the second urgent item) · new-user three steps · `StatusBanner` · `SkeletonBlock` |
| **Permission keys** | `home.own.view` · `search.use` · `reveal.own.use` · `checknow.own.use` · admin: `admin.users.view_as` (view-as-user, [RECOMMENDED]) |

### 3.6 My Savings — `/[locale]/kazancim` (`pagedesign.md` §8.6)

| | |
|---|---|
| **Endpoints** | `GET /savings?period=&q=&category=` · `PATCH /savings/:id` · `POST /tracked-items/:id/feedback` (two questions per record) |
| **Tables** | `savings_records`, `deals` (missed = `EXPIRED`), `buyer_feedback`, `tracked_items`, `tracked_item_events`, `audit_logs` (corrections) |
| **UI components** | `PageTemplate` (Summary) · `PeriodSelect` · `HeroBlock` (`hero-line`, monthly bar chart, in-house SVG) · method tiles ×3 · `ProductRow` · `SearchField` · `CategoryFilter` · missed-deals list · "Kaydı düzelt" `Sheet` · right column cards · `EmptyState` |
| **Permission keys** | `savings.own.view` · `savings.own.write` · `feedback.own.write` · admin: `admin.savings.view` |

### 3.7 Packages and Premium — `/[locale]/paketim` (`pagedesign.md` §8.7)

| | |
|---|---|
| **Endpoints** | `GET /me/entitlements` · `GET /plans` · `GET /me/reveals?period=&q=&category=&group=` · `GET /me/token-ledger` · `POST /package-requests` · `GET /package-requests/mine` · `EntitlementGate` replaces `FreeToggleGate` in `POST /offers/:ref/reveal` (switch is [DECIDED]; when it happens follows this screen) |
| **Worker jobs** | `token-reconcile`, `reveal-watch` refund path |
| **Tables** | `plans`, `user_subscriptions`, `token_ledger`, `package_requests`, `offer_reveals`, `check_now_usage`, `tracked_items` (slot count) |
| **UI components** | `PageTemplate` (Summary) · plan badge · `AllowanceMeter` ×4 · comparison table · reveal-order steps · "Nereye harcadın?" (tabs, expandable rows) · request `Dialog` · `StatusBanner` |
| **Permission keys** | `packages.own.view` · `packages.own.request` · `reveal.own.use` |

### 3.8 Landing Page + SEO product page — `/[locale]` signed out, `/[locale]/urun/[slug]` (`pagedesign.md` §8.10)

| | |
|---|---|
| **Endpoints** | `GET /public/stats` *(guest)* · `GET /public/deals?category=&limit=3` *(guest)* · `GET /public/products/:slug` *(guest)* · `GET /search/autocomplete` *(guest)* |
| **Tables** | `products` (`slug`, `seo_indexable`), `product_images`, `product_cheapest_hourly`, `offers` (seller-less path), `deals`, `savings_records`, `admin_kpi_hourly` (aggregates) |
| **UI components** | guest `AppShell` · `HeroBlock` (display h1) · figure tiles · how-it-works steps · deal showcase (§5.31, `sparkle`, reduced motion) · rights cards · CTA band · product page: `ProductImage` 400 + thumbnails, rank-only seller rows with guest Göster → sign-in, `PriceHistory` seller-less (30 d / 90 d / 1 y), similar-products strip, FAQ + structured data |
| **Permission keys** | `public.view` *(guest)* · `catalog.view` *(guest)* |

### 3.9 Legal Pages + Help and FAQ — `/kvkk`, `/kosullar`, `/cerezler`, `/komisyon`, `/yardim…` (`pagedesign.md` §8.11)

| | |
|---|---|
| **Endpoints** | `GET /content/:slug?locale=` *(guest)* · `GET /content/consents/pending` · `POST /content/consents` · `GET /help/search` *(guest)* · `GET /help/stores` *(guest)* · `POST /content/:slug/feedback` *(guest)* · `POST /support-requests` *(guest)* · `GET /support-requests/mine` · `POST /support-requests/:id/messages` · `GET\|PUT /me/cookie-consent` *(guest via `anon_id`)* |
| **Tables** | `content_documents`, `content_versions`, `content_feedback`, `user_consents`, `cookie_consents`, `support_requests`, `support_messages`, `uploads` (attachments), `platforms`, `platform_return_rules` |
| **UI components** | Detail with document menu · store tile + logo tile (§5.33) · rule card · article layout · Bize yaz form (Flow) · Taleplerim (List) · cookie bar · cookie preferences `Dialog` · re-consent `Dialog` · contextual help `Sheet` (400) |
| **Permission keys** | `content.view` *(guest)* · `support.own.create` *(guest)* · `support.own.view` · `consent.own.write` |

### 3.10 Settings and Account — `/[locale]/ayarlar/{section}` (`pagedesign.md` §8.9)

| | |
|---|---|
| **Endpoints** | `GET\|PATCH /me` · `POST /me/reauth` · `GET /me/pii` · `PATCH /me/email` · `PATCH /me/phone` · `GET /me/security` · `GET /me/sessions` · `DELETE /me/sessions/:id` · `DELETE /me/devices/:id` · `POST /auth/logout-all` · `GET /me/search-history` · `POST /me/search-history/:id/hide` · `GET\|PUT /me/cookie-consent` · `POST /me/export` · `DELETE /me` · `POST /me/restore` · `POST /me/2fa/setup` · `POST /me/2fa/verify` · `GET /me/2fa/backup-codes` · `GET /me/admin-activity` |
| **Worker jobs** | `account-purge`, data export job, `new-device-notify`, `pii-rekey` (manual) |
| **Tables** | `users`, `sessions`, `user_devices`, `cookie_consents`, `search_events` (own, hide), `email_tokens`, `user_backup_codes`, `audit_logs` (own admin activity) |
| **UI components** | `PageTemplate` (Settings) · section menu · masked field + time-limited "Göster" (§5.18) · re-authenticate `Dialog` · delete-account `Dialog` · switches with "Kaydedildi" · `ProductRow` (search history) |
| **Permission keys** | `account.own.view` · `account.own.write` · `account.own.view_pii` · `account.own.export` · `account.own.delete` · `search_history.own.hide` · admin: `admin.self.activity.view` · `admin.self.permissions.view` |

### 3.11 Sign-in and Sign-up — `/[locale]/giris` (`pagedesign.md` §8.8) — built last

| | |
|---|---|
| **Endpoints** | `POST /auth/register` · `POST /auth/login` · `POST /auth/google` · `POST /auth/apple` · `POST /auth/verify-email` · `POST /auth/password/forgot` · `POST /auth/password/reset` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/logout-all` · `POST /me/restore`; `/auth/dev-login` removed from production builds |
| **Tables** | `users`, `auth_identities`, `sessions`, `email_tokens`, `user_devices`, `user_consents`, `token_ledger` (`WELCOME`), `identify_requests` (`anon_id` → `user_id` hand-back) |
| **UI components** | `AuthShell` · `PageTemplate` (Flow) · `HeroBlock` · guest hand-back card · tabs · provider buttons (official brand guidelines) · password field with live rules · `StatusBanner` (lockout countdown, suspended, pending deletion) |
| **Permission keys** | `auth.use` *(guest; signed-out only)* — every signed-up user gets role `USER` |

### 3.12 Discover and Profile — `/[locale]/kesfet`, `/[locale]/u/[username]`, `/[locale]/profil` (`pagedesign.md` §8.12) — later slice

| | |
|---|---|
| **Endpoints** | `GET /discover?tab=&q=&category=` · `GET /users/:username` · `POST\|DELETE /follows/:userId` · `POST /follows/:userId/approve\|decline` · `POST\|DELETE /blocks/:userId` · `POST /link-submissions` · `GET /me/link-submissions` · `PUT /me/community-consents` · `POST /reports` (kind `PROFILE`) |
| **Worker jobs** | `link-resolve` (Discover links), `verify`, `merge` (verified link → hidden-seller offer), `risk-evaluate` (link spam) |
| **Tables** | `follows`, `blocks`, `community_consents`, `link_submissions`, `user_badges`, `token_ledger` (`SHARE_REWARD`), `reports` |
| **UI components** | List with aside 360 · tabs · person row + follow button (§5.34) · deal cards · `HiddenOfferCard` · consent `Dialog` · link-share `Dialog` · profile header |
| **Permission keys** | `community.view` · `community.own.write` · `follows.own.write` · `blocks.own.write` · `link.own.submit` · `report.own.create` · admin: `admin.community.moderate` |

### 3.13 Application Manager screens — `/[locale]/admin/…` (`pagedesign.md` §8.13; review pending in `screen_status.md`)

All endpoints from `architecture.md` §16 › ADMIN. Shell: `AdminShell`; template: List with 380 px detail panel (§5.35 [RECOMMENDED]). Every view and action audited.

| Canvas | Module | Main tables | Permission keys |
|---|---|---|---|
| 12a | Admin Overview | `admin_kpi_hourly`, `alerts` | `admin.overview.view` |
| 12a | Return Rules | `platform_return_rules` | `admin.return_rules.view` · `admin.return_rules.manage` |
| 12a | Platforms and Source Health | `platforms`, `platform_health_hourly`, `alerts` | `admin.platforms.view` · `admin.platforms.manage` |
| 12b | Users | `users`, `sessions`, `user_restrictions`, `admin_view_sessions` | `admin.users.view` · `admin.users.view_pii` · `admin.users.suspend` · `admin.users.restrict` · `admin.users.view_as` |
| 12b | Roles and Permissions | `roles`, `permissions`, `role_permissions`, `user_roles` | `admin.roles.view` · `admin.roles.manage` |
| 12b | Audit Log | `audit_logs` | `admin.audit.view` · `admin.audit.export` |
| 12c | Catalogue and Products | `products`, `product_aliases`, `product_images`, `product_merge_log` | `admin.catalog.view` · `admin.catalog.manage` |
| 12c | Category Templates | `category_templates`, `categories` | `admin.category_templates.manage` |
| 12c | Reports and Match Corrections | `reports`, `offers` | `admin.reports.manage` · `admin.offers.suspend` |
| 12c | Campaign Calendar | `campaigns`, `mass_drop_events` | `admin.campaigns.manage` |
| 12d | Package Settings and Requests | `plans`, `package_requests`, `user_subscriptions`, `token_ledger` | `admin.packages.view` · `admin.packages.manage` · `admin.packages.grant` |
| 12d | Support Requests | `support_requests`, `support_messages` | `admin.support.manage` |
| 12d | Legal and Content | `content_documents`, `content_versions`, `content_feedback` | `admin.content.edit` · `admin.content.publish` |
| 12d | Notification Templates | `notification_templates` | `admin.notification_templates.manage` |
| 12e | System Settings | `system_settings`, `setting_changes` | `admin.settings.view` · `admin.settings.apply` · `admin.settings.apply_critical` |
| 12e | Provider Usage and Cost | `api_usage`, `provider_budgets` | `admin.usage.view` · `admin.budgets.manage` |
| 12e | History Explorer | `price_history`, `stock_history`, `product_events`, `search_events`, `activity_events` | `admin.history.view` · `admin.history.export` |
| 12e | Fraud Monitoring | `risk_rules`, `risk_signals`, `risk_scores`, `risk_cases`, `user_restrictions` | `admin.fraud.view` · `admin.fraud.manage` |
| all | Hidden seller in any admin view | `offers`, `sellers` | `admin.offers.view_hidden_seller` |

Worker jobs used here: `kpi-rollup`, `rule-staleness`, `campaign-yearly-copy`, `mass-drop-detect`, `risk-evaluate`, `risk-decay`, `admin-digest`.

---

## 4. Contradictions between documents

Found while writing this plan. **None is fixed here** (this PR adds only the plan). The user approved fixing them [USER 2026-11-13]: after approval, each group (§4.1 … §4.6) is fixed in its own `spec` PR, all affected docs together. C1, C2, C13 and C14 are decided (see §5); the others are wording/contract alignments.

### 4.1 Build order and process

| # | Contradiction | Where |
|---|---|---|
| C1 | Screen order differs: `CLAUDE.md` › Stages builds Tracked Items and Notifications **before** Home, and My Savings after Home; Appendix A / §25 build Home + Tracked Items together (3), Notifications + My Savings together (4). `CLAUDE.md` says "on conflict, `docs/` wins". | `CLAUDE.md` › Stages (4) · `modules.md` Appendix A · `architecture.md` §25 |
| C2 | Want to Buy is in build step 5 (with Packages), but its screen is a mode of Product Detail (approved 2026-11-13), which is screen 2. | `modules.md` Appendix A row 5 · `modules.md` › Want to Buy · `screen_status.md` §2.2 (2) |
| C3 | Stage 3 lists "auth + permissions" as infrastructure, while sign-in is built last; this plan reads it as permission framework + dev login in Stage 3, real sign-in at screen 3.11. | `CLAUDE.md` › Stages (3) · `architecture.md` §17 · `modules.md` › Sign-in and Sign-up |
| C4 | Definition of Done item 7 requires the screen's row in `screen_status.md` to be current, but `screen_status.md` is owned by the design side; the implementation side owns `build_status.md`. | `engineering_checklist.md` › Definition of Done (7) · `CLAUDE.md` › Ownership |

### 4.2 API contract

| # | Contradiction | Where |
|---|---|---|
| C5 | Uploads: `POST /uploads` vs `POST /uploads/presign` + `POST /uploads/complete`. | `modules.md` › Search and Add › API · `architecture.md` §11a, §16 |
| C6 | Price-history ranges: `14d\|1m\|3m\|6m\|1y` vs `…\|2y\|all` (2 years / Tümü [DECIDED 2026-11-12]). | `architecture.md` §16 › CONFIRM AND TRACKING · `modules.md` › Price and Stock History |
| C7 | Packages: `GET /me/plan` and `GET /package-requests` vs `GET /me/entitlements`, `GET /plans`, `GET /package-requests/mine`. | `modules.md` › Packages and Premium › API · `architecture.md` §16 › PACKAGES · `pagedesign.md` §8.7 |
| C8 | Return Window endpoint `GET /platforms/:id/return-policy` does not exist in the contract. | `modules.md` › Return Window › API · `architecture.md` §16 |
| C9 | Community: `POST /link-submissions` listed twice; `PUT /me/community-consents` and `PUT /me/community-consent` both listed. | `architecture.md` §16 › COMMUNITY · `modules.md` › Discover and Community · `pagedesign.md` §8.12 |
| C10 | Notification types `DEAL_ENDED`, `SEARCHED_PRODUCT_DROP` and `DIGEST` exist in the schema and modules but not in the event → notification table. | `database.md` §10 `notification_templates.type` · `modules.md` › Notifications and Preferences · `architecture.md` §12.4 |

### 4.3 Routes

| # | Contradiction | Where |
|---|---|---|
| C11 | Profile routes: `profil/[username]` vs `/[locale]/u/[username]` (other user) + `/[locale]/profil` (Profilim). | `architecture.md` §21.1 · `modules.md` › Profile and Following · `pagedesign.md` §8.12 |
| C12 | Settings: single `ayarlar/page.tsx` vs one URL per section `/ayarlar/{section}`; route tree also lacks `/sifre-sifirla`, `/dogrula` [ASSUMPTION], `/yardim/iletisim`, `/u/...`, `/profil`. | `architecture.md` §21.1 · `modules.md` › Settings and Account, Sign-in and Sign-up · `pagedesign.md` §3.5, §8.11 |

### 4.4 Rules and defaults

| # | Contradiction | Where |
|---|---|---|
| C13 | Email default: "email on by default for **all** types" vs "Aradığın ürün ucuzladı" e-mail **off by default**. **Decided [USER 2026-11-13]:** "Aradığın ürün ucuzladı" e-mail is **off by default**; the other types stay as documented. | `architecture.md` §12.3 · `database.md` §3 `notification_type_preferences` · `modules.md` › Settings and Account › Screen · `engineering_checklist.md` › Notifications |
| C14 | Upload retention: user uploads deleted after 24 h vs support screenshots kept 30 days [ASSUMPTION] (`uploads.purpose` includes `SUPPORT_ATTACHMENT`). **Decided [USER 2026-11-13]:** support screenshots are kept **30 days**; the 24 h rule applies only to **order screenshots** and **identification photos**. | `agent_rules.md` › Security Rules · `engineering_checklist.md` › Images · `modules.md` › Help and FAQ · `database.md` §18 `support.attachment_retention_days` |
| C15 | Provider budget described as "critical setting, **second approval**" vs Application Manager applies critical settings alone (no second approval) [DECIDED]. | `modules.md` › Provider Usage and Cost · `modules.md` › System Settings · `architecture.md` §18.2 |
| C16 | Home interest picker: "optionally an interest picker" vs "no interest picker [DECIDED]". | `product_spect.md` §5.1, §9.4 · `modules.md` › Home › States |
| C17 | 2FA: "optional 2FA … later" vs two-step verification **mandatory** for Application Manager accounts [DECIDED]. | `product_spect.md` §3.1 · `architecture.md` §16 › ME · `modules.md` › Settings and Account · `engineering_checklist.md` › Frontend › General |
| C18 | Notification list retention: "older than 30 days are deleted from the list" vs notifications kept indefinitely; no parameter key for the 30 days. | `modules.md` › Notifications and Preferences · `database.md` §16, §18 |
| C19 | Admin modules heading says "roles OPEN" while roles are [DECIDED]. | `modules.md` › Contents · `modules.md` › Roles, platforms and access |

### 4.5 Parameter keys and schema

| # | Contradiction | Where |
|---|---|---|
| C20 | Setting key names differ: `check.cache_minutes` vs `check_now.cache_minutes`; `notifications.daily_cap` vs `notify.daily_cap`; `account.restore_days` vs `account.deletion_restore_days`. | `engineering_checklist.md` › Check Now, Notifications, Auth · `database.md` §18 |
| C21 | Correcting a record to "Fırsatı kullanmadım" sets the deal to `EXPIRED` "with reason `NOT_USED`", but `deals` has no reason column. | `database.md` §8 (`deals`, note under `tracked_items` additions) |
| C22 | Tables/columns used in text but missing from the domain map or table definitions: `buyer_feedback`, `seller_trust`, `content_feedback`, `blocks` (not in §2 map); `users.totp_secret_enc`, `users.totp_enabled_at`, `user_backup_codes` (only in §9 prose, not in §3 `users`). | `database.md` §2, §3, §8, §9, §12, §13 |
| C23 | Values without a parameter key (would be hard-coded): Tracked Items stale threshold 6 h [ASSUMPTION]; notification list retention 30 days; History Explorer max range 12 months [ASSUMPTION]. | `modules.md` › Tracked Items › States · `modules.md` › Notifications and Preferences · `screen_status.md` §2.2 (12) · `product_spect.md` §17-14 · `database.md` §18 |

### 4.6 Components

| # | Contradiction | Where |
|---|---|---|
| C24 | Two different shared-component lists: `StatusFlag`, `MoneyDisplay`, `RevealGate`, `MarkConfirm`, `SegmentedChoice`, `FreshnessLine`, `AllowanceIndicator` vs `Flag`/`ModeBadge`, `HiddenOfferCard`, `AllowanceMeter`, `FactTile`, `ProductRow`, `StatTile`, `PriceSparkline`, `StockStrip`. `packages/ui` needs one canonical name list. | `modules.md` › Shared Rules (components) · `architecture.md` §20 · `pagedesign.md` §5 |
| C25 | Shared Rules numbering repeats 10 and 11 (two different rules each). | `modules.md` › Shared Rules |

---

## 5. Answers to the Stage 0 questions

Answered by the user on PR #4, 2026-11-13. They are applied in this plan; writing them into the other docs happens in separate `spec` PRs (§2 Stage 0).

| # | Topic | Answer [USER 2026-11-13] |
|---|---|---|
| 1 | Screen order and first slice | `CLAUDE.md` order. Want to Buy mode is built with Product Detail. First vertical slice A2 approved. |
| 2 | Permission catalogue | The §3 keys become the official catalogue. Guests: explicit public allow-list in the API; no `GUEST` role or access level. |
| 3 | Stage 1 data test | Stores: Trendyol, Hepsiburada, Amazon TR, MediaMarkt, Teknosa. The user puts the SerpApi key into the local `.env`. The 2-week deal-frequency test is a separate task after Stage 1. |
| 4 | Development providers | Local emulators until hosting is chosen (S3 emulator, local KMS key, console e-mail, no LLM). LLM and e-mail providers are not chosen now: behind interfaces, [OPEN]. |
| 5 | Contradictions | C13: "Aradığın ürün ucuzladı" e-mail off by default. C14: support screenshots 30 days; 24 h only for order screenshots and identification photos. All other §4 items: fixed in separate `spec` PRs grouped as in §4. |

**Also added from `CLAUDE.md` Core rules (user request on PR #4):**
- Core rule 8 — the canvas-link exception is removed from the Stage 4 precondition: no PNG + ✅ → the page is not built (§2 Stage 4, step 1).
- Core rules 3, 4, 9 — tr/en tests, web + Android + iOS compatibility (platform-independent shared packages) and logging of every action are explicit per-screen Definition of Done items (§2 Stage 4).
