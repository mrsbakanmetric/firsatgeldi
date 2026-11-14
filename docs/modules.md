# FırsatGeldi — Modules

> **Version:** 1.3
> **Status:** Approved — roles, web/mobile access, histories, fraud tracking, image handling and personal-data protection included; items marked "to be decided later" remain open
> **Last updated:** 2026-11-14
> **Scope:** Web and mobile screen coverage defined; mobile **technology** [OPEN].

This document defines **each module's screens, the information it shows, its actions, rules and states**. What the product does comes from `product_spect.md`; look-and-behaviour rules from `product_design_pattern.md` + `design-tokens.json`; technical structure from `architecture.md`; acceptance rules from `engineering_checklist.md`.

**Labels:** **[DECIDED]** approved by the product owner · **[RECOMMENDED]** proposal, awaiting approval · **[ASSUMPTION]** reasonable default taken where no answer was given · **[INTERIM]** decided for now, to be revisited · **[DECIDE LATER]** intentionally deferred · **[OPEN]** intentionally left open, no assumptions made.

Modules are referred to **by name only** (no short codes). Turkish UI strings are quoted as they appear in the product.

---

## Contents

**User modules (web)**
- [Shared Rules (all modules)](#shared-rules-all-modules)
- [Home](#home)
- [Search and Add (identify → mark → confirm)](#search-and-add-identify--mark--confirm)
- [Tracked Items](#tracked-items)
- [Product Detail](#product-detail)
- [Hidden Seller (Show / Hide)](#hidden-seller-show--hide)
- [Price and Stock History](#price-and-stock-history)
- [Ratings, Reviews and Seller Trust](#ratings-reviews-and-seller-trust)
- [Return Window, Order Status, Return Guide](#return-window-order-status-return-guide)
- [Want to Buy (target price)](#want-to-buy-target-price)
- [Check Now](#check-now)
- [Notifications and Preferences](#notifications-and-preferences)
- [My Savings](#my-savings)
- [Discover and Community](#discover-and-community)
- [Profile and Following](#profile-and-following)
- [Trust and Accuracy (reporting)](#trust-and-accuracy-reporting)
- [Settings and Account](#settings-and-account)
- [Sign-in and Sign-up](#sign-in-and-sign-up)
- [Packages and Premium](#packages-and-premium)
- [Landing Page](#landing-page)
- [Legal Pages](#legal-pages)
- [Help and FAQ](#help-and-faq)

**Admin modules (web + mobile `/admin`, Application Manager role — roles [DECIDED])**
- [Admin Overview](#admin-overview)
- [Return Rules](#return-rules)
- [Category Templates](#category-templates)
- [Campaign Calendar](#campaign-calendar)
- [Platforms and Source Health](#platforms-and-source-health)
- [Reports and Match Corrections](#reports-and-match-corrections)
- [System Settings](#system-settings)
- [Provider Usage and Cost](#provider-usage-and-cost)
- [Users](#users)
- [Audit Log](#audit-log)
- [Notification Templates](#notification-templates)
- [Catalogue and Products](#catalogue-and-products)
- [Package Settings and Requests](#package-settings-and-requests)
- [Legal and Content](#legal-and-content)
- [Support Requests](#support-requests)
- [History Explorer](#history-explorer)
- [Fraud Monitoring](#fraud-monitoring)
- [Roles and Permissions](#roles-and-permissions)

**Appendices**
- [Appendix A — Build order](#appendix-a--build-order)
- [Appendix B — Market gaps and differentiators](#appendix-b--market-gaps-and-differentiators)
- [Appendix C — Open questions](#appendix-c--open-questions)
- [Appendix D — Impact on other documents](#appendix-d--impact-on-other-documents)
- [Appendix E — Screen design plan](#appendix-e--screen-design-plan)

---

## Roles, platforms and access

### Roles [DECIDED]
| Role | Who | What they can do |
|---|---|---|
| **Guest** (not a role; no data representation — an explicit **public allow-list** of endpoints in the API [DECIDED 2026-11-13]) | Signed-out visitor | Landing Page, SEO product pages, legal pages, help; search and mark (sign-in at confirmation) |
| **User** | Everyone who signs up | All user modules, **own data only** |
| **Application Manager** | Authorised administrator | **Sees and manages everything, everywhere — web and mobile.** All users' data, hidden seller identities, all histories, all admin modules. Applies critical settings **alone** (no second approval; audit log + one-click rollback). |

- Authorisation is **data**: every screen and every action is bound to a **permission key** (e.g. `tracking.own.write`, `admin.users.view`, `admin.offers.view_hidden_seller`). The full **permission catalogue** is in `database.md` §4 [DECIDED 2026-11-13]. The Application Manager role holds every permission; a future role (support, moderator…) is added by selecting permissions, with no code change.
- The Application Manager role cannot be deleted and there is always **at least one** Application Manager.
- Every Application Manager view and action is written to the **Audit Log** (especially personal data and hidden seller identities).
- Mobile **technology, infrastructure and decisions** are [OPEN]; the matrix below only defines **which screens exist on mobile** and their permissions. Mobile uses the same API and the same permission checks.

### Access matrix [DECIDED]
✓ access · ◐ partial (see note) · — no access

| Screen / module | Web | Mobile | Guest | User | App. Manager |
|---|---|---|---|---|---|
| Landing Page | ✓ | ✓ | ✓ | — (goes to Home) | ✓ |
| SEO product pages | ✓ | ✓ | ✓ | ✓ | ✓ |
| Home | ✓ | ✓ | — | ✓ own | ✓ own + any user's (read-only) |
| Search and Add | ✓ | ✓ | ◐ search + mark | ✓ | ✓ |
| Tracked Items | ✓ | ✓ | — | ✓ own | ✓ all users |
| Product Detail | ✓ | ✓ | — | ✓ own | ✓ all users, seller identities visible |
| Hidden Seller (Göster) | ✓ | ✓ | — | ✓ with allowance/token | ✓ always open, no allowance used, recorded |
| Price and Stock History | ✓ | ✓ | ◐ seller-less on SEO page | ✓ | ✓ per seller |
| Return Window | ✓ | ✓ | — | ✓ own | ✓ |
| Want to Buy | ✓ | ✓ | — | ✓ | ✓ |
| Check Now | ✓ | ✓ | — | ✓ within allowance | ✓ unlimited |
| Notifications and Preferences | ✓ | ✓ (+ push) | — | ✓ own | ✓ own + admin notifications |
| My Savings | ✓ | ✓ | — | ✓ own | ✓ all users |
| Discover and Community | ✓ | ✓ | — | ✓ | ✓ + moderation |
| Profile and Following | ✓ | ✓ | ◐ public profiles | ✓ | ✓ |
| Trust and Accuracy | ✓ | ✓ | — | ✓ reports | ✓ resolves |
| Settings and Account | ✓ | ✓ | — | ✓ own | ✓ own |
| Sign-in and Sign-up | ✓ | ✓ | ✓ | — | — |
| Packages and Premium | ✓ | ✓ | — | ✓ own | ✓ |
| Legal Pages | ✓ | ✓ | ✓ | ✓ | ✓ + edits |
| Help and FAQ | ✓ | ✓ | ✓ | ✓ | ✓ + edits |
| **All admin modules** | ✓ | ✓ | — | — | ✓ sees + manages |

**Notes:**
- "Any user's" view is **view-as-user**: the Application Manager opens a user's screens as that user sees them, **read-only**; no action is taken on the user's behalf and every opening is recorded [RECOMMENDED].
- Admin modules work on mobile with the same permissions; long editing screens (rich text, templates) are fully functional on mobile, with layouts adapted to screen size.
- The admin panel lives at `/[locale]/admin` on the web; every page and endpoint is permission-checked **on the server**; hiding in the client is cosmetic only.

---

## Shared Rules (all modules)

These rules apply to every screen and are not repeated in each module.

| # | Rule | Source |
|---|---|---|
| 1 | Nothing is tracked until the product is verified in two steps (mark → confirm) | spec §0 |
| 2 | The owner of an offer is the seller; the platform is only where it is sold | spec §0 |
| 3 | A cheaper seller's **name, rating, platform and link** appear nowhere until "Göster" (text, charts, notifications, email, page source, image URLs) | spec §0, architecture §6 |
| 4 | Hidden sellers are referred to by rank: "en ucuz satıcı", "2. ucuz satıcı" | spec §0 |
| 5 | The seller and platform the user bought from are always visible | spec §0 |
| 6 | Every price/stock value states **when it was checked**; durations say "at least" | design §5.5 |
| 7 | One primary action per block; the coral "Fırsatı gör" at most once per surface, only for a deal | design §4–5.3 |
| 8 | Known data shows immediately, fresh data arrives in the background; no blank waiting screens | design §6 |
| 9 | Every screen draws five states: loading (skeleton) · empty · error · stale · success | checklist |
| 10 | Every product shown anywhere carries its product image (category illustration as fallback) [DECIDED] | design §5.30 |
| 11 | Every list has a search field; every product list has a category filter (chips or select, with counts) [DECIDED] | design §5.30 |
| 12 | Status is never conveyed by colour alone (icon + text) | design §2.3 |
| 13 | All text comes from the catalogue (tr default, en second); store data is not translated | spec §3.2 |
| 14 | Money: `25.997 TL` (tr) / `TL 25,997` (en); saving always a positive amount + "kazanç" | design §5.9 |
| 15 | Reversible actions undo in one tap; irreversible actions ask for confirmation | design §4.2 |
| 16 | Stock and price are re-checked before going to the store; if gone, the user stays in the app | design §4.2 |
| 17 | No hard-coded values, sizes or colours; tokens and defined patterns only | design §8 |
| 18 | Every screen and action is bound to a permission key; checks happen **on the server** (web and mobile alike) [DECIDED] | Roles and access |
| 19 | **Every user action** (search, add, reveal, check, report, share, sign-in) is written to the activity history; histories are kept **indefinitely** and anonymised when the account is deleted [DECIDED] | History Explorer |
| 20 | The Application Manager always sees hidden seller identities; every view is recorded [DECIDED] | Roles and access |
| 21 | Email and phone are **masked by default on every screen** (`m***@g***.com`, `+90 5** *** ** 67`); passwords are never shown or logged [DECIDED] | database §14c |
| 22 | Images uploaded by a user (order screenshot, identification photo) are visible only to them and **deleted after 24 hours**; no personal data (name, address, phone, order number) is taken from images [DECIDED] | architecture §11a |

**Shared components:** every module is built from the canonical component list in `pagedesign.md` §5 [DECIDED 2026-11-13] (e.g. `Flag`, `MoneyDisplay`, `PriceHistory` / `PriceSparkline`, `StockHistory` / `StockStrip`, `HiddenOfferCard`, `ConfirmPanel`, `HeroBlock`, `AllowanceMeter`, `EmptyState`, `StatusBanner`). A new one is added there and to the design pattern document first.

---

## Home

**Purpose:** Let the user see and act on their most urgent item without opening another screen. (spec module 28, §5.1)

**Route:** `/[locale]` — the first screen after sign-in. Page layout: `pagedesign.md` §8.1.

### Information shown (in order)

**Top summary line [DECIDED]:** "Takipte 4 ürün · 38.400 TL koruma altında · tümü 4 dk önce kontrol edildi" — protected amount and freshness in one line.

**A. Search box (top, for everyone)** — text + add photo; recent searches. **While typing [DECIDED]:** an area opens right under the box (pushing the page down, not overlaying it) with the first **3 catalogue matches as image tiles** (image, name, category, number of stores, "Seç ve ekle"), updated on every keystroke, plus "Tüm sonuçları gör (N)"; clearing the text closes it. **Hand-over to Search and Add [DECIDED]:** a tile → Search and Add at "Hangisi seninki?" with that product marked and the confirm panel open · Enter / "Ara" / "Tüm sonuçları gör" → Search and Add at "Hangisi seninki?" with all matches, nothing marked · a pasted store link → straight to the confirm panel, filled from the link · "Fotoğraf ekle" → Search and Add input step with the upload. Typed text and photos carry over; browser back returns to Home as it was.

**B. "Hemen Gözat" — one priority product, at detail level**
- Selection order: (1) open deal, nearest return deadline first · (2) return ≤ 3 days · (3) target price reached · (4) most recent price/stock change.
- Flags: deal found · days left to return · want-to-buy.
- Product name + purchase line (bought · seller/platform · price · date · order status).
- 14-day price history (compact) + one-sentence conclusion.
- 14-day stock history of the cheapest offer + "en az N gündür stokta".
- "N satıcıda daha ucuz · en çok kazanç X TL" + **every** cheaper offer on its own line (price, stock, duration, hidden seller, Göster).
- Quick actions: **Fırsatı gör** (coral, opens detail) · open return policy · Şimdi kontrol et.

**Return reminder line [DECIDED, v1]:** even without a deal, for items whose return window ends within 2 days: "İade edecek bir şey var mı? N ürünün iade süresi 2 gün içinde bitiyor" — one line, links to those items. Also sent as a notification (Notifications and Preferences).

**C. Other tracked items — compact rows**
- Flag, name, purchase line or target price, one-line state, one action. Total count + "Tümü" link (Tracked Items).

### Rules
- If the user tracks anything, the screen opens **from cache immediately** and refreshes in the background.
- One coral action, in Hemen Gözat only; actions in other blocks are secondary. The "Fırsat geldi" flag and the unread-deal bell counter are neutral on Home because "Fırsatı gör" is the surface's one coral element [DECIDED]. Hemen Gözat lists up to 3 cheaper offers; more are in Product Detail [DECIDED].
- **Two urgent items [DECIDED]:** Hemen Gözat keeps one product; a second item at the same priority level sits at the top of list C as a compact row with an **emphasised border**.

### States
| State | View |
|---|---|
| New user [DECIDED] | Search box + three steps below it: **Ekle → Biz takip edelim → Fark senin** (no interest picker) |
| Tracking, no deal | Hemen Gözat shows the item with the nearest return deadline: "Şu an senin fiyatın en ucuz" |
| Everything being checked | Old data + its age; small progress on rows |
| Source error | Last known value + age; subtle "Bazı mağazalara ulaşılamadı" note |

### API
`GET /home` · `GET /me/stream` (SSE) · `POST /offers/:ref/reveal|hide` · `POST /tracked-items/:id/check-now`

---

## Search and Add (identify → mark → confirm)

**Purpose:** The user adds a product they bought or want **correctly, in under 10 seconds and at most 3 steps**. (spec modules 1, 4, 11; §5.2)

**Route:** `/[locale]/ara` — page layout: `pagedesign.md` §8.2

### Steps

**1. Input** — one field: text and/or photos (product, label, order screenshot) together. Autocomplete from our own catalogue. Pasted links are detected.
- **Multiple images [DECIDED]:** up to **5** images at once (setting); each uploads with its own progress; if one is rejected ("unsupported file", "too large") the others continue; order is kept. Limits: file ≤ 10 MB, JPEG/PNG/WebP/HEIC.
- Note on the upload screen: "Görselin yalnız ürünü tanımak için kullanılır, 24 saat sonra silinir; ad, adres gibi bilgilerin kaydedilmez."

**2. "Nasıl anladık"** — extracted attributes (type, brand, model, bundle/variant) as chips; one-tap alternatives for the match-critical attribute most likely to be wrong. At most 1–2 questions.
- **Change an attribute [DECIDED]:** every chip opens a list of values from the category template (plus "type it if not listed"); picking one re-runs the search with that value. Changing a match-critical attribute (type, brand, model, generation, bundle) clears the mark; changing type re-reads the other attributes. A "Geri al" control restores the previous value in one tap. A value applies on one click (no separate apply step); no warning is shown before a match-critical change — instead a short "<attribute> değişti · Geri al" toast appears after it [DECIDED 2026-11-14]. The confirm panel appears in the right column only once a product is marked; before that the step has no right column (Search and Add design v2, 2026-11-14).
- **Autocomplete [DECIDED]:** while typing, the **first three matches appear instantly as image tiles** (only when there are 4 or more matches; with 1–3 matches the list alone is shown, so no product appears twice [DECIDED 2026-11-14]) (image, name, category/variant, number of stores) and update with every keystroke; all matches are listed in a **scrollable list**; the item under the pointer or keyboard (↑/↓) is the active one and its **preview** (large image, category, name, brand, generation, colours, bundles, number of stores; no price, no store) shows to the right, with "Bu ürünü seç". All from our own catalogue (product image, name with the typed part bold, category/variant, number of stores — no prices, no store names), a typo correction row ("Bunu mu demek istedin"), a category search row and recent searches (each hideable). A pasted link shows the detected platform and product with "Bu linkle devam et"; no catalogue match offers a live store search.

**3. Mark ("Hangisi seninki?")**
- The list holds **products/variants only**: image, name, model/generation, bundle, colour, number of stores found.
- **No store names and no prices.**
- The user **marks** one (secondary button); reversible; nothing is saved.
- "Similar but different" (other generation, bundle, accessory) is separate and collapsed; opens on request.
- If there is no exact match, say so + show the closest three.

**4. Confirm ("Emin ol, sonra onayla")** — panel for the marked product
- **The listing you bought [DECIDED]:** platform choice; the list ends with **"Diğer"** [DECIDED 2026-11-14] — the user types the platform name; no return rule is known, so the user enters the return last day (empty = "iade süresi bilinmiyor"); the seller is saved as typed (no exact-match check); price tracking continues in the known stores. Frequent "Diğer" names are listed for admins [RECOMMENDED, not built now]; the seller is entered by the user — typed name confirmed by exact match, or taken from their own link/screenshot. **No seller list is shown**, so no hidden seller's name can appear. Then: seller rating, stock, warranty type, last checked, open listing. The found listing shows seller rating, stock and warranty as **three tiles in three columns**, each good (green check) or bad (red cross) with its label [DECIDED]; the good/bad cut comes from the seller trust indicator (Ratings, Reviews and Seller Trust), store rating alone as fallback [DECIDED 2026-11-12].
- **Price paid [DECIDED — R1]:** **not prefilled from our data**; the user types the price they paid. Prefilled (editable) only when read from the user's own link or order screenshot. Our job is to find a lower price than that.
- Order date, order status (ordered / shipped / delivered).
- Return window: last day suggested from the platform × category rule, editable in place (the date is the control) [DECIDED 2026-11-14]. Warning for categories without a withdrawal right.
- **Cheaper-price teaser** (if any) **[DECIDED]:** appears only after the price paid is entered or prefilled; count + maximum saving + per-line saving/stock, hidden seller, Göster.
- Final actions: **Evet, bunu aldım** (primary) · **Almadım, sadece takip et** (secondary → Want to Buy fields open). The actions stay visible at the bottom of the panel; a quick **"Evet, bu"** next to "Değiştir" runs the same confirm, or moves to the first missing required field [DECIDED 2026-11-14].

### Rules
- Tracking never starts on one tap. The confirm endpoint is idempotent.
- **Duplicate add [DECIDED]:** if the same product is already tracked in the same mode, no new record → "Zaten takip ediyorsun" + open the existing record.
- **Guest [DECIDED]:** search and marking are allowed without signing in; sign-in is required at "Evet, bunu aldım" / "Sadece takip et", after which the user returns to the confirm panel where they left off (marked product and typed values kept).
- Clothing / products without brand or model code → same-seller tracking only, stated explicitly.
- **Seller lookup [DECIDED 2026-11-14]:** typing the seller in the confirm step is an exact-match lookup for signed-in users only (guests reach sign-in first); at most `seller_lookup.rate_limit_per_minute` (10) per user, above it "Çok sık denedin. Biraz bekleyip tekrar dene." (`RATE_LIMITED`).
- **Not in the catalogue → search stores [DECIDED 2026-11-14]** (design autocomplete case C): autocomplete shows matches from our own catalogue only. With no result, "Mağazalarda ara" sends the typed text to the normal identification (`POST /identify`, no separate endpoint): live sources are searched, the result is cleaned and saved to the catalogue, and the user continues at "Hangisi seninki?". Nothing found there either → "tam eşleşme yok" + the closest three; closed category → "henüz desteklenmiyor". Guests allowed (`identify.use`); the search is recorded (`search_events`, source `SEARCH_BOX`).
- **Photo status [DECIDED 2026-11-14]:** reading an upload's status has its own permission key `upload.own.view`, separate from uploading (`upload.own.create`); it is open to guests and covers only one's own uploads (guest: own session; user: own account).
- **Photo status for guests [DECIDED 2026-11-14]:** a guest sees only the uploads of their own session; guests get no live updates, so the page asks for the status every `upload.guest_poll_interval_seconds` (2) for at most `upload.guest_poll_max_seconds` (60), then shows the error state. Each status read is logged.

### v1 helpers [DECIDED]
- **Link detection:** pasting a store link fills product, seller and price paid from the link; "Nasıl anladık" is skipped, straight to mark/confirm.
- **One-shot fill from screenshot:** product + seller + price + order date are read from an order screenshot; the user only checks and confirms.
- **Bulk add:** if a screenshot contains several products, "N ürün bulduk" → mark → confirm each in turn; skippable, the rest are kept.
- Adding by email forwarding is **not** in v1 (backlog).

### Edge cases
- If the LLM does not respond, fall back to plain text search; the user does not notice.
- If the live query is slow, the first 3–5 candidates come first.
- Photos only feed the search; location and other metadata are stripped and the image is deleted after 24 hours [DECIDED].

### Open questions
- [OPEN] Should more expensive sellers be shown by name? (spec §17-7)

### API
`GET /search/autocomplete` · `POST /uploads/presign` · `POST /uploads/complete` · `GET /uploads/:id` · `POST /identify` · `POST /identify/:requestId/answer` · `GET /products/:id` · `GET /products/:id/similar` · `GET /products/:id/confirm-context` · `POST /products/:id/seller-lookup` · `POST /products/:id/teaser` · `POST /tracked-items`

---

## Tracked Items

**Purpose:** See every tracked product's state in one list, in priority order. (spec §5.3)

**Route:** `/[locale]/takip` — page layout: `pagedesign.md` §8.4

### Information shown
- **Summary:** tracked count · open deals (count + total maximum saving) · returns approaching (count + nearest date) · last check.
- **Filters (with counts):** All · Bought · Want to buy · Has deal · Ended.
- **Sorting [DECIDED]:** Priority (default = Home priority order) · Return date · Saving.
- **Each product:** flags · name · purchase line or target price · compact price history + conclusion · compact stock history (of the cheapest offer when a deal exists, otherwise of the seller bought from) · state ("N satıcıda daha ucuz · en çok X TL" / "Senin fiyatın en ucuz" / "Hedefe X TL kaldı") · one action.

### Rules
- Cheaper seller names **never** appear in this list (no Göster here; reveal happens on Product Detail and Home).
- **Ended items [DECIDED]:** ended / expired tracking appears both under the **"Ended" filter** and **dimmed at the bottom** of "All" (below active items regardless of sorting). Not shown in other filters. A dimmed row shows: name, end reason and date, saving amount if recorded.
- **Bulk "Görünenleri kontrol et (N)" [DECIDED]:** checks the visible (filtered) active items in one go; each product uses one from the daily allowance; if the allowance is not enough, the number to be checked is stated in advance ("Kalan hakkın 3 · ilk 3 ürün kontrol edilecek"). Items checked within the cache window (default 5 min) do not use an allowance. May later be tied to permissions/packages [OPEN].

- **Layout [DECIDED]:** List template; summary tiles (4) → filters + sort + bulk check with the remaining allowance written under it → aligned rows (product · 14-day price sparkline: paid solid, cheapest dashed, target dotted · 14-day stock boxes · state + check time · "Detay"). No coral on this page.
- **Ürün ekle [DECIDED 2026-11-14]:** "Ürün ekle" opens **Search and Add** (`/[locale]/ara`); there is no separate Add product dialog (it duplicated Search and Add). After confirming, the user returns to Tracked Items. Rows link to Product Detail as a whole (no "Detay" button); "Biten takipler" is collapsed by default.

### States
- Empty: "Henüz takip ettiğin ürün yok" + add product + slot allowance.
- Empty filter: "Fırsatı olan ürün yok · son kontrol 5 dk önce" + "Tümünü göster".
- Bulk check: allowance not enough → "Bugün 3 hakkın kaldı · ilk 3 ürün öncelik sırasıyla kontrol edilir"; then progress (N/M) per item; the user may leave the page.
- Stale: a row whose source could not be checked shows "Güncel değil", the last known price and its age; the deal is shown as "doğrulanamadı". Threshold `tracking.stale_hours` [ASSUMPTION]: at least 6 hours.
- Error: "Takip listen şu an yüklenemedi" + "Tekrar dene"; tracking itself continues.
- Loading: skeleton with the same column sizes.

### API
`GET /tracked-items?filter=&q=&category=` · `GET /tracked-items/summary`

---

## Product Detail

**Purpose:** See everything about one product and use the deal step by step. (spec §5.4)

**Route:** `/[locale]/takip/[id]` — page layout: `pagedesign.md` §8.3

### Sections (in order)
1. **Header:** product name · seller + platform bought from · purchase line · order status · return countdown + last day (or expired / no withdrawal right).
2. **Deal summary** (when a deal exists, `HeroBlock`; its action is the secondary "Satıcıları gör", which scrolls to the offers — no coral button on this screen [ASSUMPTION]): number of cheaper sellers · best price · when it dropped · when price/stock were last verified on the page · maximum saving · jump to offers.
3. **Price history** (full): ranges per Price and Stock History · two series + "Aldın" point + deal point (emerald, because the `HeroBlock` flag is the surface's one coral element [ASSUMPTION]) · summary values (paid, cheapest now, 7- and 30-day low/high, average).
4. **N cheaper sellers:** full content width, a grid of **at most 2 columns** (2 offers side by side; an odd last offer spans the full width) [DECIDED]; cheapest first; each row shows price, previous price, saving, warranty, stock + duration, price duration, shipping cost, delivery time, last check, Göster. After reveal: seller, rating, platform, **Mağazaya git**, Gizle.
   Reference row: the seller bought from (price, stock, "fark yok").
5. **Stock history:** full content width; **last 14 days and last 1 month side by side** in the same block [DECIDED], per seller (by rank + seller bought from), key (incl. "no data"), "at least" durations, dated change log.
6. **Action steps:**
   1. Create the return/cancel request first (or **request a price difference** if there is no withdrawal right), with the own seller's return link; warning "önce satın alırsan iki ürünle kalabilirsin".
   2. Re-order from the cheaper seller (reveal required).
   3. **Takibi bitir** → saving recorded in My Savings.
7. Bottom actions: Şimdi kontrol et · report wrong price / different product.

### v1 helpers [DECIDED]
- **Ready price-difference message:** a customer-service text (product, order date, price paid, current price, requested difference) copied in one tap; the Turkish version is always available since the seller works in Turkish. The hidden seller's name **never** appears in it (it goes to the seller bought from).
- **Net saving including shipping:** if the offer's shipping cost is known, saving = `paid − (price + shipping)`; if unknown, a "kargo hariç" note. Ranking also uses the net price.
- **Return deadline to calendar (.ics):** one tap in the header and detail; reminder one day before the last day.
- **Fake-discount note:** if the listing claims "X% indirim" or an old price that our history has not seen in the last 30 days, a neutral note ("Son 30 günde bu fiyattan satılmadı"). No accusing language; no note when history is insufficient.

### Rules
- **Step ticks [DECIDED]:** steps are ordered and can be ticked "Yaptım ✓" so the user sees where they are. Step 2 is open even before step 1 is ticked, but shows the "önce iade talebini oluştur" warning. Ticks are reversible.
- **Shipping and delivery time [DECIDED]:** visible on every offer before reveal (they do not identify the seller).
- "Mağazaya git" re-checks stock/price; if sold out, the next offer + "stoğa gelince haber ver".
- Ending tracking: if a deal was used, the new price is asked (prefilled) and the saving recorded; not reversible → asks for confirmation. A "did not use the deal" option records a missed deal without saving [ASSUMPTION].
- **Return window expired [ASSUMPTION]:** offers and "Göster" are removed; price and stock history stay readable.
- **Price difference as a separate method [DECIDED]:** when ending tracking, the method is chosen — return + re-buy · cancel + re-buy · price difference (refunded as money / coupon). My Savings shows it separately.

### API
`GET /tracked-items/:id` · `/offers` · `/price-history` · `/stock-history` · `POST /offers/:ref/reveal|hide|go|notify-back-in-stock` · `POST /tracked-items/:id/end` · `POST /reports`

---

## Hidden Seller (Show / Hide)

**Purpose:** Show that a cheaper offer exists and how much it saves, reveal who sells it only through the reveal action; later the same control becomes the revenue gate. (spec module 27)

**Where:** one component — Home, the add panel, detail offers, stock history. (No reveal in Tracked Items.)

### View
| Before reveal | After reveal (in place, no navigation) |
|---|---|
| 🔒 "Satıcı gizli" + rank label | Seller name + rating (first) |
| Price, previous price, saving | Platform (neutral label) |
| Stock + duration, warranty, price duration, shipping cost, delivery time, last check | **Mağazaya git** (primary) |
| **Göster** (secondary) | **Gizle** (ghost) |

### Rules
- Each cheaper seller has its own Göster. Identity comes from the server only in the reveal response.
- **Platform and seller name [DECIDED — A3]:** both hidden until "Göster". Revealing happens when the user presses Göster, **with the entitlement granted by the package process** (allowance / token / Premium — see Packages and Premium).
- **Want-to-buy mode [DECIDED — §17-8]:** same rule; all cheaper sellers hidden, revealed through the package entitlement.
- **Reveal lifetime [DECIDED]:** a revealed seller stays visible for **1 week**, then is hidden again; revealing again goes through the gate again. The user can press Gizle at any time. Duration is a **parameter** in `system_settings` (`reveal.open_hours`, default 168), no deploy needed (System Settings).
- **Price protection [DECIDED]:** (1) "Mağazaya git" re-checks price/stock; if the price rose, "fiyat değişti" is shown and the user stays in the app; (2) if the price rises within 1 hour after reveal, a notification is also sent. Window is a parameter (`reveal.price_watch_minutes`, default 60). Becomes the refund trigger once tokens exist.
- Every reveal, hide and expiry is recorded.
- Space for a cost/allowance note is **reserved in the component now**.

### Gate
| | First release | When the package process is live [spec §17-9] |
|---|---|---|
| Göster | **Free, unlimited** [DECIDED] — `FreeToggleGate`; reveals still recorded | Use allowance / spend token / Premium |
| Offer changed | "Fiyat değişti" warning | Automatic refund |

### API
`POST /offers/:ref/reveal` · `POST /offers/:ref/hide`

---

## Price and Stock History

**Purpose:** Explain price and stock movement without needing explanation. (spec modules 3, 3a, 29; §5.5)

**Where:** two components, two sizes — compact (Home, lists) and full (detail). Same data, same colour and line rules.

### Price history
- Period + start/end dates ("bugün").
- Two series, labelled directly with **current value written out**: what you paid (solid, ink) · cheapest now (dashed, emerald, seller unnamed).
- "Aldın" hollow point; deal coral point.
- State variants: nothing cheaper → "Senin fiyatın en ucuz" · tracking stopped → stop date · want-to-buy → dotted target line + value.
- One-sentence conclusion ("Fiyat 3 saat önce 25.997 TL'ye düştü").
- Full version adds axes, range selection, summary values and a text description of the chart (accessibility).
- **Ranges [DECIDED]:** 2 weeks · 1 month · 3 months · 6 months · 1 year · **2 years · Tümü** (added [DECIDED 2026-11-12] as data accumulates). A range without full data is not disabled; it shows what exists with a "veri N günlük" note.
- **Where the lowest was [DECIDED 2026-11-12]:** the period's lowest price is marked with its date; the seller is referred to **by rank at that time** ("o gün en ucuz 2. satıcıydı") and named only after Göster.
- **Pre-tracking history [DECIDED]:** shown when available (another user's tracking or a backfill source); drawn **dimmed** up to the tracking start, with a "Takip başladı" marker.
- **Buy-or-wait hint [DECIDED, all modes]:** one factual line — "Son 30 günün en düşüğü", "Son 6 ayın en düşüğüne X TL var", "11.11'e 5 gün var". No prediction or advice language; hidden when evidence is insufficient. Helps the return decision in bought mode and the buying decision in want mode.

### Stock history
- One box = one day; dates under the first and last box.
- Three states, also distinct by fill: in stock (solid emerald) · low stock (solid amber) · out of stock (hollow, dashed red border). The key is always visible.
- Which seller it refers to (by rank, or "aldığın satıcı").
- Conclusion: "Şu an stokta · en az 3 gündür".
- Dated change log on the detail level (newest first).

### Rules
- Days before tracking with no data are blank/neutral; nothing is guessed.
- Exact stock quantity is never shown (not known).

### API
`GET /tracked-items/:id/price-history?range=14d|1m|3m|6m|1y|2y|all` · `GET /tracked-items/:id/stock-history?range=`

---

## Ratings, Reviews and Seller Trust

**Purpose:** Help the user judge the product and the seller with numbers no single store shows, without breaking the hidden-seller rule. (Competitive analysis 2026-11-12: seller trust, verified reviews.) [DECIDED 2026-11-12]

### Store ratings (read, not copied)
- **What is read:** the product's **average rating and rating/review count** per store (from the product page we already fetch for prices — JSON-LD `AggregateRating` first, then the page; Google Shopping results also carry them). **Star distribution** (how many 5★, 4★…) only where the store exposes it; otherwise the average alone. The seller's own rating and count (already read).
- **What is never taken:** review texts, reviewer names or photos — they belong to the store and the author. A "Yorumları mağazada oku" link is offered after reveal instead.
- **Before Göster:** one product-level figure across stores, **no store names**: "4 mağazada 3.850 değerlendirme · ortalama 4,5 ★" (+ star distribution if available). Under a minimum count the figure carries "az değerlendirme" (`ratings.min_count`, default 20 [ASSUMPTION]).
- **After Göster:** that seller's store rating and count for the product, the seller rating, and "Yorumları mağazada oku".
- Ratings show their read time like prices ("puanlar 2 saat önce okundu").
- Third-party ratings are **not** emitted as structured data on our SEO pages (they are not our reviews).

### Our buyers' answers (structured, no free text)
- When tracking ends (Takibi bitir, or the return window closes) the user who marked "Aldım" gets two optional one-tap questions: **"Satıcı fiyat farkını verdi mi?"** (Evet · Hayır · Sormadım) and **"İade ya da iptal sorunsuz muydu?"** (Evet · Sorun çıktı · Yapmadım). Also askable later from the record in My Savings.
- Only verified buyers (a tracked item in "Aldım" mode) can answer; one answer per item; answers are anonymous in every display.

### Installments (taksit) [DECIDED 2026-11-13]
- **What is read:** the installment table on the product page per offer — card programme / bank, number of instalments, interest-free or not ("peşin fiyatına"), minimum amount where stated. Not in the standard product data; read from the page, with its read time.
- **Never changes the shown price.** Shown as a note on the offer card.
- **Before Göster:** only "Peşin fiyatına en çok N taksit" (no bank, card or store). **After Göster:** the table by card programme and the conditions.
- Not read → nothing shown (never guessed). Under check: which stores expose it reliably (data test after the Product Detail drawing).

### FırsatGeldi seller trust indicator
- A per-seller indicator built from data only we have: store seller rating · **stock consistency** (stock history) · **delivery-time accuracy** · **wrong-price reports** (Trust and Accuracy) · **price-difference given rate** and **smooth return rate** (our buyers' answers) · fake-discount frequency. Weights and the good/bad cut are parameters [RECOMMENDED — confirm with real data].
- **Before Göster:** only as the good/bad tile ("Güvenilir satıcı" ✓ / "Dikkat" ✗ with the reason in words, e.g. "son 30 günde 2 kez stok tükendi") — never a number that could identify the seller. **After Göster:** the breakdown ("12 alıcıdan 9'u fiyat farkını aldı · teslim söz verilen sürede · stok tutarlı").
- Shown only above a minimum evidence count (`trust.min_signals`); otherwise "henüz yeterli veri yok".
- Replaces the open **seller-rating threshold** question: the confirm panel's rating tile uses this indicator (store rating alone is a fallback when evidence is insufficient).

### API
`GET /products/:id/ratings` (aggregate, seller-less) · revealed offer payload adds store rating, count, seller trust breakdown · `POST /tracked-items/:id/feedback`

---

## Return Window, Order Status, Return Guide

**Purpose:** The user must not lose their right: correct last day, correct action (cancel / return / price difference). (spec modules 2, 17, 19; §13)

**Where:** confirm panel (Search and Add), detail header and action steps (Product Detail), edit dialog.

### Rules
- **Start [DECIDED]:** each platform × category rule stores its start as a field (`ORDER` / `DELIVERY`). Last day = start date + the rule's days (Return Rules); the user can edit it and edits are flagged.
- **Unknown delivery date [DECIDED]:** for delivery-based rules, the last day is computed from order date + average delivery time and labelled **"tahmini"**. Once the estimated delivery day passes, a one-tap question: **"Teslim aldın mı?"** (Evet, bugün · Evet, başka gün · Henüz değil). The answer fixes the last day; the same question is also sent as a notification.
- Order status drives the action: **ordered → suggest cancel** · **delivered → suggest return** · **no withdrawal right → request price difference**.
- Phones, tablets, computers, smartwatches, drones → "return" is never suggested.
- When the window ends, tracking stops automatically and the user is informed.
- Flag: > 3 days info style · ≤ 3 days amber · expired red.
- **Frequent-return warning [DECIDED, v1]:** from the user's own records; if returns at the same platform exceed a threshold within a period, an amber warning next to the return step ("3 ayda bu mağazada 4 iade — hesabın işaretlenebilir"). Period and threshold are parameters (System Settings).

- **Request tracking ("talep takibi") [DECIDED 2026-11-12]:** in the action steps the user can mark "Fiyat farkı istedim" or "İade talebi açtım"; the item shows "Yanıt bekleniyor · N gün önce" and reminds before the return window closes ("Satıcı yanıt vermedi; iade süren 2 gün sonra bitiyor"). The user records the outcome (Verildi · Reddedildi · Kupon verildi), which feeds My Savings and the seller trust indicator. We do not contact sellers or platforms on the user's behalf.

### Next phase [DECIDED 2026-11-12]
- **Cargo tracking number:** optional field on the item; the carrier's status (kargoda · dağıtımda · teslim edildi) is read from the carrier and fixes the delivery date — and therefore the last return day — without asking "Teslim aldın mı?". Carriers first; marketplaces do not give order data to third parties.
- **Order e-mail forwarding** (later, opt-in): parse order/shipping e-mails for order date and status; heavy personal-data load, needs its own KVKK review.

### Task
- **Return rule table [DECIDED 2026-11-12]:** filled automatically from each platform's return-policy page (Return Rules); unreadable platforms use the labelled default (14 days from delivery).

### API
`GET /products/:id/confirm-context` (return suggestion at confirm) · `GET /tracked-items/:id` (rule, last day, source and read time) · `PATCH /tracked-items/:id` · `POST /tracked-items/:id/delivered` · `PATCH /tracked-items/:id/request` · `GET /tracked-items/:id/calendar.ics` · `GET /help/stores` (store rules, public)

---

## Want to Buy (target price)

**Purpose:** Buy a product not yet bought at the right price; switch to return protection after buying. (spec modules 11, 20; §5.7)

### Flow
Search → mark → **Almadım, sadece takip et** → target price (optional) + tracking duration → alert when the target is reached / on a notable drop → Göster → go to store → **Aldım** → return tracking starts with the price paid (old record closes).

### Rules
- **Tracking duration [DECIDED]:** user chooses — 1 week · 1 month · 3 months · Unlimited; default 1 month (parameter, System Settings). Time-limited tracking asks "uzatmak ister misin?" 3 days before the end; without an answer it stops. Unlimited tracking runs until the user ends it.
- **Target suggestion [ASSUMPTION]:** chips under the target field: "Son 30 günün en düşüğü" · "Son 6 ayın en düşüğü"; one tap sets the target. No chips if history is insufficient.
- **No target [ASSUMPTION]:** alerts only on a notable drop — X% or Y TL below the cheapest price at tracking start (threshold is a parameter, System Settings).
- Target price is a dotted line on the chart; state line "Hedefe X TL kaldı".
- On "Aldım", seller, price and date use the Search and Add confirm panel (same component).
- **No sale in the app [DECIDED 2026-11-13]:** FırsatGeldi has no cart or payment; the user buys on the store's site ("Mağazaya git" after Göster) and comes back to press **Aldım, kaydet**.
- Screen [APPROVED 2026-11-13]: Product Detail canvas, boards Want / WantDark — see `screen_status.md`.

### Deferred [ASSUMPTION]
- **Equivalent product suggestion** not in v1; later, only in this mode, in a separate block (spec backlog).

### API
`POST /tracked-items` (mode WANT) · `POST /tracked-items/:id/extend` · `POST /tracked-items/:id/bought`

---

## Check Now

**Purpose:** When the user wants fresh price/stock without waiting. (spec module 24)

### Rules
- **Cache window [DECIDED]:** if the product was checked in the last **5 min**, no new check runs; that result is shown and no allowance is used. Default 5 min, editable in the admin panel (System Settings).
- **Daily allowance [DECIDED]:** **10** checks per user per day; default 10, editable in the admin panel (Package Settings and Requests). Enforced on the server; tied to packages/permissions (Packages and Premium).
- **Remaining allowance [INTERIM]:** shown next to the button ("Bugün 7 hakkın kaldı"). 📌 Design note: the display will be designed separately (Appendix E).
- Known offers' pages are checked (not a full discovery).
- Progress shown in place; age becomes "az önce" when done; changed rows update in place.
- Automatic check frequency is not exposed to the user.
- Works per product (Home, Product Detail) and in bulk (Tracked Items); bulk use draws from the same daily allowance.

### States
- Allowance used up: button disabled + reason ("Yarın tekrar · ya da Premium").
- Some stores unreachable: reachable ones update, others keep the old value + age.

### API
`POST /tracked-items/:id/check-now` · SSE `check.finished`

---

## Notifications and Preferences

**Purpose:** Say the right thing at the right time without being annoying. (spec modules 6, 16; §10)

**Where [DECIDED]:** a **panel** opened from the bell in the top bar (side panel, last 10) + a **separate page** via "Tümünü gör" at `/[locale]/bildirimler`. Page layout: `pagedesign.md` §8.5.

### Screens [DECIDED]
- **Page (List template, 2 columns):** title + unread count · "Tümünü okundu yap" · "Bildirim ayarları" link (→ Profile › Settings › Notifications; preferences are **not** edited on this page). Filters with counts: All · Deal (deal found + deal ended) · Return (return window + delivery question) · My searches · Other; "Yalnızca okunmamışlar". Items grouped Today / Yesterday / This week.
- **Notification row:** unread dot · **product image (always shown; 80 px)** with the type as a small corner badge (account notifications show a lock tile instead) · type + time · title · message · **mode badge** ("Aldım" / "Almak istiyorum" / "Takipte değil") + check time · one action (a second text action when needed). Rows align in fixed columns.
- **Right column "Senin için":** latest drops in the user's tracked list (image, mode, drop amount, price, when) · recent searches not tracked (drop shown in green, otherwise "değişiklik yok"; each with "Takip et") · frequent searches as chips. Prices are the cheapest offer; never a seller name.
- **Bell panel + preview:** clicking an item in the panel marks it read and opens a **preview to the left of the panel**: product image, mode, message, three key values for that type (e.g. paid · cheapest now · saving; delivered · last return day · days left; target · cheapest now · left to target), 14-day cheapest-price chart where relevant, check time, and the item's actions ("Fırsatı gör" / "Ürün detayı" / "Takip et" / "İade adımları"…).
- **"Takip et" from a notification or recent search:** opens **Search and Add** with the product marked and the confirm panel open [DECIDED 2026-11-14]: "Aldım" (platform, typed seller with exact-match check, price paid, order date, order status; cheaper-price teaser after the price) or "Almak istiyorum" (optional target with suggestion chips, tracking duration). Same rules as Search and Add / Want to Buy.
- **Delivery question** is answered inside the notification ("Evet, aldım" / "Henüz değil").
- **Retention:** notifications older than 30 days (`notify.list_days`) no longer appear in the list; the records themselves are kept indefinitely as delivery evidence (`database.md` §16) [DECIDED 2026-11-13: list window only, rows not deleted]; savings and tracking records stay on their pages.

### Notification types
| Type | Example text (no seller name) |
|---|---|
| Deal found | "Bu kamerayı 28.999 TL'ye aldın; başka bir satıcıda 25.997 TL. 3.002 TL kazanç · iade için 4 gün." |
| Return approaching | "İade için 2 gün kaldı." |
| Anything to return? [DECIDED, v1] | "2 ürününün iade süresi 2 gün içinde bitiyor. İade edecek bir şey var mı?" (even without a deal) |
| Target reached | "Hedef fiyatına ulaştı: 24.500 TL." |
| Back in stock | "En ucuz satıcı yeniden stokta." |
| Delivered? [DECIDED] | "Siparişini teslim aldın mı? İade süren teslimden başlıyor." |
| Tracking ending | "Takip 3 gün sonra bitiyor, uzatmak ister misin?" |
| Saving recorded | "3.002 TL kazancın kaydedildi." |
| Price dropped (want mode, no target) | "Takip ettiğin üründe fiyat %8 düştü: 24.900 TL." |
| Deal ended [DECIDED] | "Daha ucuz fiyat artık yok; satıcı fiyatı geri yükseltti." — the earlier deal notification is dimmed |
| Searched product got cheaper [DECIDED] | "Geçen hafta aradın; en ucuz fiyat 1.200 TL düştü: 18.999 TL." + "Takip et". Only for searches not hidden by the user and not already tracked; can be turned off in settings; counts toward the daily cap; lowest priority |

**Account and security notifications [DECIDED]** — to everyone who signs up or signs in, in-app + email:

| Type | When |
|---|---|
| Welcome | Sign-up completed (incl. welcome tokens) |
| Email verification | Sign-up / email change |
| New device sign-in | Sign-in from a device/browser not seen before |
| Password changed / reset | Every password operation |
| Sign-in method added | Google/Apple linked |
| Account deletion started · restored · completed | Account deletion flow |
| Account suspended / unsuspended | Admin action (with reason) |
| Your data is ready | Data export completed |
| Package request outcome | Approved / rejected |
| Support reply | Reply to a request |
| Legal consent required | A version requiring re-consent was published |

**Admin notifications [DECIDED]** — to the Application Manager, in-app + email: high-risk fraud case · source alert · budget threshold · daily digest of pending package/support requests.

### Rules
- **Channels [DECIDED]:** on the web, in-app centre + email; push in the mobile phase. **Email is on by default for all types except** "Aradığın ürün ucuzladı" (`SEARCHED_PRODUCT_DROP`), whose e-mail is **off by default** [DECIDED 2026-11-13]; the user can turn each type on or off.
- **Daily digest [DECIDED]:** optional. Default is one-by-one; users who choose the digest get one combined notification per day (in their chosen time slot). Urgent ones (deal + return ≤ 2 days, delivery question) never wait for the digest.
- **Daily cap [DECIDED]:** default **5**, editable in the admin panel (System Settings). Return ≤ 2 days notifications are not capped.
- **Account and security notifications cannot be turned off [DECIDED]:** not capped, never wait for the digest, email always sent (legal and security requirement).
- Time preferences: Morning / Noon / Evening / Night / Always + custom range; notifications in quiet hours move to the next allowed slot.
- Priority: return soon > large saving > normal drop. When the cap is reached, lower-priority items move to the next day or the digest; no repeat for the same deal.
- Unread-deal counter is coral; other unread counters are neutral. When a deal item is open in the preview it is read, so the counter turns neutral and the preview's "Fırsatı gör" is the only coral element [DECIDED]. On the page only the first unread deal's action is coral.
- Clicking a notification opens the related Product Detail.

### Recommendations [RECOMMENDED]
- **Telegram bot** (spec §10, free channel) — instead of push during the web phase.

### Open questions
- [DECIDE LATER] Email is on by default — legal check: are notifications about the user's own tracked items service messages, or do they need commercial-message consent under ETK/İYS (outbound links carry commission)? Options: emails without store links · separate, unticked consent for deal emails (İYS registration) · follow a legal opinion. Legal opinion before launch.

### API
`GET /notifications?type=&q=&category=` · `PATCH /notifications/:id/read` · `POST /notifications/read-all` · `GET|PUT /me/notification-preferences`

---

## My Savings

**Purpose:** A clear answer to "how much did I save?"; the screen that brings users back and increases willingness to pay. (spec module 9)

**Route:** `/[locale]/kazancim` — page layout: `pagedesign.md` §8.6.

### Information shown [DECIDED, v1]
- Total saving (large number) + this month / this year.
- Per product: name, paid, re-bought, saving, method (return + re-buy / cancel + re-buy / price difference), date.
- Missed deals: total of deals that expired unused (honest, not blaming).
- **Screen [DECIDED]:** Summary template. Hero block (one per surface): total for the chosen period (Bu ay / Bu yıl / Tümü) + this month / this year / average per product + monthly bar chart. "Nasıl kazandın?" three aligned method tiles (amount, count, share). Records list with product image, method, date, first paid, re-paid, saving, "Düzelt" + days left or "Kesinleşti"; search and category chips above it. Missed deals list (image, reason, short tip, amount; not in total). Right column: "Şu an kazanabileceğin" (open deals → Tracked Items) and "Nasıl hesaplıyoruz?".
- **Correct a record:** side panel; method (incl. "Fırsatı kullanmadım" → moves to missed deals), re-paid amount (or the difference received for "Fiyat farkı"); first paid is locked (from the tracking record); live result; every change is logged.
- **After 7 days [DECIDED]:** a final record cannot be edited by the user; a mistake is corrected through a support request (Support Requests), shown as "Yanlışlık mı var? Destek talebi aç".
- **"Fırsatı kullanmadım" [DECIDED]:** available when ending tracking and when correcting a record; the record moves to missed deals.
- **Average per product [DECIDED]:** total ÷ number of saving records, shown in the hero.
- **Buyer questions [DECIDED 2026-11-12]:** each record can carry the two one-tap answers (Ratings, Reviews and Seller Trust); unanswered records show "2 kısa soru" until answered or dismissed.

### Rules
- Numbers are reproducible from stored data.
- **Re-bought price [DECIDED]:** when ending tracking, the price of the offer the user revealed / went to is prefilled and editable; manual changes are flagged on the record.
- **Editing [DECIDED]:** a saving record can be corrected within **7 days** (amount, method), then it is final. Duration is a parameter (System Settings). Every correction is recorded.
- Missed deals are informational only and not included in the total.

### Recommendations [RECOMMENDED]
- **Shareable savings card** — not in v1 (backlog); amount + product type, no seller name.
- **"Pays for itself" framing:** "Bu ay 3.000 TL kazandın" — conversion point once Premium pricing is decided (spec §11).

### API
`GET /savings?period=&q=&category=`

---

## Discover and Community

**Purpose:** Get ideas from what others in similar categories track. (spec module 7)

**Release [DECIDED]:** the slice after Home through My Savings have settled. The data model (consent, privacy, following) is built ready now.

**Route:** `/[locale]/kesfet` · main navigation item **Keşfet** between Ara ve Ekle and Kazancım [DECIDED 2026-11-12].

### Content [DECIDED]
- **Popular tracked items:** most tracked products in a category, with counts; no person names.
- **Deals caught:** "Bu üründe son 7 günde 12 kişi fırsat yakaladı"; no person names.
- **Feed from people you follow:** what they added / saved, **according to their privacy level**.
- **User links:** "cheaper elsewhere" submissions — with verification + moderation (Reports and Match Corrections).

### Rules
- Only data from users who gave explicit consent; search text is never shared.
- Another user's price paid is never shown without consent.
- The hidden-seller rule applies here too.
- User-submitted "cheaper elsewhere" links are not published before the system verifies them; reporting + moderation.
- **A shared link does not break the hidden-seller rule [DECIDED]:** a verified link is turned into an offer and shown to others as a **hidden seller** (price + saving + Göster); the raw link and seller name are never published. Otherwise Discover would bypass the reveal gate (and the future revenue model).

### Reward for sharing [INTERIM — decide later]
- If a link is verified and genuinely cheaper, the sharer gets **1 token**; monthly cap (default 10). Values are parameters (Package Settings and Requests).
- **"Fırsat Avcısı" badge** on the profile and a count of verified submissions.
- To be revisited when Discover is built.

- **Tabs [DECIDED 2026-11-12]:** En çok takip edilen · Fırsat yakalananlar · Takip ettiklerinden · Paylaşılan fırsatlar; each with search and category filter (counts). Product "Takip et" opens Search and Add with the product marked and the confirm panel open [DECIDED 2026-11-14]; "Göster" goes through the reveal gate.
- **Anonymity threshold [DECIDED 2026-11-12]:** a product appears in Discover only when at least **5** users track it [ASSUMPTION: 5] (`discover.min_trackers`); below it the category shows "henüz yeterli veri yok".
- **First-visit consent [DECIDED 2026-11-12]:** a dialog asks what to share (tracked products · deals caught · savings · **paid price as a separate consent**) and to whom; nothing pre-ticked, default "Sadece ben". Values live in Ayarlar › Gizlilik.
- **Link sharing flow:** paste link → product recognised (with image) → verification ("Kontrol ediyoruz") → **Doğrulandı** (+1 token, published as a hidden-seller offer, followers of the product notified) or **Reddedildi** with the reason (not cheaper · different model/colour · out of stock · second-hand); "Yanlış mı? Bildir".
- No coral on Discover: other people's deals are not the user's deal.

### Screen [APPROVED 2026-11-12]
Canvas "FırsatGeldi — 13 Keşfet ve Profil": Discover (4 tabs), another user's profile, Profilim, four overlays, eight states. Anatomy: `pagedesign.md` §8.12.

### API
`GET /discover?tab=&q=&category=` · `POST /link-submissions` · `GET /me/link-submissions` · `PUT /me/community-consents`

---

## Profile and Following

**Purpose:** Users follow each other and see the deals they caught. (spec modules 12, 13)

### Rules
- **Release [DECIDED]:** same slice as Discover and Community.
- **Follow model [DECIDED — §17-2]:** one-way; anyone can follow. Following a private profile requires approval.
- Privacy: Everyone / Followers / Only me — default **Only me**.
- Profile shows: tracked products, deals caught, savings (per privacy level).
- Signals from people you follow feed personal search ranking.
- **Routes [DECIDED 2026-11-12]:** another user `/[locale]/u/[username]`; own profile **Profilim** `/[locale]/profil` (profile menu).
- **Profile content:** header (avatar, @username, Fırsat Avcısı badge, privacy, counts: followers · following · items tracked · verified shares), tiles (savings if shared · deals caught · **items in common** — shown only when the other person shares their tracked list), tabs Takip ettikleri · Yakaladığı fırsatlar · Paylaştığı fırsatlar (search + category, product images).
- **Profilim:** follow requests (Onayla / Reddet), Takipçilerim, Takip ettiklerim, Paylaştığım fırsatlar with status; "Neyi kim görüyor?" summary and a "Bir takipçi gözünden" preview; editing goes to Ayarlar.
- **Report and block [DECIDED 2026-11-12]:** "Şikayet et · Engelle" on every profile. A blocked person cannot see the blocker's profile, lists or feed items and cannot follow; an existing follow is removed. Reports go to Reports and Match Corrections.

### API
`POST|DELETE /follows/:userId` · `POST /follows/:userId/approve|decline` · `GET /users/:username` · `POST|DELETE /blocks/:userId` · `POST /reports` (kind `PROFILE`)

---

## Trust and Accuracy (reporting)

**Purpose:** Catch wrong data together with users. (spec module 18)

### Rules
- "Wrong price" on every offer, "different product" on every match; optional note.
- Reports go to Reports and Match Corrections. **The outcome is sent to the user [DECIDED]:** "Bildirimin incelendi ve düzeltildi" or "Bildirimin incelendi, veri doğru bulundu" (in-app + email, under notification rules).
- If "different product" is confirmed, the match is corrected and stored as feedback.
- A failed check never erases the last value; it is shown with its age.

### API
`POST /reports`

---

## Settings and Account

**Purpose:** Language, theme, notifications, privacy and KVKK rights in one place.

### Sections
- Profile: name, username, avatar (metadata stripped, resized).
- **Email and phone [DECIDED]:** shown masked. Seeing the full value or changing it requires **re-authentication** (sign-in or password within the last 15 min) [RECOMMENDED]; a change completes with verification of the new address + an information email to the old one. Phone is optional (future SMS verification).
- **Password:** can only be changed, never shown; on change, sign-out from all devices + notification.
- Language (tr / en) — applied immediately, saved to the account.
- Theme: light / dark / system.
- **Notification preferences [DECIDED]:** channels, one-by-one or daily digest, time slots, per-type on/off (incl. "Aradığın ürün ucuzladı"), daily cap view. This is the only place to edit them; the Notifications page and bell panel link here (Profile › Settings › Notifications).
- Privacy level (Profile and Following).
- Cookie preferences (Legal Pages).
- **Security:** devices used and recent sign-ins (from own activity history); remove a device.
- **My search history [DECIDED]:** recent searches; the user can **hide** entries (removed from view), the record is kept and anonymised when the account is deleted. ⚠️ Relationship with the KVKK right to erasure depends on a legal opinion before launch.
- Account: sign out from all devices · download my data · delete account.
- **Account deletion [DECIDED]:** after confirmation the account closes immediately (tracking, checks and notifications stop; profile hidden). Signing in within **30 days** restores it; after that personal data is permanently deleted and statistics remain anonymous. Duration is a parameter (System Settings). The deletion screen states this period clearly.

### Recommendations [RECOMMENDED]
- **Memberships:** Trendyol Plus, Hepsiburada Premium, Prime etc. → "your real payable price" (spec backlog) — later.

### Screen [DECIDED]
- **Settings template** (`pagedesign.md` §3.5): section menu on the left, section content on the right; every section has its own address `/[locale]/ayarlar/{section}`; switches save instantly ("Kaydedildi"), forms have their own "Kaydet". Layout: `pagedesign.md` §8.9.
- **User sections:** Profil · E-posta ve şifre (masked values, "Göster"/"Değiştir" after re-authentication, password, linked Google/Apple) · Bildirimler (one-by-one or daily digest at 19:00 [ASSUMPTION], time slots, daily cap shown read-only, per-type in-app/e-mail switches; "Hesap ve güvenlik" locked on; "Aradığın ürün ucuzladı" e-mail **off by default**) · Güvenlik ve cihazlar (signed-in devices, sign out one/all, recent sign-ins incl. failed attempts) · Arama geçmişi (search + category, product image of the matched product, "Takip ediliyor"/"Takipte değil", "Gizle") · Dil ve görünüm · Gizlilik ve çerezler (necessary locked; analytics and marketing off by default; profile visibility "Yakında") · Verilerim ve hesap (export, delete, package summary).
- **Application Manager variant (same page, sections by role):** admin shell (`pagedesign.md` §2.3) · **two-step verification mandatory** for Application Manager accounts (authenticator app, backup codes) · Bildirimler adds a "Yönetim bildirimleri" group (high-risk fraud case and role change **cannot be turned off**; source alert, budget threshold, daily pending-requests digest) above the own-account group · **Yetkilerim** (role card + permission keys by group, read-only, link to Roles and Permissions) · **Yönetim etkinliğim** (own audit entries: hidden-seller views, personal-data reveals with reason and duration, setting changes, user actions; search + type filter; product image on product-related entries; immutable, full log in Audit Log) · no search history and no package summary · **account deletion is closed until the Application Manager role is handed to another manager**; the export contains only the manager's own data.
- **Export [DECIDED]:** prepared in the background; ready → notification + e-mail; the file stays downloadable for 7 days [ASSUMPTION].
- **Delete account flow [DECIDED]:** consequences listed (tracking, tokens, pending requests, restore date) → "I have read this" checkbox enables the button → password (re-authentication) → closed; 30-day restore.
- **States:** re-authenticate dialog · delete confirmation · e-mail change pending verification · export ready · not saved (field error) · stale (device list) · error · loading.

### API
`GET|PATCH /me` · `POST /me/export` · `DELETE /me` · `POST /auth/logout-all`
`POST /me/2fa/setup` · `POST /me/2fa/verify` · `GET /me/2fa/backup-codes` (Application Manager) · `GET /me/admin-activity?q=&type=` (Application Manager) · `GET /me/sessions` · `DELETE /me/sessions/:id`

---

## Sign-in and Sign-up

**Purpose:** Sign in with email + password, Google, Apple. (spec §3.1, module 15) — **Built last [DECIDED]**

**Route:** `/[locale]/giris` (sign-in / sign-up tabs) · `/[locale]/sifre-sifirla` · `/[locale]/dogrula` [ASSUMPTION] — page layout: `pagedesign.md` §8.8.

### Rules
- **Screen order [DECIDED]:** Google and Apple at the top (one tap); email + password below. Layout: `pagedesign.md` §8.8.
- Developer login during development; removed before launch.
- The same verified email arriving through another method links to one account.
- Email verification, password reset, rate limiting.
- KVKK notice + terms of use accepted at sign-up (Legal Pages).
- Guests can search and mark; sign-in is asked at confirmation, then they continue where they left off [DECIDED, Search and Add].
- **Screen [DECIDED]:** Flow template without the main menu (logo + language switch only). Left: hero block explaining the product with an example "Fırsat geldi" notification (product image). Right: "Seçtiğin ürün seni bekliyor" card with the product image when the user came from a guest flow; tabs Giriş yap / Kayıt ol; Google and Apple first (official brand buttons per each provider's guidelines), then email + password (show/hide), "Şifremi unuttum".
- **Sign-up [DECIDED]:** password rules shown live — at least 8 characters, one letter, one digit [ASSUMPTION, setting `auth.password_min_length`]; terms checkbox unticked and required; KVKK notice linked (information, not consent); no separate commercial-email checkbox until the legal opinion (Notifications, open question). "Hesap oluştur" disabled until valid; after it, "E-postanı doğrula" with the masked address. Welcome gift (3 tokens) mentioned.
- **Password reset [DECIDED]:** email → "Bağlantıyı gönderdik" without revealing whether an account exists; resend after 60 s [ASSUMPTION, `auth.resend_cooldown_seconds`].
- **States [DECIDED]:** wrong email or password (never says which; remaining attempts shown) · too many attempts → sign-in paused for 15 min after 5 failures [ASSUMPTION, `auth.lockout_attempts` / `auth.lockout_minutes`] with countdown and reset link · email not verified (resend) · email registered with Google/Apple only ("… ile devam et"; password can be added later in Security) · account pending deletion (date shown; signing in restores) · account suspended (reason + support request) · service error · signing in (button spinner, inputs locked).

---

## Packages and Premium

**Purpose:** Manage in one place how reveal and extra allowances are earned; the future revenue gate. (spec modules 22, 27; §11)

**Route:** `/[locale]/paketim` (profile menu) — page layout: `pagedesign.md` §8.7.

### Default values [DECIDED]
All editable from a **dedicated admin screen** (Package Settings and Requests).

| Value | Free | Premium |
|---|---|---|
| Monthly Göster allowance | 3 | Unlimited |
| Products tracked at once | 10 | 50 |
| Daily check allowance | 10 | 30 |
| Check frequency | Normal | 2× more often |
| Welcome gift | 3 tokens (once, new users) | — |

### Model [DECIDED]
| Tier | Provides |
|---|---|
| **Free** | Monthly Göster allowance · up to N tracked products · daily check allowance · normal check frequency |
| **Premium** (subscription) | Unlimited Göster · more tracking · more daily checks · more frequent checks |
| **Tokens** | Non-Premium users spend tokens for extra reveals |

### Rules
- **Free limits [DECIDED]:** four limits — monthly Göster allowance, products tracked at once, daily check allowance, check frequency.
- **Token cost [INTERIM]:** every reveal costs a flat **1 token**. 📌 Note: saving-based tiered pricing will be discussed again later.
- **Payment [DECIDED]:** no online payment for now. Users **request** Premium or tokens; the request goes to admins, who grant it manually on approval (Package Settings and Requests). The user is notified of the outcome.
- **Link to Hidden Seller:** on Göster the order is: Premium? → monthly free allowance left? → tokens? → otherwise "Hakkın bitti" + request Premium / tokens. The screen states which allowance was used.
- **Transition [DECIDED, Hidden Seller]:** until this module ships, Göster is free and unlimited.
- **Refund if the offer changed:** if the price rises or stock runs out within the price-watch window after reveal, the allowance/token is returned.
- Every allowance use, token movement and request is recorded (Audit Log).
- When the tracking limit is reached, new products cannot be added; ending a tracking frees a slot. Lowering a limit never cuts existing tracking.
- **Screen [DECIDED]:** opened from the profile menu ("Paketim"), no top-menu tab. Header with plan badge + "Jeton iste" / "Premium iste" · four allowance tiles (Göster left + reset date · tracking N/limit · daily checks left + reset time · token balance) · Free vs Premium comparison table (aligned rows, Premium column outlined, "Fiyat henüz belli değil") · reveal order in 4 steps with the user's current step highlighted · **"Nereye harcadın?"**.
- **"Nereye harcadın?" [DECIDED]:** period (All / this month / last month), search, category. Totals: reveals · from monthly allowance · from tokens · refunded. Tab **"Ürün bazında"**: per product — image, name, category, number of reveals, monthly allowance used, tokens used, refunded, last use; a row expands to every event with date-time, which seller rank was opened, the price at that moment, source (Aylık hak / Jeton / Geri geldi) and amount. Tab **"Tüm hareketler"**: same events in time order plus token grants and requests, filterable by type. Seller names never appear here (rank only).
- **Requests [DECIDED]:** a dialog (design §5.28) to request Premium or N tokens (stepper, max `tokens.request_max`, default 50 [ASSUMPTION]) with an optional note; no online payment. Only **one pending request per type**. A rejection carries the admin's note, shown to the user. When Premium is approved the admin sets its period; the page shows the end date.
- **States:** Göster allowance used up (shown on Product Detail with the product image, "Jeton iste" / "Premium iste") · tracking limit full · request pending · request rejected · Premium active · error · loading.
- **Monthly allowance [ASSUMPTION]:** the free Göster allowance resets at the start of each month and does not roll over; **tokens do not expire [ASSUMPTION]**.

### API
`GET /me/entitlements` · `GET /plans` · `GET /me/reveals?period=&q=&category=&group=product|event` · `GET /me/token-ledger` · `POST /package-requests` · `GET /package-requests/mine`

### Open questions
- [DECIDE LATER] Premium and token prices (with no price set, the request screen shows no price); tiered token pricing; online payment provider.

---

## Landing Page

**Purpose:** Explain the product to signed-out visitors, get them to run a first search and win search-engine traffic.

**Route:** `/[locale]` (signed-out visitors) · `/[locale]/urun/[slug]` (product pages). Signed-in users see Home at `/[locale]`.

### Sections [DECIDED]
1. **Search box (top):** guests search directly; Search and Add runs under the guest rule (sign-in at confirmation).
2. **How it works:** Ekle → Biz takip edelim → Fark senin.
3. **Aggregate figures (3 tiles):** "Kullanıcılar bu ay X TL kazandı", "Y üründe daha ucuz fiyat bulundu", "Z mağaza düzenli kontrol ediliyor" — from real data. **If any figure is below its threshold, all three tiles switch to value statements** (Ücretsiz · Satıcı satıcı karşılaştırma · İade süresi takibi); never a mix [DECIDED 2026-11-12].
4. **Deal showcase "Bu hafta bulunan fırsatlardan" [DECIDED 2026-11-12]:** the product's sales window, designed to stand out (design §5.31): star field, "Haftanın fırsatları" pill, weekly total saving (hidden below threshold), category chips, 3 cards (image, "%N daha ucuz", Ödenen struck, Bulunan, saving strip, context line), closing action "Senin ürünün de ucuzlamış olabilir · Ücretsiz başla". Real, anonymous examples from the last 7 days; **no user or seller names**; the block is hidden with fewer than 3 qualifying examples. Only place in the product with looping motion; stops under reduced motion.
5. **Know your rights:** withdrawal right, returns, asking for a price difference; content shared with Help and FAQ.

### Product pages (indexed by search engines) [DECIDED]
- Product name, image + thumbnails, brand and category, key attributes, package/variant chips, "Şu an N satıcıda, en düşük X TL" with check time and highest price, 90-day hint.
- Seller rows by **rank only** ("1. satıcı") with price and stock — **seller and platform hidden**; "Göster" on each row leads a guest to sign-in (no seller identity in the page source) [DECIDED 2026-11-12].
- Actions: **Bu ürünü takip et** (primary, want-to-buy) and **Bunu aldım, ucuzlarsa haber ver** (bought) → sign-in → Search and Add with the product marked, confirm panel open and the mode preselected [DECIDED 2026-11-14].
- Price history of the daily lowest price (30 d / 90 d / 1 y), seller-less, with Now · Period high · Average · Change.
- Benzer ürünler (4, with images) and Sık sorulanlar (also structured data).
- Rendered on the server; no seller identity in the page source (the leak test covers these pages).
- Only products with enough data are published; low data → `noindex` and left out of the sitemap. Threshold: **at least 2 sellers and 14 days of data** [ASSUMPTION].
- Product no longer sold anywhere for 30 days → "artık hiçbir satıcıda yok" with similar products [ASSUMPTION: 30 days].

### Rules
- Example deals and figures are **aggregate and anonymous**, independent of user consent; no single user can be traced (minimum N users per product).
- The commission disclosure appears in the footer (Legal Pages).
- Guest header: Nasıl çalışır · Örnek fırsatlar · Haklarını bil · Yardım · Giriş yap · Ücretsiz başla.
- Stale banner on product pages when prices are older than 1 h [ASSUMPTION]; pages are server-rendered, skeletons only on client transitions.

### Screen [APPROVED 2026-11-12]
Canvas "FırsatGeldi — 10 Tanıtım Sayfası": landing (hero, figures, how it works, deal showcase, rights, CTA, footer), SEO product page, six states (figures below threshold · guest search no result · low data noindex · product not found · error + stale · loading), light and dark. Page anatomy: `pagedesign.md` §8.10.

---

## Legal Pages

**Purpose:** Compliance with KVKK, consumer and advertising rules; transparency for users. (spec §13)

**Route:** `/[locale]/kvkk` · `/[locale]/kosullar` · `/[locale]/cerezler` · `/[locale]/komisyon` — linked from the footer on every page.

### Pages [DECIDED]
- **KVKK privacy notice:** what data, for what purpose, how long, shared with whom, user rights and how to apply.
- **Terms of use:** wrong-price disclaimer, account rules, return/price-difference decisions belong to the user.
- **Cookie policy + consent bar:** non-essential cookies do not load without consent; the choice can be changed later in Settings.
- **Commission disclosure:** which links earn commission; ranking is by price and not affected by commission.

### Rules
- **Where the commission note appears [DECIDED]:** footer link + a short note next to every "Mağazaya git" button ("Bu linkten alışverişte komisyon alabiliriz; fiyat sana değişmez").
- **Re-consent [DECIDED]:** if an admin marks a version "consent required", the user sees a consent dialog at the next sign-in; until they accept they cannot add tracking, but they can view their data and delete their account. Minor changes are announced by notification only.
- Every version and which version each user accepted when are stored.
- KVKK notice + terms are accepted at sign-up (Sign-in and Sign-up).
- TR and EN text required; the TR version is legally binding.
- **Page layout [DECIDED 2026-11-12]:** one template for the four documents — left document menu (+ Önceki sürümler, Yardım merkezi) · title · version pill + effective date + "Türkçe metin bağlayıcıdır" + language link · lead · "Bu sürümde ne değişti?" · "Bu sayfada" contents · numbered sections · action box where useful (KVKK → Verilerim ve hesap; Cookies → Tercihleri değiştir).
- **Cookie bar [DECIDED 2026-11-12]:** "Tercihler", "Yalnızca zorunlu" and "Tümünü kabul et" with **equal visual weight**; preferences dialog with four groups (Zorunlu always on · Tercih · Analitik · Pazarlama).
- **Re-consent dialog:** summary of changes, link to full text, checkbox, "Kabul et ve devam et" (enabled after the tick), "Şimdilik değil" (limited mode explained).

---

## Help and FAQ

**Purpose:** Make it easy for users to exercise their rights and answer "why?" questions without leaving the screen.

**Route:** `/[locale]/yardim` · `/[locale]/yardim/[slug]` · `/[locale]/yardim/iletisim` (Bize yaz + Taleplerim, `pagedesign.md` §8.11)

### Content [DECIDED]
- **Platform return guides:** step-by-step return and cancellation per store; the "Süre ve kurallar" box comes from the return rule table (read from the store's site, with its age, or "Varsayılan"); never typed into the text.
- **How to request a price difference:** using the ready message, where to send it per platform.
- **How FırsatGeldi works (FAQ):** why the seller is hidden, Göster and tokens, check frequency and allowances, how data is used.
- **Contact form:** topic (Question · Bug · Suggestion · Account) + message (10–2000 characters) + optional related product (with image) + up to 3 screenshots [ASSUMPTION] (deleted after **30 days** [DECIDED 2026-11-13]; the 24-hour rule applies only to order screenshots and identification photos); contact details filled automatically for signed-in users; **guests give an email address** (stored encrypted). Requests go to Support Requests; the user gets a request number and the reply ("genelde 1 iş günü içinde" [ASSUMPTION]).
- **Taleplerim (signed in):** own requests with search (number, subject, product) and status filter (Yanıt bekliyor · Yanıtlandı · Kapandı); request detail as a message thread with reply.

### Rules
- **Contextual help [DECIDED]:** opened with "?" on the relevant screen — the platform's guide at the return step, "Neden gizli?" next to Göster, "Haklar nasıl çalışır?" next to the check allowance. Opens in a side panel without leaving the page.
- **Indexed by search engines [DECIDED]:** guides are rendered on the server and indexed ("Trendyol iade nasıl yapılır").
- Search inside Help; content in TR/EN; managed from Legal and Content in the admin panel.
- Guides contain nothing about hidden sellers.
- **Help home [DECIDED 2026-11-12]:** search with frequent-search shortcuts · **store picker** (logo tiles, store search, selected store's rule card with source and read time, "Adım adım iade rehberi") · all articles (search + topic filter with counts) · side: "Bize yaz", Taleplerim, FAQ, legal links.
- **Article feedback:** "Bu yazı işine yaradı mı? Evet / Hayır" — "Hayır" offers "Bize yaz"; counts per article appear in Legal and Content.

### Screen [APPROVED 2026-11-12]
Canvas "FırsatGeldi — 11 Yasal Sayfalar ve Yardım": Help home, return guide article, Bize yaz + Taleplerim, legal pages (one template, 4 documents), overlays (cookie bar, cookie preferences, re-consent, contextual help panel), eight states. Anatomy: `pagedesign.md` §8.11.

---

## Admin Overview

**Purpose:** See product health on one screen; reach pending work in one click. [DECIDED]

**Route:** `/[locale]/admin`

### Indicators [DECIDED]
| Group | Indicators |
|---|---|
| **Usage** | Active users (daily / weekly) · new sign-ups · tracked products · tracking per user |
| **Value** | Deal rate (tracked items with a deal / all) · action rate (deal → return/cancel/price difference + re-buy) · total user savings · Göster count |
| **Revenue and cost** | Affiliate clicks · Premium / token requests · cost per active user · provider budget usage |
| **Pending work + health** | Pending reports · support requests · package requests · source alerts (red) |

### Rules
- **Period [DECIDED]:** default last 7 days compared with the previous 7; options: today · 7 days · 30 days · custom range. Every indicator shows change percentage and direction (arrow + text, not colour alone).
- **Freshness [DECIDED]:** pending work and source alerts are **live**; rates, savings and cost are computed **hourly** with "Son hesap: 14:00".
- Every tile opens the related screen with the filter applied.
- Indicators are computed from event tables (spec §15); totals only, no per-user personal data.

---

## Return Rules

**Purpose:** Platform × category return periods and policy links; suggest the correct last day.

**Source of the values [DECIDED 2026-11-12]:** return days, start, cancel-before-shipping and return shipping are **read automatically from each store's own return-policy page** (the policy link), daily [ASSUMPTION: once a day]. Every value shows when it was read ("Mağazanın sitesinden · 3 saat önce"). The admin screen is for supervision and correction, not for typing the table.

**Fields:** platform · category (empty = platform default) · days · start (order / delivery) · average delivery time (for estimates) · cancel before shipping · return shipping · policy link (source, required) · **source state** (`AUTO` read from the page · `LOCKED` corrected by an admin · `DEFAULT` nothing could be read) · last read at · last read attempt · note · valid from.

### Rules
- **Read failed [DECIDED 2026-11-12]:** if the page cannot be read, the **last read value stays** with its age ("Sayfa okunamadı · en az 3 gün önceki değer"); users see "son günü siparişinden de kontrol et"; the admin gets a task after 24 h of failures.
- **Nothing read → default [DECIDED 2026-11-12]:** if no value was ever read for a platform, the default rule applies (**14 days from delivery**, parameter) and is labelled **"Varsayılan"** everywhere it appears (Help tiles, rule card, return guide, tracked item's last day): "Bu mağazanın sitesinden iade süresini alamadık; yasal en az süre olan 14 gün, teslimden gösteriliyor."
- **Plausibility guard [RECOMMENDED]:** a read value outside 7–90 days, or a change of start type, is not published; it waits for admin approval. Admins can correct a wrong read and **lock** it (`LOCKED`); a locked value is not overwritten by later reads until unlocked.
- Rule changes apply **to new tracking only**; existing items keep their last day (the user can update it manually).
- Categories without a withdrawal right are flagged at category level (phones, tablets, computers, smartwatches, drones).
- Every change (automatic or manual) is written to the Audit Log with the old and new value; old versions are kept.

---

## Category Templates

**Purpose:** Attributes asked during identification, match-critical fields, and which categories are open. [DECIDED]

**Fields:** category · attributes (name, type, options, TR/EN translation) · match-critical · has withdrawal right · open/closed · version · status (draft / approved).

### Rules
- **New category [DECIDED]:** an **automatic draft** template is created from Google Shopping filters; until an admin approves it, the category uses the **generic template** (brand, model, variant, colour). Drafts awaiting approval are listed in the panel.
- **Launch categories [DECIDED]:** **electronics + clothing** open together. Other categories stay closed until opened in the panel; searching a closed category shows "Bu kategori henüz desteklenmiyor, takip için haber verelim mi?".
- **Extra rule for clothing:** without brand or model code, same-seller tracking only (Search and Add rule); the template suggests a label photo; images are required in the confirm step.
- A change opens a new version; old records stay intact; every change goes to the Audit Log.

---

## Campaign Calendar

**Purpose:** Increase check frequency during campaign periods and tell users when waiting may pay. [DECIDED]

**Fields:** name · platform (empty = all) · start · end · frequency boost · kind (sale · cart discount · card offer) · conditions (as read) · card programme (card offers) · source (ready list / manual / mass drop / **store page / bank page / affiliate feed**) · source link · read time · status.

### Rules
- **Ready yearly list [DECIDED]:** 11.11, Efsane Kasım, Black Friday, New Year, Valentine's Day, Mother's Day, Father's Day, back to school… Dates are copied from the previous year each year and arrive as "awaiting approval"; admins correct/approve them and add new ones.
- **Read from stores and banks [DECIDED 2026-11-13]:** stores' campaign pages, banks' card-campaign pages (Bonus, World, Maximum, Axess…) and affiliate promotion feeds where available are read daily [ASSUMPTION: once a day]; every campaign found arrives as **"awaiting approval"** with its conditions, source link and read time, labelled "Mağazadan" or "Bankadan". An unreadable source keeps its last value with its age and raises an admin task. Personal coupons and cart-only discounts that are not on the page are not read and never guessed.
- **Mass drop [DECIDED]:** if many products drop on one platform in a short time above a threshold, that platform's tracked products are **automatically checked more often** (duration is a parameter) and admins get a "Save as campaign?" suggestion. Threshold and duration in System Settings.
- **For users [DECIDED 2026-11-13]:**
  - Approved campaigns raise check frequency and feed the buy-or-wait hint ("Black Friday'e 5 gün var · beklemek kazandırabilir").
  - **Conditional offers are never applied to the shown price.** A cart discount or card offer appears as a separate note: "Bu fiyata kart kampanyası olabilir".
  - **Hidden seller rule:** before Göster the note says only "Bir satıcıda kart kampanyası / sepette ek indirim olabilir"; the store, card programme and conditions open after Göster.
- **Screen:** Campaign Calendar in canvas 12e (source filter Hazır liste · Mağazadan · Bankadan · Toplu düşüş · Elle; detail with the read text, conditions, source link, approve / correct / reject).

---

## Platforms and Source Health

**Purpose:** Turn store adapters on/off and watch their health.

**Content:** per platform: success rate, latency, last error, circuit-breaker state, robots.txt check date, rate limit and concurrency setting, adapter on/off. Queue depth and stuck jobs.

**Logos [DECIDED 2026-11-12]:** each platform has an official logo file uploaded here, with a "kullanım izni" field (source of permission: affiliate programme, press kit, written consent). Logos are shown on a white logo tile (`logo-surface`) at 48 px in Help and guides; without a logo or permission the tile shows the platform's initials.

**Return-policy page reading:** per platform, last successful read, last attempt, failure streak; a failure over 24 h raises a task (Return Rules).

**Alerts [DECIDED]:** when a source breaks (circuit breaker opened, success rate below threshold, parser fallback, budget threshold), a red alert in the panel + email to authorised admins. No repeat email for the same alert until its state changes.

---

## Reports and Match Corrections

**Purpose:** Resolve user reports and fix wrong matches. [DECIDED]

**Queue:** type · product/offer · number of reporters · note · date · status. Actions: approve (mark offer as outlier / split match / merge products) · reject (reason). Community link moderation and bugs forwarded from support also land here.

### Rules
- **Multiple reports [DECIDED]:** if a threshold number (default **3**) of different users report "wrong price" for the same offer, the offer is **automatically suspended** until reviewed — removed from comparison and notifications, shown to users as "inceleniyor". Threshold is a parameter (System Settings).
- Admin decision for a suspended offer: reopen · mark as outlier · split match.
- The outcome is sent to every reporter (Trust and Accuracy rule).
- Every decision is written to the Audit Log and stored as match feedback.

---

## System Settings

**Purpose:** Adjust behaviour without a deploy. [DECIDED]

**Settings:** image limits (file size, images per request, daily count, maximum pixels, private image retention 24 h, variants) · personal-data reveal window (10 min) and re-authentication window (15 min) · fraud risk thresholds and rule weights (from Fraud Monitoring) · mass-drop threshold and automatic boost duration · default return rule (default 14 days from delivery) · return-policy read interval (default 24 h) and plausibility range (7–90 days) · frequent-return warning period and threshold · reveal lifetime (default 1 week) · post-reveal price-watch window (default 60 min) · check intervals (per situation) · "Şimdi kontrol et" cache window (default 5 min) · outlier price thresholds · wrong-price suspension threshold (default 3) · daily notification cap (default 5) · want-to-buy default duration (1 month) · notable-drop threshold for tracking without a target · saving-record edit window (default 7 days) · account-deletion restore window (default 30 days) · Landing Page anonymity threshold · active theme. (Package values live on their own screen: Package Settings and Requests.)

### Rules
- **Critical settings [DECIDED]:** the **Application Manager applies critical settings alone** (no second approval), through a preview + confirmation dialog; the change is written to the Audit Log and can be rolled back in one click. The second-approval mechanism stays in the schema: if a role without the critical-settings permission is added later, its changes go to the Application Manager for approval. Critical settings [RECOMMENDED]: check intervals, outlier thresholds, budgets, package values, active theme, retention settings, fraud rules.
- **Instant rollback [DECIDED]:** every setting keeps its history; rolling back to a previous value takes **one click, without waiting for a second approval** (the rollback is also recorded).
- Each setting shows its description, default and allowed range; out-of-range values are rejected.
- Every change, approval and rollback is written to the Audit Log.

---

## Provider Usage and Cost

**Purpose:** Monitor usage and budget of SerpApi, LLM and other external calls. [DECIDED]

**Content:** monthly usage and cost per provider · plan quota usage · cost per active user · budget alerts · month-end forecast.

### Rules
- **Budget [DECIDED]:** a monthly budget per provider (critical setting: the Application Manager applies it alone with preview + confirmation; audit log + one-click rollback — System Settings).
- **When the budget is reached [DECIDED] — warning and saving mode together:**
  - At 80%: panel + email warning.
  - At 100%: warning **and** saving mode — normal products' check interval lengthens, cheaper sources (site search, list pages) are preferred. Items with an approaching return deadline, items in a campaign and "Şimdi kontrol et" requests are protected.
  - Usage **does not stop**; the budget may be exceeded for protected work, and the overrun is shown separately.
- Admins can turn saving mode off manually.

---

## Users

**Purpose:** See users and intervene when needed. [DECIDED]

**List:** name (surname initial) / username · email (**masked**) · sign-up date · last sign-in · tracked count · total saving · status (active / suspended / pending deletion). Filters: status, sign-up date range. Search: name, email.

**Detail tabs:** Profile (sign-in methods, devices/sessions) · Tracking (seller identities visible) · Savings · Package and tokens · **Activity history** (all actions, timeline) · **Search history** · Notifications and emails (with delivery status) · Reports and submissions · **Risk** (score, signals, cases, restrictions) · Support requests.

**Actions:** suspend / unsuspend (reason required) · restrict (reveal, rewards, reporting, checks) · close sessions · grant/revoke tokens or Premium · view deletion request · **view as user** (read-only [RECOMMENDED]).

**Rules:** email and phone are **masked** by default; the full value opens with **"Göster"**, with a written reason, for 10 minutes, and is written to the Audit Log [DECIDED]. Email search uses the full address (encrypted field, no partial search). The password is never visible. The user's price paid and purchase details are visible only to an authorised role; every view and action is written to the Audit Log (KVKK access record).

---

## Audit Log

**Purpose:** Track who did what, when. [DECIDED]

**Recorded:** every Application Manager action and view (settings, rules, templates, matching, user actions, personal-data and hidden-seller views, view-as-user) + critical user actions (sign-in, account deletion, data export, Göster). Users' everyday actions are recorded in full in the **activity history** (History Explorer).

**View:** time · who · action · target · before/after value · IP. Filters: date, person, action type. Export: CSV.

**Rules:** records cannot be edited or deleted; kept **indefinitely**. Hidden seller identity in records is visible to authorised roles only.

---

## Notification Templates

**Purpose:** Edit notification and email texts without a deploy. [DECIDED]

**List:** notification type (Notifications and Preferences) · channel (in-app / email) · language (TR / EN) · last edited.

**Editing:** title + body, variables (`{{product_name}}`, `{{price_paid}}`, `{{best_price}}`, `{{saving}}`, `{{days_left}}`, `{{seller_count}}`…), live preview (TR/EN), test send (to self).

**Rules:**
- **No variable** exists for seller or platform name — identity cannot leak through a template; a forbidden-phrase check runs on save.
- TR and EN text required for every type; a missing language cannot be saved.
- Versions are kept; previous versions can be restored.

---

## Catalogue and Products

**Purpose:** Keep the canonical product catalogue accurate. [DECIDED]

**List:** product · category · brand/model/variant · tracker count · offer count · last check · status. Filters: category, low match confidence, reported.

**Actions:** merge products · split product · fix attributes · replace image · manage aliases · mark offer as outlier / re-link offer to another product.

**Rules:** merge/split carries tracking and history across, nothing is lost; actions are reversible (versioned); every action is written to the Audit Log and stored as match feedback.

---

## Package Settings and Requests

**Purpose:** Manage package and Premium values and user requests. [DECIDED]

**Settings tab:** for Free and Premium: monthly Göster allowance · tracking limit · daily check allowance · check-frequency multiplier · welcome gift (tokens) · tokens per reveal (default 1) · sharing reward and monthly cap (Discover). Change preview: "Bu değişiklik N kullanıcıyı etkiler". Every change goes to the Audit Log.

**Requests tab:** user · request (Premium duration / token amount) · note · date · status. Pending first. Actions: approve (duration/amount editable) · reject (reason required). The user is notified either way.

**Manual grant:** admins can grant or revoke tokens or Premium without a request (reason required).

**Rules:** lowering a limit does not cut existing tracking, only blocks new ones; the free Göster allowance resets monthly and does not roll over; tokens do not expire.

---

## Legal and Content

**Purpose:** Manage legal pages and guide content without a deploy. [DECIDED]

**List:** page · language (TR / EN) · version in force · publish date.

**Editing:** rich text, preview, draft → publish; on publish choose "consent required?". Old versions kept read-only.

**Rules:** a published version cannot be edited — a new version is opened; every publish is written to the Audit Log. Help and FAQ content is managed here too, with each article's "işine yaradı mı?" Evet/Hayır counts.

---

## Support Requests

**Purpose:** Answer requests from the contact form. [DECIDED]

**List:** request number · user · topic · date · status (New · Answered · Closed). New first.

**Detail:** message, related product, user summary (link to Users). Actions: reply (in-app + email to the user), close, forward to Reports and Match Corrections if it is a bug.

**Rules:** every reply and status change is written to the Audit Log. Guest requests are answered by email only.

---

## History Explorer

**Purpose:** Watch price, product, search and activity history **whenever needed**. No history is ever deleted [DECIDED].

**Route:** `/[locale]/admin/gecmis` · web + mobile · Application Manager only.

### Tabs [DECIDED]
| Tab | Content | Filters |
|---|---|---|
| **Price history** | Every price point per product or offer, **with seller name**, source (SERP / site / page), shipping; chart + table | product, seller, platform, date |
| **Stock history** | Stock changes per offer | product, seller, date |
| **Product history** | Catalogue events: created, attribute changed, merged/split, offer added/removed, suspended, category changed, image changed | product, event type, actor, date |
| **Search history** | All searches (users and guests), result count, picked product; **no-result searches** report (catalogue gaps) | user, query, date, result state |
| **Activity history** | All user actions: sign-in, search, add, confirm, reveal, check, go to store, report, share, package request, settings change | user, action type, device, IP digest, date |

### Rules
- **Retention [DECIDED]:** indefinite. When an account is deleted the personal link is cut (personal fields removed) and records stay linked to an **anonymous** user.
- Export: CSV (personal data masked).
- Viewing any tab is written to the Audit Log.
- Volume: histories are time series, older data compressed; queries require a date range (maximum `history.max_range_months`, 12 [ASSUMPTION]).

---

## Fraud Monitoring

**Purpose:** Catch abuse (fraud) early by tracking what users do and share. [DECIDED]

**Route:** `/[locale]/admin/suistimal` · web + mobile · Application Manager only.

### What is recorded [DECIDED]
- **All user actions** (activity history) + device and IP **digests** (salted hashes, never raw values).
- What users **share**: Discover links, wrong-price/different-product reports, support messages, profile/community content, package requests.

### Rules (starting set) [RECOMMENDED — list]
Each rule can be turned on/off; threshold and weight are editable.

| Rule | Signal |
|---|---|
| Multiple accounts | Many sign-ups from the same device/IP digest in a short time → welcome-token abuse |
| Reveal burst | Revealing many different products/offers in a short time without going to the store (collecting/sharing seller identities) |
| Automation / scraping | Non-human request rates, regular intervals, browsing very many product pages |
| Check allowance abuse | Constantly hitting the limit + bulk checks + multiple accounts together |
| Fake reports | High ratio of rejected wrong-price reports; mass reports targeting one seller (competitor manipulation) |
| Link spam / reward farming | High ratio of unverified links; the same link from different accounts |
| Repeated package requests | Many requests in a short time or repeats of rejected ones |
| Savings inflation | Unrealistic re-buy prices, frequent manual edits |
| Frequent returns | The user's own high return rate (informational; the user is warned too) |

### Risk score and cases
- Signals produce a **0–100 risk score** by weight; levels Low / Medium / High (thresholds are parameters).
- High level → a **case** opens and the Application Manager is notified.
- **Case screen:** signals and evidence · the user's activity timeline · accounts sharing the same device/IP digest · past decisions.
- **Actions:** dismiss · warn · **restrict** (reveal, rewards, reporting, check allowance — time-limited) · suspend · flag related accounts. Reason required, recorded.
- **Automatic action limit [RECOMMENDED]:** the system on its own only flags, rate-limits and **holds** rewards (welcome tokens, sharing rewards); restriction and suspension only by Application Manager decision.
- Restrictions are shown to the user in neutral language ("Bu işlem şu an kullanılamıyor, destekle iletişime geçebilirsin"); rule details are not disclosed.
- KVKK: the data processed and its purpose are stated in the privacy notice; device/IP kept only as digests.

---

## Roles and Permissions

**Purpose:** Manage which role can access which screen and action. [DECIDED]

**Route:** `/[locale]/admin/roller` · web + mobile · Application Manager only.

**Content:** role list (Application Manager, User) · permission matrix (screen × action, web/mobile) over the permission catalogue (`database.md` §4) · assign/revoke roles for users. Guest access is not editable here: it is the API's public allow-list.

**Rules:**
- The Application Manager role holds every permission, cannot be edited or deleted; at least one Application Manager always remains.
- A new role is added by selecting permissions; no code change.
- Every assignment and permission change is written to the Audit Log; assigning/revoking an Application Manager notifies all Application Managers.

---

## Appendix A — Build order

[DECIDED 2026-11-13] Same order as the screen order in `CLAUDE.md` › Phases and `architecture.md` §25. This is the **backend** build order: Phase 1 first builds the same screens on mock data; Phase 2 builds the backend and connects the screens in this order (rows 1–11); rows 12–13 are Phase 3 (`docs/implementation_plan.md`). The first vertical slice (A2) is approved. One module group = one screen step; each step stops for approval.

| Order | Modules | Why |
|---|---|---|
| 1 | Search and Add + Hidden Seller + (background: price engine, scheduling) + **permission checks and activity capture** | First vertical slice: add → check → hidden deal → Göster; history recorded from day one |
| 2 | Product Detail + **Want to Buy (a mode of Product Detail)** + Price and Stock History + Return Window + Check Now + Trust and Accuracy (user side: reports) | Makes the deal usable; Want to Buy has no screen of its own |
| 3 | Tracked Items | Daily-use list |
| 4 | Notifications and Preferences (incl. account/security) | Brings users back |
| 5 | Home | Daily-use summary, built on the modules above |
| 6 | My Savings | Builds trust |
| 7 | Packages and Premium | Allowances and `EntitlementGate` |
| 8 | Landing Page (+ SEO product page) | Public surface before launch |
| 9 | Legal Pages + Help and FAQ | Public surfaces before launch |
| 10 | Settings and Account | Account |
| 11 | Sign-in and Sign-up | Real sign-in (development login until then) |
| 12 | Discover and Community + Profile and Following | Social layer |
| 13 | All admin modules (Application Manager screens) | Operations (incl. History Explorer, Fraud Monitoring, Roles and Permissions, Trust and Accuracy resolution) |

---

## Appendix B — Market gaps and differentiators

Status reflects the decisions above.

| # | Topic | Module | Why it matters | Impact | Effort | Status |
|---|---|---|---|---|---|---|
| 1 | One-shot add from order screenshot | Search and Add | Guarantees the 10-second target; nobody does it | High | Medium | v1 [DECIDED] |
| 2 | Ready price-difference message | Product Detail | Saving without return + re-buy; the easiest path | High | Low | v1 [DECIDED] |
| 3 | Net saving including shipping | Product Detail | Ensures a "cheaper" offer is really cheaper | High | Medium | v1 [DECIDED] |
| 4 | "Anything to return?" reminder | Home, Notifications | Brings users back even without a deal | Medium | Low | v1 [DECIDED] |
| 5 | Return deadline to calendar | Product Detail, Return Window | Simple, builds trust | Medium | Low | v1 [DECIDED] |
| 6 | Link detection (R1 fix) | Search and Add | Closes the leak, correct seller | High | Low | v1 [DECIDED] |
| 7 | Fake-discount note | Product Detail | Weak or missing in Akakçe/Cimri | Medium | Medium | v1 [DECIDED] |
| 8 | Target price suggestion | Want to Buy | Users don't know what to type | Medium | Low | v1 [ASSUMPTION] |
| 9 | Return start from delivery date | Return Window | Correct last day | High | Low | v1 [DECIDED] |
| 10 | Shareable savings card | My Savings | Organic growth | Medium | Low | Backlog |
| 11 | Real price by membership | Settings and Account | Plus/Prime changes the net price | Medium | High | Backlog |
| 12 | Add by email forwarding | Search and Add | Automatic add without Gmail access | High | Medium | Backlog |
| 13 | Browser extension | Search and Add | "Track" on the store page | High | High | Backlog |

---

### Competitive analysis — Akakçe gaps (2026-11-12)
| Gap | Our answer |
|---|---|
| Seller rated by stars only | Seller trust indicator from stock, delivery, reports and our buyers' outcomes |
| Short price history, lowest seller unknown | Up to 2 years / all; lowest marked by rank, named after Göster |
| No verified reviews | Store averages + counts (no texts) + our verified buyers' two answers |
| No order tracking | Manual status today; carrier tracking number next phase |
| Alerts not verified | Already: page-verified price, shipping and stock before notifying |
| Lost between seller and platform | Request tracking with reminders; we never act on the user's behalf |
| Spec / unit-price comparison | Low priority; unit price when grocery/cosmetics categories open |

## Appendix C — Open questions

| # | Question | Module |
|---|---|---|
| 1 | [OPEN] Should more expensive sellers be shown by name? (spec §17-7) | Search and Add, Product Detail |
| 2 | [DECIDE LATER] Email on by default — service message or commercial message? Options: emails without store links · separate consent for deal emails (İYS) · follow a legal opinion | Notifications and Preferences |
| 3 | [DECIDE LATER] Reward for sharing a link in Discover (for now: token + badge) | Discover and Community |
| 4 | Screen designs — plan in Appendix E, drafts in order | All |
| 5 | [DECIDE LATER] Premium and token prices, tiered token cost, payment provider | Packages and Premium |
| 6 | Remaining-allowance display — designed with the Product Detail draft (Appendix E) | Check Now |
| 7 | [RECOMMENDED → confirm] List of critical settings | System Settings |
| 8 | [RECOMMENDED → confirm] Fraud rule list and automatic action limit | Fraud Monitoring |
| 9 | [RECOMMENDED → confirm] View-as-user (read-only) | Users |
| 10 | [OPEN — legal] Users can only hide their search history — relationship with the KVKK right to erasure | Settings and Account |
| 11 | [RECOMMENDED → confirm] Re-authentication to view/change own email and phone | Settings and Account |
| 12 | [DECIDE LATER — with the mobile app designs] Which five items go in the phone bottom tab bar now that Keşfet is in the main navigation (proposal: Keşfet in, Kazancım into the Profil menu) | App shell, Discover |

---

## Appendix D — Impact on other documents

When this document is approved, the following are updated together; documents must not contradict each other. **Database and architecture changes are not started yet** — listed here only so nothing is lost.

| Document | What changes |
|---|---|
| `product_spect.md` | §3 Roles: Application Manager + User (no longer open) · mobile screen coverage defined (technology open) · §8.4: launch with electronics + clothing together · §0 and §5.2: price paid is not prefilled from our data (R1) · §17-7/8/11 closed questions (A3, want mode) · §5.4 shipping/delivery visible before reveal · §3 and module 27: reveal lasts 1 week, tied to package entitlement later · v1 helpers · return start as a rule field · frequent-return warning in v1 · Packages and Premium values · Landing Page, Legal Pages, Help and FAQ · new admin modules |
| `engineering_checklist.md` | Images: no binary in the DB, metadata stripping, private bucket, 24 h deletion · Personal data: encryption + blind index, masking, log redaction, personal-data leak test · Roles (Application Manager + User) and page/action permissions, web + mobile · histories indefinite · fraud monitoring · mandatory account/security notifications · R1 decision · reveal lifetime and price watch · bulk check · notification digest/cap · account deletion with 30-day restore · second approval + rollback · budget saving mode · new admin modules (Users, Audit Log, Notification Templates, Catalogue and Products, Package Settings and Requests, Legal and Content, Support Requests) |
| `database.md` (new) | Full schema: roles/permissions, `activity_events`, `product_events`, `search_events` (indefinite), `user_devices`, `risk_*`, `user_restrictions`, `admin_view_sessions`, `media_assets`, `media_variants`, `uploads`, encrypted email/phone + blind index, mandatory notification types |
| `architecture.md` | Updated to v1.3 together with this document · `offer_reveals` → reveal expiry · `offers` → shipping cost, delivery time, claimed old price · `platform_return_rules` → start type, average delivery time, last verified · `tracked_items` → delivery date/estimate, step ticks · `savings_records` → manual-edit flag, coupon · `price_history` retention ≥ 1 year · new tables: audit log, notification templates (versioned, in the DB — changes the file-catalogue decision for notifications), packages/entitlements/tokens, legal document versions + consents, support requests · `users` → suspended status · R1 risk closed · endpoints: bulk check, calendar (.ics), price-difference message, admin users/logs/templates/catalogue/packages/legal/support |
| `product_design_pattern.md` | New patterns: masked field + time-limited "Göster", multi-image upload (per-file progress and rejection), image privacy note, remaining-allowance indicator, step tick ("Yaptım ✓"), dimmed pre-tracking history, "tahmini" last day, fake-discount note, buy-or-wait hint, contextual help panel |

---

## Appendix E — Screen design plan [DECIDED]

**Status and plan:** the live status of every screen (web desktop, web phone width, mobile app), canvas links and the order of the next screens are kept in `screen_status.md`; it is updated with every screen change and every screen plan starts from it [DECIDED 2026-11-13]. The tables below are the history of approvals.

**Page construction:** every screen is built from one shell, one page template and the shared components described in `pagedesign.md`; the per-page anatomy of the approved screens is in `pagedesign.md` §8 and the cross-page flows in §9.

Method: a **visual draft** per screen built with `design-tokens.json` and `product_design_pattern.md`, **web only, desktop width (1280), light and dark** [DECIDED 2026-11-12]. The web stays responsive: phone-width behaviour follows the shell, template and `breakpoint.md` rules and is not drawn per screen now; mobile app screens are a separate track started later. Each draft states where the user comes from and where each action leads, so the drafts read as one flow. Comment → revise → approve; approved drafts are recorded in this document.

| Order | Screen | Notes |
|---|---|---|
| 0 | App shell and component set | Header, navigation, footer, page templates, shared components; every screen builds on it |
| 1 | Search and Add | Identify → mark → confirm; fill from link and screenshot; bulk add |
| 2 | Product Detail | Hidden seller, histories, action steps, price-difference message, remaining-allowance indicator |
| 3 | Home | Hemen Gözat, return reminder, protection line, new user |
| 4 | Tracked Items | Filters, sorting, ended items, bulk check |
| 5 | Notifications | Bell panel + "Tümü" page |
| 6 | My Savings | 2026-11-12 | Canvas "FırsatGeldi — 6 Kazancım": hero (period, month/year/average, monthly chart), method tiles, records with images + search + category, missed deals, open-deal card, correct-record side panel, six states. New token `hero-line`. Rules added: product image everywhere, search on every list, category filter on product lists (design §5.30). |
| 7 | Packages and Premium | 2026-11-12 | Canvas "FırsatGeldi — 7 Paketim ve Premium": allowance tiles, Free vs Premium table, reveal order, "Nereye harcadın?" (per product with expandable events + all movements, period/search/category), request dialog, seven states. |
| 8 | Sign-in and Sign-up | 2026-11-12 | Canvas "FırsatGeldi — 8 Giriş": sign-in / sign-up / reset / verify in one interactive board, guest hand-back card, eight states. |
| 9 | Settings and Account | 2026-11-12 | Canvas "FırsatGeldi — 9 Ayarlar ve Hesap": Settings template; user and Application Manager variants (2FA, admin notifications, Yetkilerim, Yönetim etkinliğim); shared states. |
| 13 | Discover and Profile | 2026-11-12 | Canvas "FırsatGeldi — 13 Keşfet ve Profil": Discover (4 tabs, search + category, aside), another user's profile, Profilim (requests, shares with status), overlays (sharing consent, link share, verified, rejected), eight states. Decisions: Keşfet in the main navigation; Profilim in the profile menu; anonymity threshold 5 [ASSUMPTION]; report + block; items in common; paid price as a separate consent; no coral. |
| 11 | Legal Pages + Help and FAQ | 2026-11-12 | Canvas "FırsatGeldi — 11 Yasal Sayfalar ve Yardım": Help home with store picker and rule card, guide article, Bize yaz + Taleplerim, legal template, cookie bar/preferences, re-consent, contextual help panel, eight states. Decisions: return rules read from store sites with age; unreadable → last value; nothing read → "Varsayılan"; platform logos from Platforms with permission (`logo-surface`); equal-weight cookie choices. |
| 10 | Landing Page + SEO product page | 2026-11-12 | Canvas "FırsatGeldi — 10 Tanıtım Sayfası": guest header, hero, figure tiles, how it works, **deal showcase** (star field, weekly total, cards with % pill and saving strip), rights, CTA; product page with rank-only sellers and seller-less history; six states. New token `sparkle` (amber.300, showcase only); display type for the landing h1; looping motion allowed only in the showcase; small strips (≤ 6) exempt from search/category. |
| 6 | My Savings | Total, product list, missed deals |
| 7 | Packages and Premium | Allowances, tokens, Premium request |
| 8 | Sign-in | Google/Apple on top, return from guest flow |
| 9 | Discover | Later slice |
| 10 | Profile | Later slice |

The **remaining-allowance indicator** is not a separate screen; it is designed with the Product Detail and Tracked Items drafts.

### Approved drafts
| Order | Screen | Approved | Notes |
|---|---|---|---|
| 0 | App shell and component set | 2026-11-12 | Design canvas "FırsatGeldi — 0 İskelet ve Bileşenler": shell (desktop/phone, light/dark, guest variant), four page templates, shared components, five states. Decisions: Profil as avatar menu on desktop, fifth bottom tab on phones, opens Settings and Account until Profile and Following ships; coral once per surface (action wins over flag). |
| 1 | Search and Add | 2026-11-12 | Design canvas "FırsatGeldi — 1 Ara ve Ekle": input, "Nasıl anladık", mark, confirm panel (shared `ConfirmPanel`), helpers and edge cases, five states. Decisions: confirm opens from an explicit "Onaya geç" (not on mark); price from a link carries the basket-discount note; the teaser's "Fırsat geldi" flag is the only coral element on the surface; no seller list (typed seller, exact match). |
| 2 | Product Detail | 2026-11-12 | Canvas "FırsatGeldi — 2 Ürün Detayı": deal summary, full price history, cheaper sellers in a 2-column grid, stock history 14 days + 1 month, action steps, price-difference message, edge cases, five states. Items marked [ASSUMPTION] in the module stay open. |
| 3 | Home | 2026-11-12 | Canvas "FırsatGeldi — 3 Ana Sayfa": summary line, search with inline 3-tile results, Hemen Gözat (two aligned columns), return reminder, other items, states. |
| 5 | Notifications | 2026-11-12 | Canvas "FırsatGeldi — 5 Bildirimler": page with product images, mode badges, filters incl. My searches, right column (drops, recent searches, frequent searches), bell panel with preview on the left, "Takip et" → Add product dialog step 2 (Aldım / Almak istiyorum), six states. New types: Deal ended, Searched product got cheaper. Preferences moved to Profile › Settings. |
| 13 | Discover and Profile | 2026-11-12 | Canvas "FırsatGeldi — 13 Keşfet ve Profil"; anatomy in `pagedesign.md` §8.12. |
| 3r | Home revision | 2026-11-13 | One-line offer summary (trust · installments · campaign) on Hemen Gözat offers, expandable. |
| 2r | Product Detail revision | 2026-11-13 | Rating line, one-line offer summary (trust · installments · campaign) that expands, request tracking, 2 years / Tümü with lowest by rank, two buyer questions. |
| 12 | Application Manager screens (18 modules) | 2026-11-13 (pre-approved, review pending) | Canvases "FırsatGeldi — 12a … 12e Yönetim"; anatomy in `pagedesign.md` §8.13; proposals listed in `screen_status.md`. |
| 11 | Legal Pages + Help and FAQ | 2026-11-12 | Canvas "FırsatGeldi — 11 Yasal Sayfalar ve Yardım"; anatomy in `pagedesign.md` §8.11. |
| 10 | Landing Page + SEO product page | 2026-11-12 | Canvas "FırsatGeldi — 10 Tanıtım Sayfası": landing with deal showcase (design §5.31), SEO product page, six states; token `sparkle`; anatomy in `pagedesign.md` §8.10. |
| 4 | Tracked Items | 2026-11-12 | Canvas "FırsatGeldi — 4 Takip Ettiklerim": list with summary tiles, filters, aligned rows, ended items dimmed at the bottom, six states, Add product dialog (search + suggestions + 3 image tiles, link paste, photo, attributes in a right panel). New: Dialog pattern (design §5.28), `size.modal-width` 1120, `size.modal-aside-width` 360, inline attribute variant. |

---

*When a decision changes, this document is updated together with `product_spect.md`, `product_design_pattern.md`, `engineering_checklist.md`, `design-tokens.json` and `architecture.md`; the documents must not contradict each other.*
