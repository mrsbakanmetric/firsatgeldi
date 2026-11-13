# FırsatGeldi — Engineering Checklist

> **Last updated: 2026-11-12 (rev. 2: roles, histories, fraud, images, personal data, packages and stack decided)**
> Post-purchase price-tracking product for Türkiye. Users add products they bought (or want to buy); the system finds the identical product cheaper from other sellers while the return window is still open, and shows the saving with the seller hidden until the user reveals it.
> **Production product, not an MVP** — every feature that ships is production quality. Development starts with the web (responsive, installable); the mobile app comes later.
> End-user interface Turkish by default with English as second language; schema, code and documentation in English.
> Companion documents: `product_spect.md` (logic), `modules.md` (module content, permissions), `architecture.md` (system design), `database.md` (schema and parameters), `product_design_pattern.md` (look, behaviour and mandatory UI rules), `design-tokens.json` (values).

## Decisions and open items

**Decided**
- **Production product:** not an MVP. Every feature is delivered at production quality, in vertical slices; no throwaway prototype code.
- **Web first:** the web version is responsive and installable on phones. The mobile **screen coverage and permissions** are defined (`modules.md` access matrix).
- **Design source:** look-and-behaviour rules in `product_design_pattern.md`; values in `design-tokens.json`.
- **Price sources:** SerpApi (Google Shopping) and the stores' own site searches **together**, plus product-page verification before notifying and on click.
- **Seller-level offers:** the owner of an offer is the **seller**, not the platform.
- **[A1] Web technology stack:** decided — see "Web Technology Stack" below and `architecture.md` §3.
- **[A3] Platform name before reveal:** **both platform and seller name hidden** until "Göster"; same in want-to-buy mode.
- **Roles:** **Application Manager** (sees and manages everything, web and mobile) + **User** (own data only); guest is an access level. Authorisation is data (permission keys); new roles are added by selecting permissions, without code change.
- **R1 — price paid:** never prefilled from our data; the user types it, or it comes from their own link/screenshot. No seller list in the confirm step: the seller is typed (exact match) or comes from their own link/screenshot.
- **Launch categories:** electronics and clothing together.

**To be decided later (intentionally open)**
- **Mobile technology and infrastructure.** Shared business rules stay on the server / platform-independent.
- Naming of more expensive sellers; legal nature of default-on email; Premium/token prices and payment provider; items marked [RECOMMENDED] in `modules.md` Appendix C (critical settings list, fraud rule list and automatic-action limit, view-as-user, re-authentication for own personal data).

**Decided**
- **[A2] First vertical slice [DECIDED 2026-11-13]:** search → mark → confirm → product tracked → scheduled price check → cheaper offer shown with hidden seller → reveal; permission checks and activity capture from day one. Build order in `modules.md` Appendix A; detailed plan in `implementation_plan.md`.

**Assumptions to confirm**

---

## Feature Checklist

### Scope
- [ ] User flow clearly defined and traceable to `product_spect.md` and the module in `modules.md`
- [ ] Scope explicit for the slice being built; out-of-scope items written down
- [ ] Türkiye only; no international-store behaviour introduced (parked)
- [ ] Simple, fast, plain-language UI: add a product in under 10 seconds, at most 3 steps, at most 1–2 tappable questions

### Core product logic (spec §0 — applies to every feature)
- [ ] The user verifies the product before anything is tracked: rich detail shown (brand, model/generation, bundle/variant, colour, category, image)
- [ ] Two-step confirmation: **mark** ("İşaretle") then **confirm** ("Evet, bunu aldım" / "Almadım, sadece takip et"); nothing is saved on a single tap; mark is reversible; confirm endpoint idempotent
- [ ] Candidate list contains products/variants only — no seller or platform names, no prices
- [ ] **Price paid is typed by the user** (or read from their own link/screenshot); never prefilled from our price data; no seller list in the confirm step (typed seller with exact match, or own link/screenshot)
- [ ] The owner of an offer is the **seller**; comparison, ranking and reveal are at seller level
- [ ] A cheaper price is shown with price, saving, stock status and duration, warranty type, price duration, shipping cost, delivery time and last-check time, while **seller name, seller rating, platform name and link stay hidden**
- [ ] If several sellers are cheaper, **all** are listed, cheapest (net) first, each with its own reveal control
- [ ] Hidden sellers are referenced by rank in lists, charts, histories, notifications and emails — never by name
- [ ] The seller (and platform) the user bought from is always visible
- [ ] No API response, page source (incl. SEO product pages), URL, image address, client-visible log or notification payload contains a hidden seller's (or their platform's) identity before reveal (server-side enforcement)

### Data Contract
- [ ] Tables, columns and constraints match `database.md` (reference; no separate table list kept here)
- [ ] Product (canonical) and Offer (product × seller, on a platform) are separate; an offer never exists without a matched product
- [ ] `tracked_items` carries: user, product, mode, seller and platform, price paid, order date, order status, delivery date/estimate, return deadline (+ estimated flag, user-edited flag), target price, tracking end date, step ticks, state
- [ ] Price and stock history are append-only time series; price history retained ≥ 1 year (indefinitely per history policy)
- [ ] User-owned rows carry `user_id` from day one
- [ ] Roles, permissions and role-permission links are data; the Application Manager role cannot be deleted; at least one always exists
- [ ] Money as integer minor units with currency; timestamps UTC, displayed Europe/Istanbul
- [ ] Indexes and uniqueness as defined in `database.md`
- [ ] PostgreSQL is the system of record; Redis and the search index are rebuildable
- [ ] Business values (limits, durations, thresholds) live in `system_settings` / package settings with defaults (`database.md` §18); none hard-coded

### Product Input & Identification
- [ ] One input accepts text, links and photos together; search is the primary path
- [ ] **v1 helpers:** link detection (fills product, seller, price paid) · one-shot fill from order screenshot · bulk add from one screenshot ("N ürün bulduk", each confirmed in turn)
- [ ] Autocomplete from our own catalogue, tolerant of typos and Turkish characters
- [ ] Entity extraction returns structured JSON with confidence per field, using the category template
- [ ] "Nasıl anladık" shown with one-tap corrections; questions only for low-confidence and match-critical fields
- [ ] LLM calls have timeouts, retries and a non-LLM fallback (plain text search)
- [ ] Duplicate add (same product, same mode) → no new record; existing record opened
- [ ] Guest can search and mark; sign-in at confirm, then returns to the confirm panel with values kept
- [ ] Category attribute templates are data, editable without redeploy

### Images
- [ ] **No image binary in the database**; objects in S3-compatible storage, content-addressed by SHA-256 (duplicates stored once)
- [ ] All metadata (EXIF, GPS) stripped; the original is not kept; variants 160/480/1080/1200 in AVIF/WebP/JPEG; pHash computed for similarity
- [ ] User uploads (order screenshots, identification photos) in a **private bucket**, visible only to the owner via signed, expiring links; **deleted after 24 hours** by a scheduled job. Support-request screenshots (`SUPPORT_ATTACHMENT`) follow `support.attachment_retention_days` (30 days) [DECIDED 2026-11-13]
- [ ] Up to 5 images per request (parameter); per-file validation (type JPEG/PNG/WebP/HEIC, size ≤ 10 MB, pixel limit); one rejected file does not stop the others
- [ ] No personal data (name, address, phone, order number) is extracted or stored from images
- [ ] Image privacy note shown next to every upload control

### Matching & Verification
- [ ] Matching order: barcode → brand + normalised model code → embedding similarity → LLM "same product and same bundle?" → user confirmation
- [ ] Same generation, variant/bundle and warranty type only; mismatches never compared silently
- [ ] Accessories, second-hand, foreign stores, other generations/bundles excluded; available as "similar but different"
- [ ] No exact match → stated explicitly with the closest three
- [ ] Confirmations and "different product" reports feed the matcher
- [ ] Electronics and clothing both supported at launch; clothing / private-label without brand or model code → same-seller tracking only, stated

### Return Window & Order Status
- [ ] Return rules (platform × category) store a start type (`ORDER` / `DELIVERY`), days, average delivery time, policy link, source state (`AUTO`/`LOCKED`/`DEFAULT`) and read time
- [ ] Return-policy reader: daily, within adapter limits; failed read keeps the last value with its age; no value ever → "Varsayılan" label on every surface; out-of-range read waits for approval; locked values never overwritten
- [ ] Platform logos shown only with an uploaded official file **and** a recorded permission source; otherwise initials on the logo tile
- [ ] Cookie bar: accept and reject equally prominent; non-essential cookies load only after consent
- [ ] Help lists (articles, stores, Taleplerim) searchable with Turkish folding; topic/status filters with counts
- [ ] Last day = start + rule days; delivery-based with unknown delivery → computed from order date + average delivery and labelled "tahmini"; "Teslim aldın mı?" asked after the estimated day (in-app + notification); the answer fixes the date
- [ ] User edits are flagged
- [ ] Categories without a withdrawal right never get a "return" suggestion; "request price difference" offered instead
- [ ] Order status drives the action: ordered → cancel · delivered → return · no withdrawal right → price difference
- [ ] Tracking stops automatically when the window expires; the user is informed
- [ ] Frequent-return warning (v1) from the user's own records; period and threshold are parameters
- [ ] Return deadline exportable as `.ics` with a reminder one day before

### Price Engine & Data Sources
- [ ] SerpApi (Google Shopping) **and** the stores' own site searches used together; one adapter per store
- [ ] Results merged and de-duplicated; each offer records source and time; on disagreement the store's own data wins
- [ ] If one source fails, the other continues and an alarm is raised
- [ ] Seller-level data collected per seller: name, rating, price, stock, warranty, **shipping cost, delivery time, claimed old price**
- [ ] Queries use model + bundle/variant; results cleaned (accessories, generation/variant mix-ups, duplicates, second-hand, foreign)
- [ ] Outlier filter; outliers never notified without review
- [ ] Every candidate deal verified on the product page before notifying and again on click
- [ ] Polite access: robots.txt, per-site rate limits, identifiable user agent, back-off, no evasion, no store accounts
- [ ] Extraction order per site: official API/feed → structured data → site JSON → HTML → LLM; fallback with alarm
- [ ] Provider usage metered with budget alarms; **budget saving mode** (reduced frequency when a budget threshold is reached) and alerts run in parallel
- [ ] Providers behind interfaces

### Monitoring & Scheduling
- [ ] Checks scheduled per **product**, not per user
- [ ] Adaptive frequency (deadline 1–3 days, campaign periods, volatile, normal, expired → stop); Premium items checked 2× more often; not user-configurable
- [ ] Parallel queue with per-site concurrency limits and circuit breakers
- [ ] Jobs idempotent: no duplicate history rows or notifications on retry
- [ ] Campaign calendar and mass-drop detection raise frequency automatically
- [ ] Campaigns read from store/bank pages and affiliate feeds arrive as `PENDING`; conditional offers (cart discount, card offer) never change the shown price; before Göster the note names no store, card or condition
- [ ] Health monitoring: per-site success rate and latency, parser-failure alarms, queue depth, stuck jobs

### Offers, Seller & Stock
- [ ] Every offer belongs to a seller and stores the fields above plus listing link, previous price, stock state, last check, source
- [ ] When the platform itself sells, it is recorded as the seller and this is stated
- [ ] Stock states: in stock / low stock / out of stock only
- [ ] Durations phrased "at least"; nothing claimed before tracking started (pre-tracking history dimmed)
- [ ] **Net saving** = paid − (price + shipping) when shipping is known; otherwise "kargo hariç"; ranking uses net price
- [ ] **Fake-discount note** when a claimed old price/discount was not seen in our last 30 days; no note when history is insufficient
- [ ] On click: stock and price re-checked; if gone or higher, next offer shown and "notify when back in stock" offered

### Reveal Gate ("Göster / Gizle")
- [ ] One reusable component/endpoint everywhere a cheaper seller appears (not in Tracked Items)
- [ ] Gate implementations behind one interface: `FreeToggleGate` (first release: free, unlimited, recorded) → `EntitlementGate` (Premium → monthly free allowance → token → "Hakkın bitti")
- [ ] Seller identity returned **only** in the reveal response; offers referenced by opaque HMAC `ref`
- [ ] **Reveal lifetime:** revealed seller stays visible for `reveal.open_hours` (default 168), then hidden; re-reveal goes through the gate
- [ ] **Price watch:** if price rises or stock runs out within `reveal.price_watch_minutes` (default 60) after reveal, a notification is sent (later: automatic allowance/token refund)
- [ ] Every reveal, hide and expiry recorded; the screen states which allowance was used
- [ ] Remaining-allowance indicator slot present in the component
- [ ] Outbound link after reveal is our tracked/affiliate link
- [ ] The Application Manager sees hidden sellers always, without using an allowance; every view recorded

### Price History & Stock History
- [ ] Every check appends to history; pre-tracking history included when available, shown dimmed
- [ ] Price history communicates: period and dates, both series with name and current value, purchase marker, target in want mode, stop marker, one plain-language conclusion
- [ ] Stock history: one unit = one day, three states with a key, seller by rank if hidden, current state with duration, dated change log on detail
- [ ] Compact and full versions use the same data and rules

### Home, Tracked List & Product Detail
- [ ] Home: summary line (count · protected amount · freshness); search box; "Hemen Gözat" with priority product; return reminder line (window ending within 2 days); other items; second urgent item emphasised at top of the list
- [ ] Priority order: open deal with nearest deadline → deadline ≤ 3 days → target reached → most recent change
- [ ] Tracked list: summary, filters with counts (All · Bought · Want · Has deal · Ended), sorting (Priority · Return date · Saving), ended items both under "Ended" and dimmed at the bottom of "All"
- [ ] Product detail: header with countdown (+ "tahmini"), deal summary, price history, all cheaper sellers, seller bought from, stock history, ordered action steps with "Yaptım ✓" ticks (reversible), price-difference message (one-tap copy, no hidden seller name), `.ics`
- [ ] Ending tracking asks the method (return + re-buy · cancel + re-buy · price difference money/coupon) and the re-bought price (prefilled, editable, manual edits flagged)
- [ ] Cached data shown immediately with age; refreshed in background

### "Check Now"
- [ ] Cache window `check.cache_minutes` (default 5): a recent result is shown, no allowance used
- [ ] Daily allowance enforced server-side: Free 10, Premium 30 (package settings); Application Manager unlimited
- [ ] Remaining allowance shown next to the button; disabled with reason at zero
- [ ] **Bulk check** on Tracked Items: visible active items; number to be checked stated in advance; items within the cache window use no allowance
- [ ] Uses known offers' pages, not full discovery; double-trigger protection; progress in place

### Want to Buy
- [ ] Tracking duration: 1 week · 1 month (default) · 3 months · Unlimited; extension asked 3 days before the end; no answer → stops
- [ ] Target price optional; without a target, alerts on a notable drop (parameter)
- [ ] All cheaper sellers hidden, revealed through the gate
- [ ] "Aldım" closes the want record and opens return tracking with the user's price paid

### Notifications
- [ ] Web: bell **panel** (last 10, unread first) + "Tümü" page with filters; logic channel-agnostic (push added with mobile)
- [ ] Email **on by default for all types except** "Aradığın ürün ucuzladı" (`SEARCHED_PRODUCT_DROP`), whose e-mail is **off by default** [DECIDED 2026-11-13]; per-type on/off (legal nature [DECIDE LATER] — legal opinion before launch)
- [ ] Daily cap `notifications.daily_cap` (default 5); return ≤ 2 days not capped
- [ ] Optional daily digest; urgent items (deal + return ≤ 2 days, delivery question) never wait
- [ ] **Mandatory account and security notifications** (welcome, verification, new device sign-in, password change/reset, sign-in method added, account deletion started/restored/completed, suspension, data export ready, package request outcome, support reply, re-consent required): in-app + email always, not capped, not digested, cannot be turned off
- [ ] Admin notifications to the Application Manager: high-risk fraud case, source alert, budget threshold, daily digest of pending requests
- [ ] Time preferences and quiet hours respected; priority order; no duplicate for the same deal
- [ ] Content: net saving first, days left, low-stock note, check age — **never a hidden seller's or platform's name**
- [ ] Notification templates are versioned data in the database, per language

### Search & Catalogue
- [ ] Hybrid flow: own index first → live sources when missing or stale → cleaned, matched, saved, indexed
- [ ] Targets: own-index search < 100 ms, live query < 3 s, progressive results
- [ ] Query cache 1–4 h; popular products pre-warmed
- [ ] Personal ranking: text match first, then personal, social, popularity, deal signals
- [ ] SEO product pages: server-rendered, seller and platform hidden (rank only); guest "Göster" leads to sign-in and the page source holds no seller identity; low-data products `noindex` and out of the sitemap; FAQ as structured data
- [ ] Landing figures: one figure below its threshold switches all three tiles to value statements; deal showcase hidden under 3 examples; no user or seller name in `/public/*` responses
- [ ] Deal showcase motion (stars, sheen, hover lift) stops under `prefers-reduced-motion`; `sparkle` token used nowhere else

### Packages and Premium
- [ ] Defaults (editable on the admin screen): Free — 3 reveals/month, 10 tracked items, 10 checks/day, normal frequency · Premium — unlimited reveals, 50 tracked items, 30 checks/day, 2× frequency · welcome gift 3 tokens (once)
- [ ] Flat **1 token per reveal** [INTERIM — tiered pricing to be discussed]
- [ ] **No online payment:** users request Premium/tokens; Application Manager approves manually; user notified
- [ ] Monthly allowance resets at month start, no roll-over; tokens do not expire [ASSUMPTION]
- [ ] Tracking limit blocks new adds only; lowering a limit never cuts existing tracking
- [ ] Every allowance use, token movement and request recorded

### My Savings
- [ ] Total + this month/year; per product with method; missed deals shown separately and excluded from the total
- [ ] Saving record editable for `savings.edit_days` (default 7), then final; every edit recorded
- [ ] Numbers reproducible from stored data

### Ratings, Reviews and Seller Trust
- [ ] Store ratings read with prices (JSON-LD first); review texts, reviewer names and photos never stored or shown
- [ ] Before reveal: product-level aggregate only, no store or seller name; per-store rating only in the reveal response
- [ ] "az değerlendirme" under `ratings.min_count`; rating read time shown
- [ ] Buyer questions only for "Aldım" items, one per item, anonymous in every display
- [ ] Seller trust: client gets verdict + reason only before reveal; breakdown after; "yeterli veri yok" under `trust.min_signals`
- [ ] No third-party ratings in our structured data
- [ ] Installments read from the page never change the shown price; before Göster only "Peşin fiyatına en çok N taksit" (no bank, card or store); nothing shown when not read
- [ ] Request tracking reminders before the return deadline; we never contact sellers on the user's behalf

### Community, Following & Discover (later slice)
- [ ] One-way follow; following a private profile needs approval; default privacy "Only me"
- [ ] Explicit consent for sharing; search text never shared; no other user's price paid without consent
- [ ] Shared "cheaper elsewhere" links verified before publication and turned into **hidden-seller offers** (raw link and seller never published)
- [ ] Sharing reward [INTERIM]: 1 token per verified cheaper link, monthly cap 10, "Fırsat Avcısı" badge (parameters)
- [ ] Discover shows a product only with ≥ `discover.min_trackers` trackers; no person name unless that person shares; paid price only with its separate consent
- [ ] First-visit consent: nothing pre-ticked; values stored in `community_consents`, edited only in Ayarlar › Gizlilik
- [ ] Block: blocked user gets 404-equivalent on the blocker's profile, no feed items, cannot follow; existing follows removed
- [ ] Discover and profile lists searchable (Turkish folding) with category filter; product images everywhere; no coral

### Roles, Permissions & Access (web and mobile)
- [ ] Every page and every action bound to a **permission key**; checked on the server for web and mobile alike; client hiding is cosmetic
- [ ] Access matrix of `modules.md` implemented; **permission-matrix test** covers allowed and denied paths for Guest, User and Application Manager on every endpoint
- [ ] Row-level security as a second line; admin access through a separate database role
- [ ] User sees and changes only own data; Application Manager sees all users' data and hidden sellers; every such view written to the Audit Log
- [ ] View-as-user is read-only and recorded [RECOMMENDED]

### Histories & Audit
- [ ] Every user action (search, add, reveal, check, report, share, sign-in) written to `activity_events`; plus `search_events`, `product_events`, price/stock history, `audit_logs`
- [ ] Histories kept **indefinitely**; anonymised on account deletion
- [ ] Users can only **hide** own search-history entries [legal opinion pending on KVKK erasure]
- [ ] History Explorer (admin) filters by user, product, period, event type; access recorded

### Fraud Monitoring
- [ ] Pipeline: `risk_rules` → `risk_signals` → `risk_scores` → `risk_cases` → `user_restrictions`
- [ ] Rules and weights are data; thresholds parameters [rule list and automatic-action limit RECOMMENDED → confirm]
- [ ] High-risk cases notify the Application Manager; restrictions recorded with reason and reversible

### Personal Data
- [ ] Email and phone encrypted (AES-256-GCM, envelope encryption via KMS) with a **blind index** (separate key) for lookup and uniqueness
- [ ] Passwords Argon2id + pepper; never shown or logged
- [ ] **Masked by default on every screen** (`m***@g***.com`, `+90 5** *** ** 67`)
- [ ] Application Manager full-value view: reason required, 10 minutes, audited; user's own view/change with re-authentication (15 min) [RECOMMENDED]
- [ ] Email/phone change: verify new address + information email to the old one
- [ ] **Log redaction** of personal data in logs, traces and error reports
- [ ] **Personal-data leak test** in CI (responses, logs, notification payloads)
- [ ] Key rotation job (`pii-rekey`) runs without downtime

### Affiliate & Monetisation
- [ ] Affiliate link only when the user clicks our recommendation; nobody else's code replaced
- [ ] Ranking by price, never by commission; disclosure visible where affiliate links are used
- [ ] Clicks logged; commission never affects shown/hidden offers

### Auth & Account (built last)
- [ ] Google and Apple on top, email + password below; same verified email links to one account
- [ ] Email verification, password reset, rate-limited sign-in; new-device sign-in notification
- [ ] Web session in secure httpOnly cookies (mobile session storage decided with mobile)
- [ ] KVKK notice + terms accepted at sign-up (versioned consents)
- [ ] Data export; **account deletion** closes the account immediately, restorable by signing in within `account.restore_days` (default 30), then personal data deleted and statistics anonymised
- [ ] Development login removed before launch

### Internationalisation
- [ ] No hard-coded strings; typed catalogue (`tr` default, `en`); missing-key check fails the build
- [ ] Locale resolution order implemented: URL → user's saved locale → `fg_locale` cookie → `Accept-Language` (`tr*`/`en*`, else `tr`) → `tr`; root `/` redirects; guest choice copied to the account at sign-up
- [ ] Supported locales read from `i18n.locales`; no table lists languages in a CHECK; translatable admin data stored as locale-keyed `jsonb` with `tr` and `en` required
- [ ] `notifications.locale` and `search_events.locale` recorded
- [ ] Locale formats for dates, numbers, currency, relative times
- [ ] Store data shown as provided; category/attribute labels translated through templates
- [ ] LLM user-facing text in the user's language; layouts tolerate longer strings

### Design System
- [ ] `product_design_pattern.md` and `design-tokens.json` read before UI work; only semantic tokens and defined patterns
- [ ] New pattern or token → documents updated first
- [ ] No hard-coded colours, sizes, spacing, radii or shadows (lint enforced)
- [ ] Colour meanings respected; coral max once per surface; status never by colour alone
- [ ] Light and dark verified; theme switch without code change

### Trust & Accuracy
- [ ] Every price and stock value shows when it was checked
- [ ] "Wrong price" / "different product" reports reach the management queue; repeated wrong-price reports suspend the offer (threshold parameter)
- [ ] A failed check never erases the last known value
- [ ] Protective warnings shown where relevant

### Validation & Errors
- [ ] Input validated at the client and at the API boundary (Zod)
- [ ] Structured API errors (code + message key); plain-language user errors with a next step
- [ ] Double-submit protection on every save/confirm/reveal/check action
- [ ] Unsaved input survives navigation and network errors

### Caching & Offline Tolerance
- [ ] Last known data shown when offline/slow, with a stale indicator
- [ ] Background refresh on reconnect

### Compliance & Privacy
- [ ] KVKK: minimal personal data, privacy notice, explicit consent for community features, deletion and export honoured; legal opinion on indefinite history and hide-only search history before launch
- [ ] Purchase data private by default
- [ ] Legal Pages (privacy notice, terms, cookie policy, commission disclosure) versioned; re-consent flow when required
- [ ] Store terms reviewed; brand names as text only
- [ ] Secrets only on the server (secret manager)

### Admin Panel (web and mobile, Application Manager)
- [ ] Every admin page and endpoint permission-checked on the server; every action written to the Audit Log
- [ ] **Critical settings** applied by the Application Manager alone with preview + confirmation; one-click rollback; history kept; second-approval mechanism retained in the schema for future roles
- [ ] Modules: Admin Overview · Return Rules · Category Templates · Campaign Calendar · Platforms and Source Health · Reports and Match Corrections · System Settings · Provider Usage and Cost · **Users** · **Audit Log** · **Notification Templates** · **Catalogue and Products** · **Package Settings and Requests** · **Legal and Content** · **Support Requests** · **History Explorer** · **Fraud Monitoring** · **Roles and Permissions**
- [ ] Settings show description, default and allowed range; out-of-range rejected

---

## Frontend Checklist (web)

### General
- [ ] Responsive from phone width upward; installable; verified on the last 2 versions of Chrome, Firefox, Safari (incl. iOS Safari) and Edge, desktop and mobile
- [ ] Server state through TanStack Query; minimal client state (session, language, theme)
- [ ] Data access only through the shared data layer
- [ ] Shared core (types, validation, formatting, rules) platform-independent
- [ ] Accessibility: real controls with labels, visible focus, contrast AA, 44 px targets, chart text descriptions, reduced motion
- [ ] Dialogs (design §5.28): focus moves in and is trapped, Escape and × close, focus returns to the opening button, `aria-modal` + labelled title; below `breakpoint.md` the dialog is a bottom sheet
- [ ] Every screen implements loading, empty, error, stale and success states
- [ ] Product image on every product mention (list, card, notification, preview, dialog, email); category illustration fallback; image `alt` = product name (design §5.30)
- [ ] Application Manager accounts cannot sign in without verified two-step verification; backup codes are hashed and single use
- [ ] Settings sections are rendered by permission; admin-only sections (Yetkilerim, Yönetim etkinliğim) are also blocked on the server
- [ ] Text search folds case with the Turkish locale and treats ı/i (and İ/I) as equal on both query and data ("Insta360" matches "insta")
- [ ] Each page matches its `pagedesign.md` §8 spec: shell, template, region order, shared components, overlays, states
- [ ] Every list has a search field (debounced, server-side for paginated lists) and product lists have a category filter with counts; empty-result state with "Filtreyi temizle"
- [ ] Side-by-side blocks of the same kind align row by row (same row heights, element sizes, one-line labels, equal block heights)
- [ ] Pages/actions without permission are not rendered (server still enforces)

### Search & Add
- [ ] Single input for text + link + photos (multi-image upload with per-file progress and rejection, privacy note)
- [ ] Mark → confirm panel; price paid typed by the user; no seller list in confirm (exact-match lookup, rate-limited)
- [ ] Cheaper-price teaser appears only after the price paid is entered or prefilled, and uses the reveal gate component
- [ ] Autocomplete: first three matches as image tiles updating per keystroke; scrollable full list with a right-hand preview of the active item; no price or store name anywhere in it; keyboard (↑/↓/Enter/Esc) and screen-reader (combobox + listbox) support
- [ ] Attribute chips open template values; changing a match-critical attribute clears the mark; undo available
- [ ] Found listing shows rating/stock/warranty as good/bad tiles (icon + label + value)

### Home / Tracked List / Detail
- [ ] Compact histories labelled and understandable without a legend lookup
- [ ] One primary action per block; one deal action per surface
- [ ] Reveal in place; remaining-allowance indicator next to gated actions
- [ ] "Check now" (single and bulk) shows progress and updates the age

### Notifications & Settings
- [ ] Bell panel + "Tümü" page with unread state; preference screen (per-type email, time slots, digest)
- [ ] Masked email/phone; language and theme switch apply instantly

---

## Web Technology Stack **[A1 — DECIDED]**

Priorities, in order: **security → speed → data visible instantly → modern look and feel.** Current stable versions. Full detail in `architecture.md` §3.

| Layer | Decision |
|---|---|
| Repository | pnpm + Turborepo monorepo |
| Web | Next.js (App Router) + React + TypeScript (strict); PWA |
| Interface | Tailwind CSS generated from `design-tokens.json` + Radix UI / React Aria |
| Data & immediacy | TanStack Query + Server-Sent Events |
| Charts | In-house SVG components |
| API | NestJS (Fastify adapter) + Zod + OpenAPI contract |
| Database | PostgreSQL + TimescaleDB + pgvector; Prisma + raw SQL migrations |
| Background work | Workers + Redis + BullMQ |
| Search | Meilisearch |
| Files | S3-compatible object storage (private bucket for uploads) + CDN |
| Secrets & keys | KMS + secret manager |
| AI | Vision LLM + embeddings behind a provider interface |
| Observability | OpenTelemetry + error tracking + metrics/alerts |
| Hosting | Containers, region close to Türkiye, CDN + WAF |
| Mobile | **[OPEN]** |

### Security (first priority)
- [ ] Session in secure, httpOnly, SameSite cookies; CSRF protection
- [ ] Strict CSP, security headers, HTTPS only (HSTS)
- [ ] Argon2id + pepper; sign-in attempts limited
- [ ] Authorisation on the server at every endpoint via permission keys; RLS as second line
- [ ] Schema validation on all input; store text treated as untrusted and rendered safely (XSS)
- [ ] Outbound requests only to allow-listed domains; internal addresses blocked (SSRF)
- [ ] Rate limiting and bot protection; behind WAF/CDN
- [ ] Secrets in a secret manager; personal data encrypted at field level; access to personal data audit-logged
- [ ] Dependency and vulnerability scanning; OWASP ASVS review and penetration test before launch

### Speed and instant data (first priority)
- [ ] LCP < 2.5 s, INP < 200 ms, CLS < 0.1 — real-user measurement
- [ ] API p95 < 300 ms from stored data; own-index search < 100 ms
- [ ] Stored data first, fresh data by streaming/background; no full-page loading indicator
- [ ] Live updates without reload
- [ ] Optimistic updates with rollback on failure
- [ ] Bundle budget enforced; images served from variants in modern formats at the right size

### Look and feel (modern)
- [ ] Fluid responsive layout; container queries
- [ ] Instant theme switch; short functional transitions
- [ ] Skeleton placeholders; no blank screens
- [ ] Full keyboard use, screen-reader support, reduced motion respected

---

## Mobile (technology to be decided)

- [ ] Mobile technology, requirements and infrastructure decided and added to this document
- [ ] Mobile screens and permissions follow the `modules.md` access matrix (incl. admin modules for the Application Manager)
- [ ] Same API and same server-side permission checks as the web

---

## Architecture Checklist

- [ ] Thin client; business rules on the server / shared core
- [ ] Hidden-seller rule enforced in the API layer (HiddenOfferView / RevealedOfferView; `v_offer_public` view [RECOMMENDED])
- [ ] Price sources, LLM providers, notification channels and reveal gates behind interfaces
- [ ] Background work in workers via the queue, never in request handlers
- [ ] Idempotency keys on jobs and state-changing endpoints
- [ ] Search index and caches rebuildable from PostgreSQL
- [ ] Migrations versioned; no manual schema changes
- [ ] Configuration (frequencies, limits, thresholds, theme, package values) is data with history and rollback
- [ ] Observability: structured redacted logs, error tracking, job and provider cost metrics

---

## Security & Data-Integrity Gate

Before any deployment:
- [ ] A user can read and change only their own data (tested with a second user)
- [ ] Permission-matrix test passes for Guest, User and Application Manager on every endpoint, web and mobile routes
- [ ] Hidden-seller leak test passes over all endpoints, SEO pages and notification payloads
- [ ] Personal-data leak test passes (responses, logs, notification payloads); log redaction verified
- [ ] Uploaded images: metadata stripped, private; order screenshots and identification photos deleted after 24 hours, support-request screenshots after 30 days (job verified)
- [ ] Reveal, check-now and report endpoints rate-limited; limits enforced server-side
- [ ] Critical-setting changes and personal-data views appear in the Audit Log
- [ ] No secret in client bundles
- [ ] Outbound requests respect rate limits and robots rules in production configuration
- [ ] Outlier and verification steps cannot be bypassed on the notification path
- [ ] Backups configured and a restore tested

---

## Definition of Done

A feature is complete when:
1. The user flow works end-to-end as described in `product_spect.md` and `modules.md`
2. All applicable checklist items are satisfied
3. Core product logic holds: verified in two steps; price paid from the user; cheaper sellers hidden until revealed, on every surface the feature touches
4. Data isolation proven with a second user; permission-matrix, hidden-seller and personal-data leak tests pass
5. Prices and stock show their age; durations say "at least"; estimates say "tahmini"; failed checks keep the last value
6. User actions recorded in the activity history; admin actions in the Audit Log
7. Interface built only from tokens and existing patterns; light and dark verified; one deal action per surface; the screen's row in `screen_status.md` is current
8. All strings from the catalogue; Turkish and English verified
9. Loading, empty, error, stale and success states handled; double-submit protected
10. Background jobs idempotent; provider usage metered
11. Verified on desktop and phone widths in the supported browsers
12. Production quality: no temporary workaround, disabled test or "fix later" note left behind
