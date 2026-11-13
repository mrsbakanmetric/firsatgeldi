# FırsatGeldi — Implementation Plan

> **Status:** Phase 1 — steps 1, 3, 4 and 5 done (#16, #20, #21, #22); step 6 (theme) in progress (#24); next: step 7 (i18n) · **Last updated:** 2026-11-13 · **Owner:** implementation side (Claude Code)
> **Sources:** `CLAUDE.md` (The plan and the daily flow, Phases), `architecture.md` (§2, §3, §6, §15, §16, §19–§21, §24, §25), `pagedesign.md` (§2–§5, §7, §8), `product_design_pattern.md`, `engineering_checklist.md`, `screen_status.md`, `modules.md` Appendix A.

**This is the single project plan.** Every working day follows it, one step at a time (`CLAUDE.md` › The plan and the daily flow):

1. "session aç" → read the Progress tables → propose the **next ⬜ step**.
2. The user approves → only that step → one PR → stop.
3. The user merges → the step is marked ✅ with PR and date (in the next PR or the session-close PR).
4. "session kapat" → Progress tables and `docs/session_log.md` are up to date.

The Progress tables are **kept current after every step**. The order of steps changes only with the user's approval, in its own `spec` PR. This plan decides nothing about the product: items marked [OPEN], [DECIDE LATER], [RECOMMENDED], [ASSUMPTION] or [INTERIM] in the specs stay open. Items this plan introduces are marked **[PROPOSAL]** and need approval like any other change.

Legend: ⬜ not started · 🛠 in progress · ✅ done · ⏸ waiting (blocked by a precondition)

---

## Contents
1. [Progress](#1-progress)
2. [Why each step is in its phase](#2-why-each-step-is-in-its-phase)
3. [Phase 1 — steps in detail](#3-phase-1--steps-in-detail)
4. [Mock API](#4-mock-api)
5. [Sample data (fixtures) rules](#5-sample-data-fixtures-rules)
6. [Today's target](#6-todays-target)
7. [Phase 2 and Phase 3 — steps in detail](#7-phase-2-and-phase-3--steps-in-detail)
8. [Component names](#8-component-names)
- [Appendix A — Data test details](#appendix-a--data-test-details)
- [Appendix B — Screen data needs](#appendix-b--screen-data-needs)

---

## 1. Progress

### Phase 1 — System setup and screens with sample data

**Exit criterion:** one command starts the app on `localhost`; every approved (✅) screen works in Turkish and English, light and dark, phone and desktop width.

| # | Step | Delivers | Status | PR | Date |
|---|---|---|---|---|---|
| 1 | Plan update | This three-phase plan (no code) | ✅ | #16 | 2026-11-13 |
| 2 | Screen PNGs before each screen | Rule step: before each screen step, that screen's PNGs are in `design/`; before step 8, the "0 İskelet ve Bileşenler" PNGs | ⬜ (recurring) | — | — |
| 3 | Monorepo skeleton | Building empty workspace; one command starts the web app | ✅ | #20 | 2026-11-13 |
| 4 | Basic CI | Lint, typecheck and unit tests on every PR | ✅ | #21 | 2026-11-13 |
| 5 | Tokens | `design-tokens.json` in code + platform-neutral JSON; contrast test | ✅ | #22 | 2026-11-13 |
| 6 | Theme | CSS variables, Tailwind preset, light/dark, hard-coded-value lint | 🛠 | #24 | 2026-11-13 |
| 7 | i18n | Turkish/English catalogues, `/tr` and `/en` routes, money/date formats | ⬜ | — | — |
| 8 | App shell | `AppShell`, `AuthShell`, `AdminShell`, page templates, overlays, base components | ⬜ | — | — |
| 9 | Mock API and fixtures | In-browser mock server, sample data from the designs, hidden-seller rule | ⬜ | — | — |
| 10 | Search and Add | Screen as designed, on mock data | ⬜ | — | — |
| 11 | Product Detail | Screen incl. Want to Buy mode | ⬜ | — | — |
| 12 | Tracked Items | List + Add product dialog | ⬜ | — | — |
| 13 | Notifications and Preferences | Page, bell panel, notification preferences | ⬜ | — | — |
| 14 | Home | Screen | ⬜ | — | — |
| 15 | My Savings | Screen | ⬜ | — | — |
| 16 | Packages and Premium | Screen | ⬜ | — | — |
| 17 | Landing Page + SEO product page | Both pages | ⬜ | — | — |
| 18 | Legal Pages + Help and FAQ | Pages | ⬜ | — | — |
| 19 | Settings and Account | Screen (user and Application Manager variants) | ⬜ | — | — |
| 20 | Sign-in and Sign-up | Screen, with mock sign-in | ⬜ | — | — |
| 21 | Discover and Profile | Screens | ⬜ | — | — |
| 22 | Phase 1 closing check | All screens checked together in both languages, both themes, both widths | ⬜ | — | — |

### Phase 2 — Real data

| # | Step | Delivers | Status | PR | Date |
|---|---|---|---|---|---|
| 23 | Data test | Report: which store gives which field, how reliably | ⬜ | — | — |
| 24 | Open decisions review | List of every open item (the user decides) | ⬜ | — | — |
| 25 | Database | Full schema, migrations, seed | ⬜ | — | — |
| 26 | Real API and permission framework | API core, permission keys, development login, action logging | ⬜ | — | — |
| 27 | Worker jobs | Price and stock checks, deals, notification sending | ⬜ | — | — |
| 28 | Security tests in CI | Hidden-seller leak, personal-data leak, data isolation, permission matrix | ⬜ | — | — |
| 29 | Connect Search and Add | Screen on the real API | ⬜ | — | — |
| 30 | Connect Product Detail | Screen on the real API | ⬜ | — | — |
| 31 | Connect Tracked Items | Screen on the real API | ⬜ | — | — |
| 32 | Connect Notifications and Preferences | Screen on the real API | ⬜ | — | — |
| 33 | Connect Home | Screen on the real API | ⬜ | — | — |
| 34 | Connect My Savings | Screen on the real API | ⬜ | — | — |
| 35 | Connect Packages and Premium | Screen on the real API | ⬜ | — | — |
| 36 | Connect Landing Page + SEO product page | Pages on the real API | ⬜ | — | — |
| 37 | Connect Legal Pages + Help and FAQ | Pages on the real API | ⬜ | — | — |
| 38 | Connect Settings and Account | Screen on the real API | ⬜ | — | — |
| 39 | Connect Sign-in and Sign-up | Real sign-in (built last, `architecture.md` §17) | ⬜ | — | — |

### Phase 3 — Application Manager and later slices

| # | Step | Delivers | Status | PR | Date |
|---|---|---|---|---|---|
| 40 | Application Manager screens | Admin screens on mock data (after design approval) | ⏸ design review pending | — | — |
| 41 | Connect Application Manager screens | Admin screens on the real API | ⬜ | — | — |
| 42 | Connect Discover and Profile | Community features on the real API | ⬜ | — | — |
| 43 | Deploy pipeline | Automatic build and deploy to hosting | ⏸ hosting provider [OPEN] | — | — |

---

## 2. Why each step is in its phase

**Phase 1** — everything needed to see and use every approved screen on the user's computer, without any backend.
- Setup (steps 3–9) comes first because every screen is built on it.
- Basic CI (step 4) comes right after the skeleton so every following PR is checked from the start.
- Screens follow the screen order of `CLAUDE.md`; Application Manager screens are not here because their design review is still pending.

**Phase 2** — makes the product really work for users.
- **Data test (23):** which data the stores really give affects every later decision, so it comes first.
- **Open decisions review (24):** the database cannot be built while its rules are still open.
- **Database, real API, worker jobs (25–27):** price tracking — the product's core — does not work without them.
- **Security tests (28):** the hidden-seller rule is the product's foundation; no screen is connected to real data before these tests run.
- **Connecting screens (29–39):** this is where the user-facing product becomes real; same order as Phase 1, sign-in last.

**Phase 3** — useful, but not needed for the first working product.
- **Application Manager screens (40–41):** the design review is not finished, and at first the settings can run on their documented defaults.
- **Discover and Profile (42):** marked "later slice" in the docs; the core product does not depend on it.
- **Deploy pipeline (43):** the hosting provider is not chosen yet; it cannot be built without that decision.

---

## 3. Phase 1 — steps in detail

Source: `CLAUDE.md` › Phases; `architecture.md` §2, §3, §19–§21. Each step = one branch = one PR; work stops after each PR.

### Step 1 — Plan update
- **Content:** this document. No code.
- **Done when:** the user merges it.
- **PR:** `spec/phase-a-plan`.

### Step 2 — Screen PNGs before each screen (recurring rule)
- **Content:** PNGs arrive **screen by screen**, from the design side (claude.ai / the user) in a `design-change` PR into `design/<NN-screen>/png/` (light and dark). Before step 8: `design/00-iskelet/`. Before each screen step: that screen's folder.
- **Done when:** for the next step, its PNGs are on `main` and its row in `screen_status.md` is ✅. Otherwise the step is ⏸ and work stops (core rule 8).
- **PR:** design side, not Claude Code.

### Step 3 — Monorepo skeleton
- **Content:** pnpm workspaces + Turborepo; `apps/web` (Next.js App Router, TypeScript strict); packages `core`, `contracts`, `tokens`, `i18n`, `ui`, `config`, and `mocks` [PROPOSAL] (§4). Dependency-boundary lint (`core` and `contracts` framework-free; `web` never imports `mocks` outside development and test). `.env.example`. One root command (`pnpm dev`) starts the web app. **Not created:** `apps/api`, `apps/worker`, `packages/db`, `packages/sources` (Phase 2).
- **Done when:** on a clean clone, `pnpm install && pnpm build && pnpm lint && pnpm typecheck && pnpm test` pass and `pnpm dev` opens a page on `localhost`.
- **PR:** `chore/monorepo-skeleton`.

### Step 4 — Basic CI
- **Content:** GitHub Actions: install → lint → typecheck → unit tests → build, on every PR and on `main`.
- **Done when:** the workflow is green on the PR and required on `main`.
- **PR:** `chore/ci-basic`.

### Step 5 — Tokens
- **Content:** `packages/tokens` reads `docs/design-tokens.json` at build time → typed TypeScript values + platform-neutral JSON (for the future mobile app). Contrast test (WCAG AA) for every text/background pair, light and dark.
- **Done when:** the contrast test runs in CI; the package holds no hand-written colour or size values.
- **PR:** `feat/tokens`.

### Step 6 — Theme
- **Content:** CSS variables for light and dark, Tailwind preset generated from the tokens, theme switch (system default + user choice), lint rule that fails on literal colours, sizes and spacing in `apps/web` and `packages/ui`.
- **Done when:** a test page switches light/dark with no hard-coded value; the lint rule fails on a deliberate literal in a test fixture.
- **PR:** `feat/theme`.

### Step 7 — i18n
- **Content:** `packages/i18n` with `tr` (default) and `en` catalogues and typed keys; missing-key check fails the build; locale resolution order of `architecture.md` §19 as a pure function in `core`; `/tr/...` and `/en/...` routes with translated path segments (Next.js middleware); money, date and plural formatting via `Intl` in `core`.
- **Done when:** tests run in both locales; a missing key breaks CI; the root `/` redirects to the resolved locale.
- **PR:** `feat/i18n`.

### Step 8 — App shell
- **Preconditions (both required):**
  1. "0 İskelet ve Bileşenler" PNGs in `design/00-iskelet/` (step 2).
  2. **Base primitives** (Button, TextField, Switch, Select, Checkbox, Menu, Tooltip, Avatar, Icon …) added to the canonical component list (`pagedesign.md` §5) and `product_design_pattern.md` **by the design side (claude.ai)**, merged on `main`.
- **Content:** `AppShell` (signed-in and guest, bell and profile menu, footer, bottom tab bar below the breakpoint), `AuthShell`, `AdminShell` (header only; the sub-navigation is [RECOMMENDED] and waits for the Application Manager review), the five page templates (List, Detail, Flow, Summary, Settings), `Dialog`, `Sheet`, `SkeletonBlock`, `StatusBanner`, `EmptyState`, `StepIndicator`, `SegmentedChoice`, and the base primitives from precondition 2. Main navigation routes render the shell with an empty template. A development-only shell preview page [PROPOSAL] shows templates and components; excluded from production builds.
- **Done when:** matches the PNGs; works in tr/en, light/dark, 390 and 1280 width; keyboard navigation and focus handling work; automated accessibility check finds no violation; no hard-coded value.
- **PR:** `feat/web-shell`.

### Step 9 — Mock API and fixtures
- **Content:** see §4 and §5.
- **Done when:** the typed client gets valid responses (Zod-validated) for the first screen's endpoints; hidden-seller test passes on mock responses; the mock is absent from the production bundle (build check).
- **PR:** `feat/mock-api`.

### Steps 10–21 — Screens
- **Precondition:** the screen's PNGs in `design/<NN-screen>/` and ✅ in `screen_status.md` (step 2).
- **Content:** the screen exactly as designed, built only from canonical components (§8), on mock data, through the same typed client the real API will use. Want to Buy mode is built with Product Detail.
- **Done when (Phase 1 definition of done):**
  - Every string from the i18n catalogue; tests in `tr` and `en`, long strings included.
  - Light and dark; 390 and 1280 width (phone layout follows the shell and template rules; the parked phone-width proposals are not applied).
  - The five states (loading, empty, error, stale, success) via mock scenarios, plus the page's extra states.
  - Hidden-seller test on the mock responses **and** the rendered page: no seller or platform identity before "Göster".
  - Accessibility check and the performance budgets of `engineering_checklist.md` (measured on mock data).
  - The PR lists the log records each user action will write (activity, audit, entity events — `database.md` §14, §14a); they are implemented in Phase 2.
  - `engineering_checklist.md` items that apply without a backend.
  - `docs/build_status.md` row updated with "Phase 1 (mock)".
- **PR:** `feat/<module>` (e.g. `feat/search-and-add`, `feat/product-detail`).

### Step 22 — Phase 1 closing check
- **Content:** every built screen checked together: tr/en, light/dark, phone/desktop, five states, navigation between screens.
- **Done when:** the Phase 1 exit criterion holds; the result is recorded in `docs/build_status.md`.
- **PR:** `chore/phase1-check`.

---

## 4. Mock API

**What it is.** [PROPOSAL] Mock Service Worker (MSW) running **in the browser, in development and test only**. Handlers and fixtures live in `packages/mocks` (depends on `contracts` and `core`; never imported by production code).

**How it works.**
- Same paths (`/api/v1/...`), same response envelope (`architecture.md` §15.2) and same request/response shapes as the API contract (`architecture.md` §16); every request and response is validated with the Zod schemas in `packages/contracts`.
- Screens call the **same typed client and TanStack Query hooks** the real API will use; the screen does not know the mock exists.
- **Hidden seller:** fixtures keep full offers in a mock "server-side" store; handlers shape every response through the `HiddenOfferView` schema, so identity fields are stripped exactly as on the real server. Only the reveal endpoint returns `RevealedOfferView`; the reveal is kept in memory with its expiry. Offers are addressed by an opaque `ref`.
- **Mock session:** a development switch for guest / user / Application Manager. `GET /me` returns the user's permission keys, so the UI shows and hides actions the same way it will in Phase 2.
- **Scenario switch:** loading, empty, error, stale and success per page, plus adjustable latency, to show the five states.
- **Live updates:** the mock emits the same events as `GET /me/stream` through the same hook.

**Switching to the real API (Phase 2).**
- A configuration setting turns the mock off and points the client to the real base URL. **Screen code does not change.**
- What changes, only in the data layer: session cookie and `X-CSRF-Token` headers; optional server-side prefetch; the live-update hook connects to the real `/me/stream`.
- The mock stays for unit and UI tests; the same Zod schemas check the real API's responses (contract tests).
- A build check fails if the mock ends up in a production bundle.

---

## 5. Sample data (fixtures) rules

1. **From the designs:** products, prices, dates and texts as drawn in the approved PNGs.
2. **Hidden-seller rule:** no seller name, rating, platform or link of a cheaper seller before "Göster" — in any response, list, preview or notification. Sellers are referred to by rank ("en ucuz satıcı", "2. ucuz satıcı"). The user's own seller is shown.
3. **Turkish and English:** every fixture text exists in both; long strings included to test layout.
4. **Light and dark, phone and desktop:** fixtures are checked in all four combinations.
5. **Personal data masked:** e-mails, phone numbers and names as `emailMasked` / `phoneMasked`; no real person's data.
6. **Time:** dates relative to "now", so freshness lines ("N dk önce kontrol edildi") and durations stay realistic.
7. **No real store data:** nothing is fetched from stores; no scraping in Phase 1.

---

## 6. Today's target

**The app shell opening on `localhost`:** steps 3 → 8, each its own PR, with a stop for approval after each.

Step 8 needs its two preconditions (shell PNGs, base primitives in the component list). If they are not on `main` yet, the day ends at step 7: a bilingual, themed, empty app on `localhost`.

---

## 7. Phase 2 and Phase 3 — steps in detail

Build order and scope follow `modules.md` Appendix A and `architecture.md` §25, applied as "connect the existing screen" steps.

| # | Step | Content | Done when | PR |
|---|---|---|---|---|
| 23 | Data test | `packages/sources` adapters + CLI runner on recorded fixtures (details: Appendix A) | Report `docs/data_test_report.md` reviewed by the user | `feat/sources-data-test` + `spec` report PR |
| 24 | Open decisions review | `docs/open_decisions.md` [PROPOSAL]: every [OPEN], [DECIDE LATER], [RECOMMENDED], [ASSUMPTION], [INTERIM] item — file, section, current default, what it blocks, options. **List only.** | The user decides; decisions written into the affected docs in `spec` PRs | `spec/open-decisions` |
| 25 | Database | `packages/db`: full schema of `database.md`, raw SQL migrations (hypertables, aggregates, pgvector, `v_offer_public`, RLS, `audit_logs` INSERT-only), seed (roles, permission catalogue, plans, `system_settings` defaults, launch categories, platforms); local docker compose for PostgreSQL + TimescaleDB + pgvector, Redis, Meilisearch, S3 emulator [PROPOSAL] | Migrations apply on a clean DB; migration check in CI | `feat/db-schema` |
| 26 | Real API and permission framework | `apps/api` with the request lifecycle (`architecture.md` §15.1): rate limit, session, development login (absent from production), permission-key guard, explicit public allow-list for guests, restriction and consent gates, idempotency, response shaping, masking, personal-data encryption behind a local KMS key, audit + activity interceptors, OpenAPI, typed client | First endpoints (`GET /me`, `GET /me/entitlements`) pass the permission-matrix and second-user tests | `feat/api-core` |
| 27 | Worker jobs | `apps/worker`: queues, idempotent job base, schedule tick, price engine (discovery, site search, merge, verify, deal evaluation), notifications (console e-mail sink), activity ingest | Jobs retried without duplicate rows | `feat/worker-core` |
| 28 | Security tests in CI | Integration services in CI; hidden-seller leak test (endpoints, SEO pages, notifications), personal-data leak test, data-isolation test, permission-matrix test (`architecture.md` §24) | All required on `main` | `chore/ci-security` |
| 29–39 | Connect each screen | Per screen: its endpoints and worker jobs (Appendix B), logging of every action, mock switched off for the screen; same order as Phase 1, Sign-in and Sign-up last | `engineering_checklist.md` passes in full; `build_status.md` row ✅ | `feat/<module>-api` |
| 40 | Application Manager screens | 18 modules on mock data, after the design review is approved and PNGs are in `design/12a…12e` | Same as Phase 1 screens | `feat/admin-<group>` |
| 41 | Connect Application Manager screens | Admin endpoints, audit of every view and action | `engineering_checklist.md` › Admin Panel passes | `feat/admin-<group>-api` |
| 42 | Connect Discover and Profile | Community endpoints and jobs (Appendix B) | `engineering_checklist.md` passes | `feat/discover-profile-api` |
| 43 | Deploy pipeline | Environments `dev` → `staging` → `prod`, backups and tested restore (`architecture.md` §24) | After the hosting provider is chosen | `chore/deploy` |

**Development providers [DECIDED 2026-11-13]:** until hosting is chosen, every external provider is a local implementation behind its interface (S3 emulator, local KMS key, console e-mail sink, no LLM). LLM and e-mail providers stay [OPEN].

---

## 8. Component names

`packages/ui` uses **exactly** the canonical list in `pagedesign.md` §5 [DECIDED 2026-11-13]. Names used in the previous version of this plan map as follows:

| Previous name | Canonical name |
|---|---|
| `DealHero` | `HeroBlock` |
| `RevealGate` (UI) | `HiddenOfferCard` (the server-side `RevealGate` interface keeps its name) |
| `MarkConfirm`, "confirm panel" | `ConfirmPanel` |
| `AllowanceIndicator` | `AllowanceMeter` |
| `ErrorState` | `StatusBanner` (danger) |
| `StatusFlag` | `Flag` |
| compact `PriceHistory` | `PriceSparkline` |
| compact `StockHistory` | `StockStrip` |
| "fact tiles" | `FactTile` |

**Not in the canonical list yet** (built only after the design side adds them to `pagedesign.md` §5 and `product_design_pattern.md`): base primitives (Button, TextField, Switch, Select, Checkbox, Menu, Tooltip, Avatar, Icon — precondition of step 8), candidate card ("Hangisi seninki?"), buy-or-wait hint, step tick ("Yaptım ✓"), contextual help panel, masked field + time-limited "Göster", consent dialog, plan badge, plan comparison table, cookie bar, store tile and logo tile, rule card, person row + follow button, deal showcase. Several of these already have a pattern in `product_design_pattern.md` §5 but no component name in `pagedesign.md` §5. If a screen needs one, the step stops and the design side is asked.

---

## Appendix A — Data test details

Goal: know, before building the backend, which source gives which field and how reliably (`product_spect.md` §17-8a; `architecture.md` §26 R4, R7).

| Item | Content |
|---|---|
| Sample | ~20 products × 5 stores; electronics and clothing (launch categories); products from the spec's live tests (e.g. Insta360 Ace Pro 2, Dyson V15) plus clothing with and without brand/model code |
| Stores [DECIDED 2026-11-13] | Trendyol, Hepsiburada, Amazon TR, MediaMarkt, Teknosa |
| Sources | SerpApi Google Shopping (`engine=google_shopping`, `gl=tr`, `hl=tr`, Istanbul) **and** each store's site search **and** the product page (JSON-LD → site JSON → HTML; no LLM in the test) |
| Fields measured | seller (owner of the offer), seller name, seller rating + count, product rating + count (+ distribution), stock state, campaign note, installments, shipping cost, delivery time, warranty type, claimed old price, return-policy page readability |
| Per field | found yes/no per store × source, extraction path, agreement between sources, read time |
| Politeness | robots.txt respected, ~1–2 requests/s per site, identifiable User-Agent, no store accounts, stop on 403/429/captcha (`architecture.md` §8.3) |
| Code | first production pieces of `packages/sources` (`DiscoverySource`, `SiteSearchAdapter`, `ProductPageVerifier` + adapters with unit tests on recorded fixtures) and a CLI runner; no throwaway code |
| Key | the user puts the SerpApi key into the local `.env`; never committed |
| Not included | the 2-week deal-frequency validation (`product_spect.md` §17-8) is a separate task after the data test |

---

## Appendix B — Screen data needs

Endpoints from `architecture.md` §16, tables from `database.md`, components from `pagedesign.md` §5, permission keys from the official catalogue (`database.md` §4). In Phase 1 the mock implements the endpoints; in Phase 2 the API does. *(guest)* = on the API's explicit public allow-list (no `GUEST` role).

### B.1 Search and Add — `/[locale]/ara` (`pagedesign.md` §8.2)
| | |
|---|---|
| **Endpoints** | `GET /search/autocomplete` *(guest)* · `POST /uploads/presign` *(guest)* · `POST /uploads/complete` *(guest)* · `GET /uploads/:id` · `GET /img/:sha256/:variant` *(guest)* · `POST /identify` *(guest)* · `POST /identify/:requestId/answer` *(guest)* · `GET /products/:id` *(guest)* · `GET /products/:id/similar` *(guest)* · `GET /products/:id/confirm-context` · `POST /products/:id/seller-lookup` · `POST /products/:id/teaser` · `POST /tracked-items` · `POST /offers/:ref/reveal` · `POST /offers/:ref/hide` · `POST /offers/:ref/go` · `GET /me/stream` (`upload.ready`, `upload.rejected`) |
| **Worker jobs (Phase 2)** | `identify`, `link-resolve`, `media-process`, `media-cleanup`, `image-ingest`, `index`, `schedule-tick`, `discovery`, `site-search:{platform}`, `merge`, `verify`, `deal-evaluate`, `product-event`, `activity-ingest`, `reveal-expiry`, `reveal-watch`, `budget-guard` |
| **Tables (Phase 2)** | `identify_requests`, `uploads`, `media_assets`, `media_variants`, `product_images`, `products`, `product_attributes`, `product_aliases`, `categories`, `category_templates`, `platforms`, `sellers`, `offers` (via `v_offer_public`), `platform_return_rules`, `tracked_items`, `tracked_item_events`, `check_schedules`, `checks`, `price_history`, `stock_history`, `product_cheapest_hourly`, `deals`, `offer_reveals`, `affiliate_clicks`, `search_events`, `activity_events`, `product_events`, `api_usage`, `provider_budgets`, `alerts`, `seller_trust` |
| **Components** | `AppShell` · `PageTemplate` (Flow) · `SearchField` · `MultiImageUpload` + `ImagePrivacyNote` · `AttributeChip` · `ProductImage` · candidate card (not in list yet) · `StepIndicator` · `ConfirmPanel` · `FactTile` ×3 · `SegmentedChoice` (order status) · `MoneyDisplay` · `FreshnessLine` · `HiddenOfferCard` (teaser) · `Flag` · `StatusBanner` · `SkeletonBlock` · `EmptyState` |
| **Permission keys** | `catalog.view` *(guest)* · `search.use` *(guest)* · `identify.use` *(guest)* · `upload.own.create` *(guest)* · `tracking.own.write` · `reveal.own.use` · `offer.own.go` · `admin.offers.view_hidden_seller` |

### B.2 Product Detail incl. Want to Buy mode — `/[locale]/takip/[id]` (`pagedesign.md` §8.3)
| | |
|---|---|
| **Endpoints** | `GET /tracked-items/:id` · `GET /tracked-items/:id/offers` · `GET /tracked-items/:id/price-history?range=` · `GET /tracked-items/:id/stock-history?range=` · `GET /tracked-items/:id/calendar.ics` · `GET /tracked-items/:id/price-difference-message?locale=` · `PATCH /tracked-items/:id` · `POST /tracked-items/:id/delivered` · `POST /tracked-items/:id/steps/:step` · `PATCH /tracked-items/:id/request` · `POST /tracked-items/:id/end` · `POST /tracked-items/:id/extend` · `POST /tracked-items/:id/bought` · `POST /tracked-items/:id/check-now` · `POST /tracked-items/:id/feedback` · `POST /offers/:ref/reveal` · `POST /offers/:ref/hide` · `POST /offers/:ref/go` · `POST /offers/:ref/notify-back-in-stock` · `GET /products/:id/ratings` · `POST /reports` · `GET /me/entitlements` · `GET /me/stream` (`check.finished`, `deal.*`, `reveal.*`) |
| **Worker jobs (Phase 2)** | `verify`, `deal-evaluate`, `reveal-watch`, `reveal-expiry`, `report-threshold`, `return-policy-reader`, `seller-trust`, `campaign-reader`, `expiry`, `delivery-prompt` |
| **Tables (Phase 2)** | `tracked_items`, `tracked_item_events`, `deals`, `offers`, `sellers`, `offer_reveals`, `price_history`, `stock_history`, `product_cheapest_hourly`, `checks`, `check_now_usage`, `savings_records`, `buyer_feedback`, `seller_trust`, `reports`, `affiliate_clicks`, `campaigns`, `platform_return_rules`, `categories` |
| **Components** | `PageTemplate` (Detail) · `ProductImage` · `Flag` / `ModeBadge` · `HeroBlock` · `PriceHistory` · buy-or-wait hint (not in list yet) · `HiddenOfferCard` + one-line offer summary · fake-discount note · `StockHistory` · step tick (not in list yet) · request tracking block · price-difference message · `AllowanceMeter` · contextual help panel (not in list yet) · `Dialog` (end tracking, report) · buyer questions · `ConfirmPanel` ("Aldım, kaydet") · `FreshnessLine` · `StatusBanner` · `SkeletonBlock` |
| **Permission keys** | `tracking.own.view` · `tracking.own.write` · `reveal.own.use` · `offer.own.go` · `checknow.own.use` · `report.own.create` · `savings.own.write` · `feedback.own.write` · admin: `admin.tracking.view` · `admin.offers.view_hidden_seller` |

### B.3 Tracked Items — `/[locale]/takip` (`pagedesign.md` §8.4)
| | |
|---|---|
| **Endpoints** | `GET /tracked-items?filter=&sort=&q=&category=&cursor=` · `GET /tracked-items/summary` · `POST /tracked-items/check-now-bulk` · Add product dialog reuses B.1 · `GET /me/entitlements` · `GET /me/stream` |
| **Tables (Phase 2)** | `tracked_items`, `deals`, `check_now_usage`, `checks`, `product_cheapest_hourly`, `stock_history`, `categories`, `savings_records` |
| **Components** | `PageTemplate` (List) · `StatTile` ×4 · `SearchField` · `CategoryFilter` · `FilterChips` · `SortSelect` · `AllowanceMeter` · `ProductRow` · `PriceSparkline` · `StockStrip` · `Dialog` (1120 + 360 aside) · `StepIndicator` · `ConfirmPanel` · `EmptyState` · `StatusBanner` · `SkeletonBlock` |
| **Permission keys** | `tracking.own.view` · `tracking.own.write` · `checknow.own.use` · admin: `admin.tracking.view` |

### B.4 Notifications and Preferences — `/[locale]/bildirimler` + bell panel (`pagedesign.md` §8.5)
| | |
|---|---|
| **Endpoints** | `GET /notifications?type=&q=&category=&unread=&cursor=` · `PATCH /notifications/:id/read` · `POST /notifications/read-all` · `GET /notifications/unread-count` · `GET\|PUT /me/notification-preferences` · `GET /me/search-history` · `POST /tracked-items/:id/delivered` · "Takip et" dialog step 2 reuses B.1/B.3 · `GET /me/stream` (`notification.new`) |
| **Worker jobs (Phase 2)** | `notify`, `digest`, `return-reminder`, `delivery-prompt`, `expiry`; e-mail behind `NotificationChannel` (provider [OPEN]) |
| **Tables (Phase 2)** | `notifications`, `notification_deliveries`, `notification_digests`, `notification_preferences`, `notification_type_preferences`, `notification_templates`, `search_events` |
| **Components** | `PageTemplate` (List + side column) · `NotificationItem` + `NotificationPreview` · `Sheet` (bell panel 440) · `ModeBadge` · `ProductImage` · `FilterChips` · `SearchField` · `CategoryFilter` · `PriceSparkline` · `FactTile` · `Dialog` · `StatusBanner` |
| **Preferences UI** | [PROPOSAL] the **Ayarlar › Bildirimler** section is built in this step inside the Settings template; other Settings sections come with B.10 |
| **Permission keys** | `notifications.own.view` · `notifications.own.write` · `notification_prefs.own.write` · admin: `admin.notifications.receive` |

### B.5 Home — `/[locale]` signed in (`pagedesign.md` §8.1)
| | |
|---|---|
| **Endpoints** | `GET /home` · `GET /search/autocomplete` · `POST /offers/:ref/reveal\|hide` · `POST /tracked-items/:id/check-now` · `GET /me/stream` |
| **Tables (Phase 2)** | `tracked_items`, `deals`, `offers` (via `v_offer_public`), `product_cheapest_hourly`, `stock_history`, `check_schedules`, `offer_reveals` |
| **Components** | `PageTemplate` (Summary) · `SearchField` with inline 3-tile area · `HeroBlock` (Hemen Gözat: `PriceSparkline` + up to 3 `HiddenOfferCard`) · return reminder strip · `ProductRow` · `StatusBanner` · `SkeletonBlock` |
| **Permission keys** | `home.own.view` · `search.use` · `reveal.own.use` · `checknow.own.use` · admin: `admin.users.view_as` ([RECOMMENDED]) |

### B.6 My Savings — `/[locale]/kazancim` (`pagedesign.md` §8.6)
| | |
|---|---|
| **Endpoints** | `GET /savings?period=&q=&category=` · `PATCH /savings/:id` · `POST /tracked-items/:id/feedback` |
| **Tables (Phase 2)** | `savings_records`, `deals`, `buyer_feedback`, `tracked_items`, `tracked_item_events`, `audit_logs` |
| **Components** | `PageTemplate` (Summary) · `PeriodSelect` · `HeroBlock` (monthly bar chart, in-house SVG) · `StatTile` ×3 · `ProductRow` · `SearchField` · `CategoryFilter` · missed-deals list · `Sheet` ("Kaydı düzelt") · `EmptyState` |
| **Permission keys** | `savings.own.view` · `savings.own.write` · `feedback.own.write` · admin: `admin.savings.view` |

### B.7 Packages and Premium — `/[locale]/paketim` (`pagedesign.md` §8.7)
| | |
|---|---|
| **Endpoints** | `GET /me/entitlements` · `GET /plans` · `GET /me/reveals?period=&q=&category=&group=` · `GET /me/token-ledger` · `POST /package-requests` · `GET /package-requests/mine` |
| **Worker jobs (Phase 2)** | `token-reconcile`, `reveal-watch` refund path |
| **Tables (Phase 2)** | `plans`, `user_subscriptions`, `token_ledger`, `package_requests`, `offer_reveals`, `check_now_usage`, `tracked_items` |
| **Components** | `PageTemplate` (Summary) · plan badge (not in list yet) · `AllowanceMeter` ×4 · comparison table (not in list yet) · reveal-order steps · "Nereye harcadın?" (`SegmentedChoice` tabs, `ProductRow`) · `Dialog` (request) · `StatusBanner` |
| **Permission keys** | `packages.own.view` · `packages.own.request` · `reveal.own.use` |

### B.8 Landing Page + SEO product page — `/[locale]` signed out, `/[locale]/urun/[slug]` (`pagedesign.md` §8.10)
| | |
|---|---|
| **Endpoints** | `GET /public/stats` *(guest)* · `GET /public/deals?category=&limit=3` *(guest)* · `GET /public/products/:slug` *(guest)* · `GET /search/autocomplete` *(guest)* |
| **Tables (Phase 2)** | `products`, `product_images`, `product_cheapest_hourly`, `offers` (seller-less path), `deals`, `savings_records`, `admin_kpi_hourly` |
| **Components** | guest `AppShell` · `HeroBlock` · `StatTile` (figures) · how-it-works steps · deal showcase (not in list yet) · rights cards · CTA band · product page: `ProductImage` + thumbnails, rank-only seller rows with guest "Göster" → sign-in, `PriceHistory` (seller-less), similar-products strip, FAQ + structured data |
| **Permission keys** | `public.view` *(guest)* · `catalog.view` *(guest)* |

### B.9 Legal Pages + Help and FAQ (`pagedesign.md` §8.11)
| | |
|---|---|
| **Endpoints** | `GET /content/:slug?locale=` *(guest)* · `GET /content/consents/pending` · `POST /content/consents` · `GET /help/search` *(guest)* · `GET /help/stores` *(guest)* · `POST /content/:slug/feedback` *(guest)* · `POST /support-requests` *(guest)* · `GET /support-requests/mine` · `POST /support-requests/:id/messages` · `GET\|PUT /me/cookie-consent` *(guest via `anon_id`)* |
| **Tables (Phase 2)** | `content_documents`, `content_versions`, `content_feedback`, `user_consents`, `cookie_consents`, `support_requests`, `support_messages`, `uploads`, `platforms`, `platform_return_rules` |
| **Components** | `PageTemplate` (Detail with document menu) · store tile + logo tile (not in list yet) · rule card (not in list yet) · article layout · Bize yaz form (Flow, `MultiImageUpload`) · Taleplerim (List) · cookie bar (not in list yet) · `Dialog` (cookie preferences, re-consent) · `Sheet` (contextual help) |
| **Permission keys** | `content.view` *(guest)* · `support.own.create` *(guest)* · `support.own.view` · `consent.own.write` |

### B.10 Settings and Account — `/[locale]/ayarlar/{section}` (`pagedesign.md` §8.9)
| | |
|---|---|
| **Endpoints** | `GET\|PATCH /me` · `POST /me/reauth` · `GET /me/pii` · `PATCH /me/email` · `PATCH /me/phone` · `GET /me/security` · `GET /me/sessions` · `DELETE /me/sessions/:id` · `DELETE /me/devices/:id` · `POST /auth/logout-all` · `GET /me/search-history` · `POST /me/search-history/:id/hide` · `GET\|PUT /me/cookie-consent` · `POST /me/export` · `DELETE /me` · `POST /me/restore` · `POST /me/2fa/setup` · `POST /me/2fa/verify` · `GET /me/2fa/backup-codes` · `GET /me/admin-activity` |
| **Worker jobs (Phase 2)** | `account-purge`, data export job, `new-device-notify`, `pii-rekey` |
| **Tables (Phase 2)** | `users`, `sessions`, `user_devices`, `cookie_consents`, `search_events`, `email_tokens`, `user_backup_codes`, `audit_logs` |
| **Components** | `PageTemplate` (Settings) · section menu · masked field + time-limited "Göster" (not in list yet) · `Dialog` (re-authenticate, delete account) · switches with "Kaydedildi" · `ProductRow` (search history) |
| **Permission keys** | `account.own.view` · `account.own.write` · `account.own.view_pii` · `account.own.export` · `account.own.delete` · `search_history.own.hide` · admin: `admin.self.activity.view` · `admin.self.permissions.view` |

### B.11 Sign-in and Sign-up — `/[locale]/giris` (`pagedesign.md` §8.8)
| | |
|---|---|
| **Endpoints** | `POST /auth/register` · `POST /auth/login` · `POST /auth/google` · `POST /auth/apple` · `POST /auth/verify-email` · `POST /auth/password/forgot` · `POST /auth/password/reset` · `POST /auth/refresh` · `POST /auth/logout` · `POST /auth/logout-all` · `POST /me/restore`; `/auth/dev-login` absent from production builds |
| **Tables (Phase 2)** | `users`, `auth_identities`, `sessions`, `email_tokens`, `user_devices`, `user_consents`, `token_ledger`, `identify_requests` |
| **Components** | `AuthShell` · `PageTemplate` (Flow) · `HeroBlock` · guest hand-back card · `SegmentedChoice` (tabs) · provider buttons (official brand guidelines) · password field with live rules · `StatusBanner` |
| **Permission keys** | `auth.use` *(guest; signed-out only)* — every signed-up user gets role `USER` |

### B.12 Discover and Profile — `/[locale]/kesfet`, `/[locale]/u/[username]`, `/[locale]/profil` (`pagedesign.md` §8.12)
| | |
|---|---|
| **Endpoints** | `GET /discover?tab=&q=&category=` · `GET /users/:username` · `POST\|DELETE /follows/:userId` · `POST /follows/:userId/approve\|decline` · `POST\|DELETE /blocks/:userId` · `POST /link-submissions` · `GET /me/link-submissions` · `PUT /me/community-consents` · `POST /reports` |
| **Worker jobs (Phase 3)** | `link-resolve`, `verify`, `merge`, `risk-evaluate` |
| **Tables (Phase 3)** | `follows`, `blocks`, `community_consents`, `link_submissions`, `user_badges`, `token_ledger`, `reports` |
| **Components** | `PageTemplate` (List with side column) · `SegmentedChoice` (tabs) · person row + follow button (not in list yet) · deal cards · `HiddenOfferCard` · `Dialog` (consent, link share) · profile header |
| **Permission keys** | `community.view` · `community.own.write` · `follows.own.write` · `blocks.own.write` · `link.own.submit` · `report.own.create` · admin: `admin.community.moderate` |

### B.13 Application Manager screens — `/[locale]/admin/…` (`pagedesign.md` §8.13; design review pending)
Shell `AdminShell`; list + 380 px detail panel template ([RECOMMENDED]); every view and action audited.

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

Worker jobs: `kpi-rollup`, `rule-staleness`, `campaign-yearly-copy`, `mass-drop-detect`, `risk-evaluate`, `risk-decay`, `admin-digest`.
