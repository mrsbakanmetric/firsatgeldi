# FırsatGeldi — Product Specification

**Status:** Working draft · **Last updated:** 2026-11-13 (rev. 7: return rules read from store sites, ratings and seller trust, request tracking, campaigns read from store/bank pages, Discover and Profile, Application Manager screens drawn, screen status file; rev. 6: roles, reveal rules, packages, v1 helpers, histories, fraud, images, personal data and web stack decided; mobile technology open) · **Market:** Türkiye (international parked)

This document is the single source of truth for the FırsatGeldi product idea, the decisions taken so far, the research behind them and the open questions. Decisions marked **[DECIDED]** were confirmed by the product owner; [RECOMMENDED] / [ASSUMPTION] / [INTERIM] items await confirmation; [OPEN] / [DECIDE LATER] items are intentionally undecided.

**Scope of this document:** product logic and behaviour — what the system does and what information each screen shows. Module-by-module detail (content, rules, routes, permissions) is in `modules.md`; system design in `architecture.md`; schema and parameters in `database.md`. Visual design lives in `product_design_pattern.md` and `design-tokens.json`. Engineering acceptance rules are in `engineering_checklist.md`. Page anatomy is in `pagedesign.md`; the live status and order of screen work (web and mobile) is in `screen_status.md`.

---

## 0. CORE PRODUCT LOGIC — never forget [DECIDED]

Every screen, flow and feature must follow this logic:

1. **Find the product** the user bought or searched for.
2. **Make the user verify it is exactly the right product.** Show plenty of detail (brand, model/generation, variant/bundle, colour, category, images, and for the listing they bought: seller, platform, stock, warranty type, last-checked time).
3. **Two-step confirmation:** the user first **marks** a candidate ("İşaretle"), reviews the details, and only then confirms ("Evet, bunu aldım" / "Almadım, sadece takip et"). Nothing is tracked on a single tap.
4. **The owner of an offer is the seller, not the platform.** The platform (Trendyol, Hepsiburada, MediaMarkt, Amazon…) is only where that seller sells. On marketplaces every seller of the same product is a separate offer. When the platform itself is the seller, the platform is recorded as the seller and this is stated.
5. **When a price below the user's price exists, show that it exists and how much they save — but hide who sells it.** Example: "Başka bir satıcıda 3.002 TL daha ucuz", never the seller's or platform's name.
6. **The seller is revealed only through a reveal action ("Göster").** In the first release Göster is free and unlimited; later it uses the package entitlement (monthly allowance, token or Premium). The UI and API are built so the gate is swapped without redesign.
7. **The price paid comes from the user [DECIDED — R1].** It is never prefilled from our own price data (that would let the user infer the cheaper seller); the user types it, or it is read from their own link or order screenshot.

Consequences:
- The identification step ("Hangisi seninki?") lists **products/variants**, not offers. The confirm step shows **no seller list**: the seller is typed by the user (confirmed by exact match) or comes from their own link/screenshot.
- **Multiple cheaper sellers:** list **all of them**, cheapest (net) first, each with its own saving and reveal control.
- **Visible before reveal (not identifying):** price, previous price, saving, stock status and duration, warranty type, how long the price has been valid, **shipping cost, delivery time**, last-checked time.
- **Hidden until reveal (identifying) [DECIDED — A3]:** seller name, seller rating, listing link **and the platform name**.
- **Want-to-buy mode [DECIDED]:** the same rule — all cheaper sellers hidden, revealed through the gate.
- **Reveal lifetime [DECIDED]:** a revealed seller stays visible for **1 week** (parameter), then is hidden again.
- Hidden sellers are referred to by rank ("en ucuz satıcı", "2. ucuz satıcı") in lists, charts, histories, notifications and emails.
- The seller (and platform) the user bought from is always visible.
- Hiding is enforced on the **server**: no response, page source, URL, image address or notification payload may contain a hidden seller's identity before reveal.
- Notifications, banners, charts, emails, SEO product pages and community surfaces follow the same rule; a link shared in Discover becomes a hidden-seller offer.
- The Application Manager always sees hidden sellers; every such view is recorded.

---

## 1. Product summary

### 1.1 Problem
People buy products online and, before the return/withdrawal period ends, the same product often becomes cheaper — at the same store or from another seller. Tracking every store manually is tedious and people forget, so they lose money.

### 1.2 Solution
FırsatGeldi tracks the products a user has bought (and products they want to buy) across Turkish e-commerce sites. When it finds the same product cheaper while the return window is still open, it notifies the user so they can:

1. Cancel the order (if not yet shipped) or return the product within the return window — or request the price difference,
2. Re-order the identical product at the lower price,
3. Keep the difference.

### 1.3 Two core modes (one shared price engine)
| Mode | User intent | What the system does |
|---|---|---|
| **"Aldım" (I bought it)** | Protect a past purchase | Tracks price until the return deadline, alerts if cheaper anywhere |
| **"Takip et / Alacağım" (I want it)** | Buy at the right price | Search, compare sellers, price history, target-price alerts; "Aldım" moves it into return tracking |

### 1.4 Unique value
No product in Türkiye combines **post-purchase tracking + return-deadline management + cross-store comparison**. Akakçe/Cimri compare prices and send alerts but do not know what the user bought or when the return window closes. Abroad, return trackers (ReturnNotice, Return Keeper) don't track prices and price trackers (Keepa, CamelCamelCamel) don't know return windows.

---

## 2. Market research findings

### 2.1 Demand evidence
- Turkish e-commerce volume reached **4.567 trillion TL in 2025 (+52%)**; clothing (428 bn TL) and electronics (304 bn TL) are the largest categories.
- Şikayetvar has hundreds of complaints like "price dropped before my return window closed" (e.g. robot vacuum 34,999 → 31,999 TL).
- **Boyner "İndirim Korumalı Alışveriş"** (own products only): ~400k users, avg. 620 TL refunded each.
- Our live tests: Dyson V15 Detect Absolute 30,999–39,999 TL across stores; Insta360 Ace Pro 2 Flash Print Bundle 25,997–29,899 TL (excluding outliers).

### 2.2 International landscape (status Nov 2026)
| Product | Status | Lesson |
|---|---|---|
| Paribus | Acquired by Capital One (2016), absorbed into Capital One Shopping | Became a feature, not a standalone company |
| Earny | Shrunk: price protection only at 15 retailers, $19.99/yr; Google Play 3.2 | Account linking is fragile; email/account access raises privacy concerns |
| Capital One Shopping | Active; settled a lawsuit (2025) over diverting creators' affiliate commissions | Affiliate ethics matter |
| PayPal Honey | Lost ~6M+ Chrome users after a 2024 exposé on affiliate code replacement | Trust collapses fast if affiliate is abused |
| Credit-card price protection (Chase, Citi) | Largely discontinued | Users now carry the tracking burden themselves |
| Target | Ended competitor price match (Jul 2025); only own-price adjustment within 14 days | Retailers are retreating from price protection |

### 2.3 User behaviour
- 90% of consumers prefer retailers that refund price drops (Paribus survey, n=1,500).
- 72% say price is the main purchase factor; 2/3 won't return to a retailer after a bad return experience.
- Consumers overestimate how often they'll claim a refund — in practice most don't (Rice University). **Automation is the value.**
- Retailers fight return abuse (US: $101 bn lost in 2023, ~14% of returns). **Our model is legitimate** (return to the same store under the legal withdrawal right), but frequent returners may get flagged → frequent-return warning in v1.

### 2.4 Willingness to pay
Turkish users rarely pay for app subscriptions (RevenueCat: 89% of Turkish developers' subscription revenue comes from abroad). → Affiliate is the main revenue; Premium and tokens are secondary; showing "you saved X TL" increases willingness to pay.

### 2.5 Biggest unknown
**How often does a cheaper price actually appear within the return window?** Recommended validation (no code): track 50–100 products from mixed categories twice a day for 2 weeks via SerpApi (~$75–150) and measure the share with a >5% drop.

---

## 3. Platform & scope decisions

| Topic | Decision |
|---|---|
| Platform | **[DECIDED]** Web first (responsive, installable); development starts there. Mobile later. **Mobile screen coverage and permissions are defined** (`modules.md` access matrix); **mobile technology, requirements and infrastructure are [OPEN]**. |
| Market | **[DECIDED]** Türkiye only. International stores parked (§12). |
| Login | **[DECIDED]** Google, Apple, and email sign-up. Built last. |
| Roles | **[DECIDED]** **Application Manager** (sees and manages everything, everywhere — web and mobile) + **User** (own data only). Guest is an access level (landing, SEO pages, legal, help, search and mark). Authorisation is data: every screen and action is bound to a permission key; future roles are added by selecting permissions. |
| Notifications | **[DECIDED]** Web: in-app centre (bell panel + "Tümü" page) + email (on by default; "Aradığın ürün ucuzladı" e-mail off by default). Push in the mobile phase. Channel-agnostic logic. |
| Price data | **[DECIDED]** Google Shopping via SerpApi **and** the stores' own site searches together; product-page verification before notifying and on click. Seller-level offers. |
| Monetisation | **[DECIDED]** Free + Premium + tokens + affiliate (§11). No online payment for now. |
| Language | **[DECIDED]** Turkish default, English second, in all packages. |
| Product level | **[DECIDED]** Production product, not an MVP; delivered in vertical slices. |
| Launch categories | **[DECIDED]** Electronics and clothing together (§8.4). |
| Web technology | **[DECIDED]** §14 and `architecture.md` §3. |
| Histories | **[DECIDED]** Activity, search, product, price/stock and audit histories kept indefinitely; anonymised on account deletion (§13). |

### 3.1 Login & account module [DECIDED]
**Build order: late** (step 11 of `modules.md` Appendix A; the permission framework and a development login come first, in infrastructure). During development the app runs with a development login; the full module is implemented before launch. User IDs are on all records from day one.

| Method | Details |
|---|---|
| **Sign in with Google / Apple** | Shown at the top (one tap). Apple supports "Hide my email". |
| **Individual sign-up** | Email + password below; email verification; password rules (min 8 chars, a letter and a digit [ASSUMPTION]); reset by email without revealing whether an account exists; temporary lockout after repeated failures [ASSUMPTION: 5 tries → 15 min] |

Rules:
- One account per person: the same verified email through another method links to one account.
- Guests can search and mark; sign-in is asked at confirmation, then they continue where they left off.
- Profile: name, username, avatar, language, notification preferences, privacy level.
- **Email and phone are masked** on every screen; seeing or changing them needs re-authentication [RECOMMENDED]; passwords are never shown.
- Session: secure, refreshable web session; sign out from all devices; devices and recent sign-ins visible in Security settings.
- **Account deletion [DECIDED]:** closes the account immediately; signing in within **30 days** restores it; then personal data is permanently deleted and statistics stay anonymous. Data export available.
- **Mandatory account and security notifications** (welcome, verification, new device, password, deletion, suspension, export, package outcome, support reply, re-consent) are always sent in-app + email and cannot be turned off.
- Security: rate-limited sign-in; **two-step verification mandatory for Application Manager accounts** [DECIDED] (authenticator app + backup codes); optional 2FA for users and SMS verification later.

### 3.2 Multi-language (i18n) [DECIDED]
- Languages: **Turkish (default)** and **English**; a new language is added through translation files, the supported-locales setting and translations of admin data — no database schema change.
- **Automatic detection [DECIDED]:** URL locale → signed-in user's saved language → guest cookie → browser language (`tr*` → TR, `en*` → EN, anything else → TR) → TR. Changeable in settings; saved to the account; a guest's choice carries over at sign-up.
- **Everything the user reads switches:** screens, errors, empty states, notifications, emails, onboarding, legal texts, help and return-guide texts.
- Locale formats switch: dates, times, numbers, currency (`25.999,00 TL` vs `TL 25,999.00`), relative times.
- **Store data is not translated** (product titles, seller names); category and attribute labels translated through templates.
- LLM outputs in the user's language. Layouts tolerate longer strings. Language-aware URLs (`/tr/…`, `/en/…`).

### 3.3 Visual system (not specified here)
All visual values are in `design-tokens.json`; look-and-behaviour rules in `product_design_pattern.md`. Functional requirements: one config drives web and mobile; the Application Manager switches the active theme globally; each user chooses light / dark / system; anyone building UI reads the config first.

---

## 4. Modules

Full content per module is in `modules.md`. Release column: **v1** = first public release (built in slices per `modules.md` Appendix A).

| # | Module | Description | Release |
|---|---|---|---|
| 1 | Product input (Search and Add) | **Text search primary.** One input for text, links and up to 5 photos. Identify → mark → confirm (§5.2). **v1 helpers [DECIDED]:** link detection, one-shot fill from order screenshot, bulk add from one screenshot. Email-forwarding import is backlog. | v1 |
| 2 | Return window | Platform × category rule with start type (order / delivery) and days; estimated last day labelled "tahmini" until "Teslim aldın mı?" is answered; editable; warnings for categories without withdrawal right; frequent-return warning. | v1 |
| 3 | Price history | Product detail, compact 14-day on Home and Tracked Items; pre-tracking history shown dimmed; purchase marker; series: price paid and cheapest price (seller unnamed). | v1 |
| 3a | Price summary | Lowest/highest/average 7 / 30 days, current cheapest, difference vs. price paid. | v1 |
| 4 | Product confirmation | Two steps (§0); price paid typed by the user; no seller list (typed seller, exact match, or own link/screenshot); similar-but-different shown separately. | v1 |
| 5 | Action | Ordered steps with "Yaptım ✓" ticks; ready price-difference message; `.ics` calendar; end tracking with method and re-bought price. | v1 |
| 6 | Notifications | Bell panel + "Tümü" page; email on by default (except "Aradığın ürün ucuzladı"); daily cap; optional digest; mandatory account/security notifications. Push in mobile phase. | v1 |
| 7 | Community (Discover) | Popular tracked items, deals caught, feed from followed users, verified user links (shown as hidden-seller offers); consent-based; anonymity threshold; "Keşfet" in the main navigation. Anatomy: `pagedesign.md` §8.12. | later slice |
| 8 | Extras (warranty, cargo tracking, coupons) | To be discussed; cargo tracking link field [RECOMMENDED]. | post-v1 |
| 9 | Savings report (My Savings) | Total + month/year, per product with method, missed deals separately; records editable for 7 days. | v1 |
| 10 | International stores | Parked. | parked |
| 11 | Want to Buy | "Almadım, sadece takip et": optional target price (suggestion chips [ASSUMPTION]), duration 1W / 1M (default) / 3M / unlimited, all sellers hidden, "Aldım" → return tracking. | v1 |
| 12 | User follow (Profile and Following) | **[DECIDED]** one-way follow; private profiles need approval; default privacy "Only me"; search text never shared; report + block; Profilim in the profile menu. | later slice |
| 13 | Personal & social ranking | ~100 text matches re-ranked by personal, social, popularity and deal signals. | v1 (social signals with module 12) |
| 14 | Platform | Web first, then mobile (technology open). | v1 web |
| 15 | Sign-in and Sign-up | §3.1. **Built last.** | v1 (last) |
| 16 | Notification preferences | Per-type email opt-out, time slots + custom range, digest. Edited only in Profile › Settings › Notifications. | v1 |
| 17 | Return guide | Link to each platform's return policy page; "Know your rights" content shared with Help and FAQ. | v1 |
| 18 | Trust & accuracy | Last-checked time everywhere; "wrong price" / "different product" reports; repeated wrong-price reports suspend the offer. | v1 |
| 19 | Order status | Ordered / Shipped / Delivered → cancel / return / price difference. | v1 |
| 20 | Tracking duration | Want mode durations; extension asked 3 days before the end. | v1 |
| 21 | Bundle-discount warning | Warn when a partial return breaks a "buy 3 pay 2" discount. | post-v1 |
| 22 | Packages and Premium | Monthly free reveals, tokens, Premium (§11). Requests approved manually. | v1 (gate later) |
| 23 | Seller, stock & duration info | Seller-level offers with rating, platform, link, warranty, shipping cost, delivery time, stock state and durations ("at least"); identity hidden until reveal; re-checked on click. | v1 |
| 23a | Ratings, installments and seller trust | Installment notes per offer ("peşin fiyatına N taksit", table after reveal); store product ratings + counts aggregated across stores (no store names before reveal, no review texts); two one-tap questions to verified buyers; FırsatGeldi seller trust indicator (good/bad tile before reveal, breakdown after). | v1 (indicator once evidence exists) |
| 23b | Request tracking | Mark "price difference asked" / "return opened", reminders before the window closes, outcome recorded. | v1 |
| 23c | Carrier tracking | Cargo tracking number → carrier status → delivery date fixes the last return day. | next phase |
| 24 | Check Now | Cache 5 min; Free 10/day, Premium 30/day (parameters); remaining allowance shown; bulk check on Tracked Items. | v1 |
| 25 | Multi-language | §3.2. | v1 |
| 26 | Visual system | §3.3. | v1 |
| 27 | Reveal gate (hidden seller) | Göster per cheaper seller; **first release free and unlimited**; reveal lasts **1 week** (parameter); price watch for 60 min after reveal; later Premium → monthly allowance → token → "Hakkın bitti". | v1 (free), gate later |
| 28 | Home | Summary line, search box, "Hemen Gözat", return reminder line, other items. | v1 |
| 29 | Stock history | 14-day, three states, by rank when hidden, "at least" durations, change log. | v1 |
| 30 | Landing Page | Signed-out home: search, how it works, aggregate figures, **deal showcase** (this week's anonymous deals, the main conversion block), know your rights; SEO product pages with rank-only hidden sellers. Anatomy: `pagedesign.md` §8.10. | v1 |
| 31 | Legal Pages | Privacy notice (KVKK), terms, cookie policy, commission disclosure; one template; versioned; re-consent; cookie bar with equal-weight choices. | v1 |
| 32 | Help and FAQ | Articles, store picker with return rules read from each store's site (age shown; "Varsayılan" when nothing could be read), contact form + Taleplerim, contextual help. Anatomy: `pagedesign.md` §8.11. | v1 |
| 33 | Settings and Account | Profile, masked email/phone, password, language, theme, notifications, privacy, cookies, security (devices), search history (hide), export, deletion (30-day restore). | v1 |
| 34 | Admin modules | Admin Overview, Return Rules, Category Templates, Campaign Calendar, Platforms and Source Health, Reports and Match Corrections, System Settings, Provider Usage and Cost, Users, Audit Log, Notification Templates, Catalogue and Products, Package Settings and Requests, Legal and Content, Support Requests, History Explorer, Fraud Monitoring, Roles and Permissions — web and mobile, Application Manager. AdminShell with section sub-navigation; list + detail panel template; drawn in canvases 12a–12e (pre-approved, review pending). Anatomy: `pagedesign.md` §8.13. | v1 |

---

## 5. Screens and flows — functional logic

Defines **what each screen shows and does**, not how it looks. All screens obey §0. Screen status, platform (web / mobile / one only) and design order: `screen_status.md`. How every page is built (shell, templates, shared components, page anatomy, cross-page flows): `pagedesign.md`.

### 5.1 Home (first screen)

**Rule:** if the user tracks at least one product, Home opens with their latest data immediately (cache first, refreshed in the background). A new user sees the search box and three steps below it (no interest picker [DECIDED]; `modules.md` › Home). Signed-out visitors see the Landing Page.

**Order:** summary line → (A) search box → (B) "Hemen Gözat" → return reminder line → (C) other tracked products.

- **Summary line:** "Takipte 4 ürün · 38.400 TL koruma altında · tümü 4 dk önce kontrol edildi".
- **A. Search box:** text, links and photos; recent searches. While typing, an inline area under the box shows the first 3 matches as image tiles (no price, no store); a tile, Enter or a link hands over to Search and Add at the matching step [DECIDED].
- **B. "Hemen Gözat":** one priority product at detail level.
  - Selection: (1) open deal, nearest return deadline first; (2) return ≤ 3 days; (3) target reached; (4) most recent change.
  - Shows: flags; name; purchase line (bought · seller/platform · price · date · order status); 14-day price history with conclusion; 14-day stock history of the cheapest offer; "N satıcıda daha ucuz · en çok kazanç X TL" and every cheaper offer on its own line (price, stock, duration, shipping, hidden seller, Göster); quick actions: Fırsatı gör · return policy · Şimdi kontrol et.
- **Return reminder line [DECIDED, v1]:** even without a deal, for items whose window ends within 2 days ("İade edecek bir şey var mı?").
- **C. Other tracked products:** compact rows; a second item at the same priority sits first with an emphasised border.

### 5.2 Search & add — identify → mark → confirm (target: under 10 seconds)

1. **Input:** text, link and/or up to 5 photos (product, label, order screenshot), with an image privacy note. **While typing [DECIDED]:** the first three catalogue matches appear instantly as image tiles and change with every keystroke; all matches are in a scrollable list and the active one (pointer or ↑/↓) is previewed on the right (image, category, brand, generation, colours, bundles, number of stores — no price, no store); typo correction ("Bunu mu demek istedin"), a live store search when the catalogue has no match. A pasted store link fills product, seller and price paid; an order screenshot fills product, seller, price and order date; several products in one screenshot → bulk add.
2. **"Nasıl anladık":** extracted attributes with one-tap alternatives; at most 1–2 questions. **Every attribute chip can be changed [DECIDED]:** it opens the values allowed by the category template; picking one re-runs the search; changing a match-critical attribute clears the mark; "Geri al" restores it.
3. **Step 1 — Mark ("Hangisi seninki?"):** products/variants only (image, name, model/generation, bundle, colour, number of stores); **no store names, no prices**; reversible; similar-but-different separated; no exact match → say so + closest three.
4. **Step 2 — Confirm ("Emin ol, sonra onayla"):**
   - **The listing they bought:** platform chosen; seller typed by the user (exact match) or taken from their own link/screenshot — **no seller list**; seller rating, stock and warranty as three good/bad tiles (green check / red cross; good/bad from the seller trust indicator, store rating as fallback), last check, open listing. On the web the mark list (left) and the confirm panel (right) are side by side; with nothing marked the panel asks the user to mark a product.
   - **Price paid:** typed by the user; prefilled only from their own link or screenshot (R1).
   - Order date, order status; return window suggested from the platform × category rule ("tahmini" when delivery-based and delivery unknown), editable; warning for categories without withdrawal right.
   - **Cheaper-price teaser:** shown once the price paid is entered or prefilled; count, maximum saving, one line per cheaper seller, hidden, Göster each.
   - Final actions: **"Evet, bunu aldım"** → bought mode; **"Almadım, sadece takip et"** → want mode (target price, duration).
   - Same product already tracked in the same mode → "Zaten takip ediyorsun" + open it.

### 5.3 Tracked list ("Takip ettiklerim")

- **Summary:** count; open deals (count and total maximum saving); returns approaching; last check.
- **Filters with counts:** All · Bought · Want to buy · Has deal · Ended. **Sorting:** Priority (default) · Return date · Saving.
- **Ended items:** under "Ended" and dimmed at the bottom of "All" (name, end reason and date, saving if recorded).
- **Each product:** flags; name; purchase line or target; compact price history with caption; compact stock history (cheapest offer when a deal exists, otherwise the seller bought from); state; one action.
- **Bulk "Şimdi kontrol et"** for visible active items, drawing from the daily allowance (stated in advance).
- Cheaper seller names never appear here (no Göster in this list).

### 5.4 Product detail

- **Header:** name; seller and platform bought from; purchase line; order status; return countdown and last day ("tahmini" + "Teslim aldın mı?" when estimated); add to calendar (.ics).
- **Deal summary:** number of cheaper sellers, best net price, when it dropped, last verification, maximum net saving.
- **Ratings [DECIDED 2026-11-12]:** stores' product ratings and review counts aggregated across stores without store names before Göster ("4 mağazada 3.850 değerlendirme · ortalama 4,5 ★"); per-store rating after Göster; review texts never taken.
- **Price history:** 2 weeks / 1 month / 3 months (up to 2 years / Tümü as data grows); paid vs cheapest; deal point; "Aldın" marker; pre-tracking history dimmed; the period's lowest marked by seller **rank**; summary values.
- **Cheaper sellers ("Daha ucuz N satıcı"):** full width, at most 2 columns; an odd last offer spans the row; side-by-side cards align row by row [DECIDED].
  - All sellers below the user's price, cheapest net first.
  - Visible before reveal: price, previous price, saving (net incl. shipping, or "kargo hariç"), warranty, stock with duration, price duration, **shipping cost, delivery time**, last check; **fake-discount note** when a claimed old price was not seen in our last 30 days.
  - **Seller trust tile [DECIDED 2026-11-12]:** "Güvenilir satıcı ✓ / Dikkat ✗" with the reason in words, from our own data (stock consistency, delivery accuracy, wrong-price reports, buyers' answers); breakdown after Göster.
  - **Installment note [DECIDED 2026-11-13]:** "Peşin fiyatına en çok 6 taksit" read from the product page, never applied to the price; bank/card table after Göster.
  - **Campaign note [DECIDED 2026-11-13]:** a cart discount or card offer read from store/bank pages appears as a separate note ("Bir satıcıda kart kampanyası olabilir"), never applied to the price; store, card and conditions after Göster.
  - Hidden until reveal: seller name, rating, platform, link. Göster each; remaining-allowance indicator.
  - After reveal (1 week): seller, platform, "Mağazaya git" (re-checks; "fiyat değişti" if higher; next offer + "stoğa gelince haber ver" if gone), Gizle.
  - The seller they bought from listed for reference.
  - "Şimdi kontrol et"; "wrong price / different product" report.
- **Stock history:** last 14 days and last 1 month side by side [DECIDED], per seller (by rank while hidden) and the seller bought from; change log.
- **Action steps** (ordered, each with a reversible "Yaptım ✓" tick):
  1. Create the return request (or cancel if not shipped; or request the price difference when there is no withdrawal right — **ready message** copied in one tap, never containing the hidden seller's name) with the return-policy link and the warning to return first; frequent-return warning where applicable.
  2. Re-order from the cheaper seller (reveal required).
  - **Request tracking [DECIDED 2026-11-12]:** "Fiyat farkı istedim" / "İade talebi açtım" → "Yanıt bekleniyor · N gün önce", reminder before the window closes, outcome recorded (verildi · reddedildi · kupon). We never contact sellers on the user's behalf.
  3. End tracking → method (return + re-buy · cancel + re-buy · price difference money/coupon · "did not use the deal" [ASSUMPTION] → recorded as a missed deal, no saving) and re-bought price (prefilled, editable) → saving recorded in My Savings → two optional one-tap questions for verified buyers ("Satıcı fiyat farkını verdi mi?", "İade sorunsuz muydu?").

### 5.5 Price history and stock history — what they must communicate (all screens)

**Price history**
- States its period and shows start and end dates.
- Two named series, each with its current value: the price the user paid, and the cheapest price now (seller unnamed).
- Purchase moment marked ("Aldın"); history before tracking dimmed with a "Takip başladı" marker.
- Nothing cheaper → says the user's price is the cheapest; tracking stopped → stop date marked; want mode → target price shown with its value.
- One plain-language conclusion.
- Detail adds axes, selectable ranges and summary values.

**Stock history**
- One unit = one day; period and dates shown.
- Exactly three states with a visible key: in stock, low stock, out of stock.
- States which seller it refers to (by rank if hidden).
- Out-of-stock periods called out; a plain-language current state and duration ("en az 3 gündür").
- Distinguishable without colour alone.

### 5.6 Background flow: deal found
1. A scheduled scan finds lower prices for the identical product (same variant, same warranty type, in stock).
2. Price and stock verified on the store page.
3. Notification with net saving and days left, **seller hidden**: *"Bu kamerayı 28.999 TL'ye aldın; başka bir satıcıda 25.997 TL. 3.002 TL kazanç · iade için 4 gün."*
4. The product becomes the priority item on Home and shows the deal on Tracked Items and Product Detail.

### 5.7 Want-to-buy flow
Search → mark → "just track" → optional target and duration → alerts on target or notable drop (buy-or-wait hint where history allows) → Göster → buy via link → "Aldım" → return tracking with the price paid.

### 5.8 Other screens (defined in `modules.md`)
Notifications (bell panel + "Tümü" page) · My Savings · Packages and Premium · Settings and Account · Sign-in · Landing Page and SEO product pages · Legal Pages · Help and FAQ · Discover and Profile (later slice) · all admin modules.

---

## 6. Price data strategy

### 6.1 Sources
| Priority | Source | Notes |
|---|---|---|
| 1a | **Google Shopping via SerpApi** | One query returns many Turkish stores. No load on store sites. Prices may lag by hours. |
| 1b | **The stores' own site search** (with 1a) | One adapter per store (Trendyol, Hepsiburada, Amazon TR, MediaMarkt, Teknosa, more later). Current, **seller-level** listings incl. shipping and delivery time where available. Merged and de-duplicated with 1a; the store's own data wins on disagreement; if one source fails the other continues and an alarm is raised. |
| 2 | Product-page verification | Before notifying and on click: price, stock, seller, warranty, shipping. JSON-LD → site JSON → HTML → LLM last. |
| 3 | Official channels | Amazon Creators API (invite-only in TR). Trendyol / Hepsiburada affiliate programmes give links, not data. |
| 4 | Data partnerships | Akakçe / Cimri. |

Official API availability (checked): Amazon TR has a product API (invite-only affiliate); Trendyol, Hepsiburada APIs are seller-only; Teknosa, MediaMarkt have no public API.

### 6.2 SerpApi findings from tests
- Use `engine=google_shopping`, `location=Istanbul, Turkey`, `google_domain=google.com.tr`, `gl=tr`, `hl=tr`.
- **Model-only queries return accessories**; query with model + bundle.
- `categorized_shopping_results` groups the main product separately.
- `filters` returns Google's attribute schema per category plus price bands → category templates and outlier thresholds.
- Problems to clean: accessories, generation mix-ups, variants, bundle names, outliers, second-hand and foreign stores, duplicates.
- Typos are tolerated.
- Prices can lag and miss basket discounts → always verify on the store page.
- `multiple_sources` + immersive product API may list all sellers (to be tested).
- Google Lens API as a second opinion for photos.

### 6.3 Cost (SerpApi, Aug 2026)
| Plan | $/month | Searches/month | Per hour |
|---|---|---|---|
| Free | 0 | 250 | 50 |
| Starter | 25 | 1,000 | 200 |
| Developer | 75 | 5,000 | 1,000 |
| Production | 150 | 15,000 | 3,000 |
| Big Data | 275 | 30,000 | 6,000 |
| Searcher | 725 | 100,000 | 20,000 |
| Volume | 1,475 | 250,000 | 50,000 |
| Cloud 1M | 3,750 | 1,000,000 | 110,000 |

| Tracked products | Frequency | Queries/month | Plan |
|---|---|---|---|
| 100 | every 3 h | 24,000 | Big Data $275 |
| 1,000 | every 3 h | 240,000 | Volume $1,475 |
| 1,000 | hourly | 720,000 | Cloud 1M $3,750 |
| 1,000 | every 5 min | 8,640,000 | not viable |

Cheaper providers (DataForSEO, Scrapingdog, SearchAPI) to be benchmarked. **Budget control [DECIDED]:** budget alarms and an automatic budget-saving mode (reduced frequency) run together.

---

## 7. Monitoring & scheduling

- **Track per product, not per user.**
- **Adaptive frequency** (system-decided, not user-configurable; intervals are parameters):

| Situation | Check interval |
|---|---|
| Return deadline in 1–3 days | 15–30 min (store-page checks) |
| Campaign periods (11.11, Efsane Kasım, Black Friday, New Year) | 15–30 min |
| Volatile products | 30–60 min |
| Normal | 2–4 h |
| Return window expired | stop |

- **Premium [DECIDED]:** items tracked by a Premium user are checked 2× more often.
- **Check Now [DECIDED]:** 5-min cache; Free 10/day, Premium 30/day; bulk check from Tracked Items.
- **Parallel processing:** Redis + BullMQ workers; per-site concurrency limits.
- **Polite crawling:** robots.txt, ~1–2 req/s per site, identifiable User-Agent, back off when blocked (never evade), cache, **no store accounts**.
- Prefer list/search pages over product pages where possible.
- **Campaign / flash-deal detection:** campaign calendar + mass-drop detection + **stores' campaign pages, banks' card-campaign pages and affiliate promotion feeds read daily** (arrive as "awaiting approval"; conditional offers never change the shown price) [DECIDED 2026-11-13] + newsletters + social accounts + Akakçe/Cimri lists.
- **Health monitoring:** parser alarms, success rate & latency per site, outlier filter, circuit breakers.

---

## 8. Product identification & matching

### 8.1 Input philosophy
**[DECIDED]** Search is primary; photo, link and screenshot are helpers. The user chooses the matching product from store images.

### 8.2 Category-based entity extraction
1. Classify (e.g. "Camera > Action camera", "Clothing > Outerwear > Coat").
2. Load the category's attribute template (from Google Shopping `filters` + Google Product Taxonomy; match-critical fields marked).
3. Vision LLM fills fields with confidence scores (JSON).
4. Ask only fields that are low-confidence AND match-critical, max 2–3 tappable questions.

| Category | Fields (match-critical in bold) |
|---|---|
| Camera | type, **brand**, **model/generation**, **bundle**, colour |
| Phone | **brand**, **model**, **storage**, colour |
| Vacuum / appliances | **brand**, **model**, **variant**, type |
| Clothing | type, **brand**, **product/model code**, gender, **colour**, size, material |
| Shoes | **brand**, **model**, **colour**, size, gender |
| Cosmetics | **brand**, **product name**, **volume (ml)**, shade |

### 8.3 Matching order
Barcode (EAN) → brand + normalised model code → embedding similarity (pgvector) + image pHash → LLM "same product and same bundle?" → **user confirmation** (stored as feedback).

### 8.4 Rules
- Same variant/bundle/generation and same **warranty type** only (or a clear warning); confidence score shown.
- No exact match: say so and show the closest 3.
- **Electronics:** model + bundle name is reliable.
- **Clothing:** private labels cannot be compared across stores; use brand + image similarity + model code (label photo valuable); confirmation shows images; without brand/code → same-seller tracking only, stated.
- **Launch focus [DECIDED]: electronics and clothing together.**

---

## 9. Search architecture & performance

### 9.1 Hybrid catalogue
Own index (≈50 ms) → if missing/stale → live Google Shopping + site search (1–3 s) → clean, match, save, index → show.

### 9.2 Data model
Defined in `database.md` (products, offers, sellers, platforms, price/stock history, tracked items, reveals, histories, media, packages, roles…).

### 9.3 Search engine
**Meilisearch [DECIDED].** Turkish normalisation, typo tolerance, synonyms, brand/model boosting, accessory demotion. Autocomplete without API calls.

### 9.4 Personalised ranking
Engine returns ~100 candidates → re-ranker: `score = text_match × (1 + 0.4·personal + 0.3·social + 0.2·popularity + 0.1·deal)`; signals precomputed and cached. Cold start: popularity + deals (no interest picker [DECIDED]).

### 9.5 Performance rules
Cached first; progressive loading; pre-warm popular products; query cache 1–4 h; targets: own-index search < 100 ms, live query < 3 s, add product < 10 s.

### 9.6 Ease-of-use rules
Max 3 steps; auto-fill from link/screenshot; max 1–2 tappable questions; typo-tolerant; recent searches; share-sheet in the mobile phase; clear "no exact match" message.

---

## 10. Notifications

- **Channels [DECIDED]:** web in-app (bell panel, "Tümü" page) + email; **email on by default for all types except** "Aradığın ürün ucuzladı" (`SEARCHED_PRODUCT_DROP`), whose e-mail is **off by default** [DECIDED 2026-11-13]; per-type on/off. Push in the mobile phase. Telegram bot [RECOMMENDED] for the web phase.
- **Legal nature of email [DECIDE LATER]:** service message vs commercial message (ETK/İYS); legal opinion before launch.
- **Daily cap [DECIDED]:** default 5 (parameter); return ≤ 2 days not capped.
- **Digest [DECIDED]:** optional daily digest; urgent items never wait.
- Time preferences: Morning / Noon / Evening / Night / Always + custom range; quiet hours move items to the next allowed slot.
- Priority: return deadline soon > large saving > normal drop. No duplicate alerts for the same deal.
- Types: deal found, deal ended, return approaching, anything to return?, target reached, back in stock, delivered?, tracking ending, saving recorded, price dropped, price rose after reveal, **searched product got cheaper** (untracked recent search, not hidden, can be turned off, lowest priority) [DECIDED].
- **Screens [DECIDED]:** every item shows the product image and the mode ("Aldım" / "Almak istiyorum" / "Takipte değil"); clicking an item in the bell panel opens a preview to its left with the product's key values; "Takip et" opens the Add product dialog at step 2 (bought / want). Preferences are edited only in Profile › Settings › Notifications.
- **Account and security notifications [DECIDED]:** always in-app + email, not capped, not digested, cannot be turned off.
- **Admin notifications:** high-risk fraud case, source alert, budget threshold, daily digest of pending requests.
- Content: net saving first, days left, low-stock note, check age — never a hidden seller's or platform's name.

---

## 11. Monetisation

| Source | Role | Notes |
|---|---|---|
| Affiliate (Trendyol, Hepsiburada Link Gelir, Amazon Associates) | Main | Mobile phones excluded from Trendyol commission |
| Premium | Secondary | Unlimited reveals, 50 tracked items, 30 checks/day, 2× check frequency |
| Tokens | Secondary | Extra reveals for non-Premium users |
| Data (price index) / B2B | Later | KVKK-compliant aggregates only |

**Packages [DECIDED]** (defaults editable on a dedicated admin screen):

| Value | Free | Premium |
|---|---|---|
| Monthly Göster allowance | 3 | Unlimited |
| Products tracked at once | 10 | 50 |
| Daily check allowance | 10 | 30 |
| Check frequency | Normal | 2× |
| Welcome gift | 3 tokens (once) | — |

- **Gate order:** Premium → monthly free allowance → token → "Hakkın bitti" + request Premium/tokens. Until the package process ships, Göster is free and unlimited.
- **Token cost [INTERIM]:** flat 1 token per reveal; saving-based tiered pricing to be discussed later.
- **Payment [DECIDED]:** no online payment for now; users request Premium/tokens and the Application Manager approves manually.
- **Refund:** if price rises or stock runs out within the price-watch window after reveal, the allowance/token is returned.
- Monthly allowance resets, no roll-over; tokens do not expire [ASSUMPTION].
- **Prices [DECIDE LATER]:** Premium and token prices, payment provider.
- "Pays for itself" framing: "Bu ay 3.000 TL kazandın".

**Affiliate ethics [RECOMMENDED]:** use our affiliate link only when the user clicks our recommendation; never replace anyone else's code; disclose commissions; rank by price, never by commission.

---

## 12. Parked: international stores
- Google Shopping supports other countries via `gl`.
- Default return window per country/category, user-editable.
- Convert to TL with source/date; warn about shipping, customs and duty-free limits.
- Compare within the purchase country only.

---

## 13. Legal, trust, privacy & risk

- **Withdrawal right exceptions:** phones, smartwatches, drones, tablets and computers bought online have no 14-day withdrawal right → never suggest "return"; suggest "request price difference" (ready message).
- **Order of operations warning:** create the return/cancel request first, then buy.
- **Frequent-return warning [DECIDED, v1]:** from the user's own records; threshold and period are parameters.
- **KVKK:** privacy notice, explicit consent for community data, export and deletion (30-day restore), data location decision. Search text never shared.
- **Histories [DECIDED]:** activity, search, product, price/stock and audit histories kept indefinitely; anonymised on account deletion; users can hide own search entries. **[OPEN — legal]** indefinite retention and hide-only search history vs the KVKK right to erasure → legal opinion before launch.
- **Fraud monitoring [DECIDED]:** user actions logged and scored (rules → signals → scores → cases → restrictions); the Application Manager is notified of high-risk cases; restrictions have reasons and are reversible. Rule list and automatic-action limit [RECOMMENDED → confirm].
- **Personal data [DECIDED]:** email/phone encrypted with a blind index; passwords Argon2id; masked on every screen; never logged; Application Manager full-value view with reason, 10 minutes, audited.
- **Images [DECIDED]:** no binary in the database; metadata stripped; original not kept; user uploads private; order screenshots and identification photos deleted after 24 hours, support-request screenshots after 30 days; no personal data taken from images.
- **Affiliate disclosure** (Advertising Board sensitivity); legal pages versioned with re-consent.
- **Store terms of use** for page checks; brand names as text only.
- **Wrong-price liability** disclaimer in terms.
- **Risks:** retailers may dislike return-encouraging tools; regulation changes; Akakçe/Cimri could add post-purchase tracking; trademark/domain check for "FırsatGeldi".

---

## 14. Web technology stack [DECIDED]

Priorities: **security → speed → data visible instantly → modern look and feel.** Current stable versions. Full detail in `architecture.md` §3. Mobile technology is **[OPEN]**.

| Layer | Decision |
|---|---|
| Repository | pnpm + Turborepo monorepo |
| Web | Next.js (App Router) + React + TypeScript (strict); PWA |
| Interface | Tailwind CSS from `design-tokens.json` + Radix UI / React Aria |
| Data & immediacy | TanStack Query + Server-Sent Events |
| Charts | In-house SVG components |
| API | NestJS (Fastify) + Zod + OpenAPI |
| Database | PostgreSQL + TimescaleDB + pgvector; Prisma + raw SQL migrations |
| Background work | Workers + Redis + BullMQ |
| Search | Meilisearch |
| Files | S3-compatible object storage + CDN; private bucket for uploads |
| Keys | KMS + secret manager |
| AI | Vision LLM + embeddings behind a provider interface |
| Observability | OpenTelemetry + error tracking + metrics/alerts |
| Hosting | Containers near Türkiye, CDN + WAF |
| Admin | Same web app at `/[locale]/admin` and on mobile; Application Manager; permission-checked on the server |

---

## 15. KPIs
Weekly active users · products tracked per user · **deal rate** · **action rate** · total user savings · affiliate revenue per active user · API cost per active user · reveal → store click rate · Premium/token request rate.

---

## 16. Idea backlog (not yet decided)
- **Email forwarding import** (`name@ekle.firsatgeldi.com`).
- **Telegram/WhatsApp** bot.
- **Real payable price** by membership (Trendyol Plus, Hepsiburada Premium, Prime) and cards.
- **Equivalent product suggestions** (want mode only).
- **Pricing-error alerts** (with cancellation-risk warning).
- **Invoice & warranty document storage**; cargo tracking.
- **FırsatGeldi Price Index** (PR content).
- **Shareable savings card**; browser extension; referral programme; gamification.

(Moved to v1: "anything to return?" reminder, buy-or-wait hint, fake-discount note.)

---

## 17. Open questions
Closed since rev. 5: follow model (one-way + private), want-mode hiding (all hidden), platform name before reveal (hidden), roles (Application Manager + User), web stack (decided), free/Premium split (§11 values). Closed in rev. 7: return-rule table (read from store sites, "Varsayılan" when unreadable), seller-rating threshold (replaced by the seller trust indicator).

1. **[OPEN]** Should sellers **more expensive** than the user's price be shown by name? (Currently only the seller bought from is named.)
2. **[DECIDE LATER]** Legal nature of default-on email (service vs commercial; İYS).
3. **[DECIDE LATER]** Premium and token prices, tiered token cost, payment provider.
4. **[DECIDE LATER]** Discover sharing reward (interim: 1 token per verified cheaper link, cap 10/month, "Fırsat Avcısı" badge).
5. **[OPEN — legal]** Indefinite histories and hide-only search history vs KVKK erasure.
6. **[RECOMMENDED → confirm]** Critical settings list; fraud rule list and automatic-action limit; view-as-user; re-authentication for own email/phone.
7. ~~Store × category return-rule table~~ → closed: read automatically from each store's return page (`modules.md` Return Rules).
8. Deal-frequency validation test (2 weeks, 50–100 products).
8a. **Data-availability test [DECIDED 2026-11-13, after the Product Detail drawing]:** for ~20 products in 5 stores, check which source actually gives seller, seller name, seller rating, review counts, stock, campaign and installment data, and how reliably.
9. Benchmark of cheaper SERP providers.
10. ~~First vertical slice (A2)~~ → closed [DECIDED 2026-11-13]: approved; build order in `modules.md` Appendix A.
11. Screen designs — status and order in `screen_status.md`; built per `pagedesign.md`.
12. **[OPEN]** Mobile technology, requirements and infrastructure.
13. **[DECIDE LATER — with the mobile app designs]** Which five items go in the phone bottom tab bar now that Keşfet is in the main navigation.
14. **[ASSUMPTION → confirm]** Thresholds introduced in rev. 7: Discover anonymity 5 trackers, ratings minimum 20, campaign and return-page read interval 24 h, History Explorer query range 12 months.

---

## Sources
- [Alomaliye – Turkish e-commerce 2025](https://www.alomaliye.com/2026/05/12/turkiyede-e-ticaret-hacmi-2025te-4-6-trilyon-liraya-ulasti/)
- [Medyascope – Boyner İndirim Korumalı Alışveriş](https://medyascope.tv/2025/05/13/boyner-indirim-korumali-alisveris-ile-fiyat-degisimlerine-karsi-musterilerine-koruma-kalkani-sagliyor/)
- [Şikayetvar – Hepsiburada price difference](https://www.sikayetvar.com/hepsiburada/satin-aldigim-urunun-fiyati-dustu-farkin-iadesini-talep-ediyorum)
- [CNN Türk – Withdrawal right changes](https://www.cnnturk.com/ekonomi/e-alisveriste-yeni-donem-resmi-gazetede-yayimlandi-1829195)
- [Paribus – Wikipedia](https://en.wikipedia.org/wiki/Paribus)
- [Money Done Right – Earny review](https://moneydoneright.com/earny-review)
- [Hello Partner – Capital One settlement](https://hellopartner.com/capital-one-settles-creator-lawsuit-over-browser-extension/)
- [PPC Land – Honey user decline](https://ppc.land/honey-drops-to-14-million-chrome-users-amid-ongoing-affiliate-scandal/)
- [Paribus/Capital One survey](https://www.atmia.com/news/paribus-from-capital-one-releases-comprehensive-guide-to-holiday-shopping-preferences/7161/)
- [Rice Business – price adjustment research](https://business.rice.edu/wisdom/peer-reviewed-research/how-price-adjusting-eases-consumer-regrets-while-boosting-profit)
- [Visualping – Target price match 2026](https://visualping.io/blog/target-price-matching)
- [Modern Retail – cross-retailer return abuse](https://www.modernretail.co/technology/marketplace-briefing-the-rise-of-temu-and-shein-is-fueling-cross-retailer-return-abuse/)
- [Foreks – RevenueCat Türkiye report](https://www.foreks.com/haber/detay/6ae1ac87422c786f3f7ab76d/FRKS/tr/revenuecat-in-eylul-2025agustos-2026-raporuna-gore-turk-mobil-uygulamalarinin-abonelik-gelirlerinin-yuzde-89-u-yurt-disindan-geliyor-28-10-26/)
- [CostBench – SerpApi pricing](https://www.costbench.com/software/web-scraping/serpapi/)
- [Amazon Creators API – locales](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/locale-reference)
- [Trendyol Developers](https://developers.trendyol.com/docs)
- [Trendyol affiliate programme](https://www.habergazetesi.com.tr/trendyol-affiliate-programina-nasil-basvurulur-tum-detaylar-burada)
- [Hepsiburada Link Gelir](https://medyascope.tv/2024/04/18/hepsiburada-tavsiye-ekonomisini-buyutuyor-tavsiyenin-lideri-link-gelir-ile-hanelere-1-milyar-tl-kazandiracak/)
- [ReturnNotice](https://www.hackingwithswift.com/forums/app-announcements/returnnotice-track-every-return-window-so-you-never-miss-a-deadline-countdowns-reminders-shipments-and-refunds-in-one-place/31019)
- [Return Keeper – App Store](https://apps.apple.com/us/app/return-keeper/id6771099541)
- [Webtekno – Akakçe](https://www.webtekno.com/en-ucuz-fiyat-bulmanizi-saglayan-platform-akakce-h132661.html)
