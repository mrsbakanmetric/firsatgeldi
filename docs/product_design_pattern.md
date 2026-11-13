# FırsatGeldi — Product Design Patterns

**Status:** v1.4 · **Last updated:** 2026-11-12 · **Applies to:** web and mobile

This document explains **how the product should look, feel and behave**: the colour logic, how users take action, and how any new screen, button or component must be built so the whole product stays consistent. It contains **no screen layouts** — it is the rulebook that every screen is built from.

| Document | Answers |
|---|---|
| `product_spect.md` | What the product does and what information each screen shows (logic) |
| `modules.md` | Module-by-module content, rules, routes, permissions; screen design plan (Appendix E) |
| **`product_design_pattern.md`** (this file) | How it looks and behaves; the patterns every screen reuses |
| `design-tokens.json` | The actual values (colours, sizes, spacing, component settings) — single source of truth for values |
| `engineering_checklist.md` | What must be verified before a feature is considered done |

This is a **production product**: every screen is built to these rules from the first release. This file is also the mandatory UI rulebook for developers and AI assistants.

**Golden rule:** before creating or changing any UI element, read `design-tokens.json` and this file. Never hard-code a colour, size, spacing, radius or shadow; use tokens. If a needed token or pattern does not exist, add it to the token file / this document first, then use it.

---

## 1. Design principles

1. **Savings first.** The most important thing on any surface is how much the user can save and how much time they have. Money and deadlines are always the most prominent information.
2. **Verify, then act.** The user confirms the product is right before anything is tracked or recommended. Important actions take two deliberate steps; nothing important happens on a single accidental tap.
3. **The cheaper seller is hidden until revealed.** An offer belongs to the seller who actually sells the product; the platform (Trendyol, MediaMarkt…) is only where they sell. A cheaper price is shown with its saving and stock status, never with the seller's or the platform's name, until the user reveals it. This applies everywhere, without exception.
4. **Fast and calm.** Show what we already know immediately, refresh quietly, never block the user with a blank wait. Urgency is communicated by facts (days left, stock low), not by flashing or noise.
5. **One clear next step.** Each surface has one primary action. The "deal" accent appears at most once per surface.
6. **Honest data.** Every price and stock value says when it was checked. Durations say "at least". Estimates say "tahmini". We say so when there is no exact match or no deal.
7. **Understandable without a manual.** Charts and histories label their own values; status never relies on colour alone.
8. **Private by default.** Personal data (email, phone) is masked; uploaded images are private and short-lived; the interface says so plainly.
9. **One system.** Same meaning → same colour, same component, same wording, on every screen and platform.

---

## 2. Colour system

### 2.1 How colour is organised
- **Palette** (raw colours) → **semantic tokens** (roles such as `primary`, `savings`, `warning`) → **themes** (which palette colour each role uses in light and dark).
- Screens and components use **semantic tokens only**. This is what allows the whole product to be re-themed by changing one setting.
- Active theme: `firsatgeldi-default` ("Kazanç Yeşili"). The Application Manager can switch the active theme globally; each user chooses light / dark / system.

### 2.2 Why these colours
In Türkiye, orange is the colour of stores (Trendyol, Hepsiburada, Amazon) and blue is the colour of comparison sites (Akakçe, Cimri). FırsatGeldi is neither: it is on the user's side and makes them money. So the brand colour is **emerald green — the same colour used for savings** — with a **coral accent reserved for the "deal found" moment** and deep ink neutrals for trust and readability.

### 2.3 Colour roles and meanings (fixed in every theme)

| Role (token) | Meaning | Use for | Never use for |
|---|---|---|---|
| `primary` / `savings` (emerald) | Brand; money saved; positive | Primary buttons, links, saving amounts, "cheapest", selected/marked state, in-stock, completed step tick | Warnings, decoration without meaning |
| `accent` (coral) | **The deal moment** | "Fırsat geldi" flag, the one "Fırsatı gör" action, deal point on a chart, deal notification, unread-deal counter | Regular buttons, errors, decoration. Max **one coral action per surface** |
| `warning` (amber) | Needs attention soon | Return deadline approaching, low stock, "similar but different" notices, allowance almost used up, frequent-return warning | Errors, positive states |
| `danger` (red) | Problem / ended | Sold out, return window expired, errors, destructive actions, rejected upload | Emphasis, prices |
| `info` (sky) | Neutral information | Non-urgent countdowns, tracking days left, informational notes, fake-discount note, buy-or-wait hint, privacy notes | Actions |
| `text`, `text-muted` (ink) | Content | Main text / secondary text, timestamps, "the price you paid" series, masked values | — |
| `background`, `surface`, `surface-alt`, `border` | Structure | Page, cards, inputs and secondary blocks, dividers | — |
| `hero-surface` (dark ink) | Highest emphasis block | The single block summarising a deal and its saving | More than one per surface |

Rules:
- **Meaning is fixed.** A new theme may change the brand and neutral colours, but emerald-like "saving", coral-like "deal", amber "attention", red "problem" keep their meanings so users learn them once.
- **Colour is never the only signal.** Every status has an icon and/or a text label; chart series differ by line style as well as colour; stock states differ by fill as well as colour.
- **Contrast:** all text meets WCAG AA (4.5:1; 3:1 for large text and UI parts). Coral always carries **dark** text, never white. Amber flags use the dedicated dark amber text token.
- **Sellers and platforms are neutral.** Seller and platform names are shown as neutral labels; never use a platform's brand colours or logo as styling.

### 2.4 Reference values (active theme)

| Token | Light | Dark |
|---|---|---|
| `primary` / `savings` | `#047857` | `#34D399` |
| `on-primary` | `#FFFFFF` | `#052E22` |
| `primary-subtle` / `savings-subtle` | `#D1FAE5` | `#0F3A2C` |
| `accent` | `#FF5A36` | `#FF7A5C` |
| `on-accent` | `#1A0A05` | `#1A0A05` |
| `warning` / `warning-subtle` / `on-warning-subtle` | `#A16207` / `#FEF3C7` / `#854D0E` | `#FBBF24` / `#3A2E0B` / `#FCD34D` |
| `danger` / `danger-subtle` | `#B91C1C` / `#FEE2E2` | `#F87171` / `#3B1416` |
| `info` / `info-subtle` | `#0369A1` / `#E0F2FE` | `#38BDF8` / `#0B2A3D` |
| `background` | `#F7FAF9` | `#07131F` |
| `surface` / `surface-alt` | `#FFFFFF` / `#EEF4F2` | `#0E1E2E` / `#16293B` |
| `border` | `#DCE5E1` | `#24384B` |
| `text` / `text-muted` | `#0B1F33` / `#4A5D6E` | `#EEF4F2` / `#9FB3C4` |
| `hero-surface` / `hero-savings` | `#0B1F33` / `#6EE7B7` | `#16293B` / `#6EE7B7` |
| `hero-line` (chart axis and dividers inside the hero block) | `#24384B` | `#24384B` |

The token file is authoritative; if this table and the file differ, the file wins.

---

## 3. Typography, spacing and shape

- **Typeface:** Inter (full Turkish character support) with system fallbacks. Prices and counters use tabular numbers so digits align.
- **Scale (use only these):** display (hero saving numbers) · h1 (page title) · h2 (section) · h3 (card title) · body · body-sm (secondary) · caption (timestamps, labels) · price-lg (main price) · price (list price) · button.
- **Emphasis by weight and size, not by colour.** Money amounts are the heaviest text in their block.
- **Old price:** small, muted, struck through, next to the current price.
- **Spacing:** 4-px based scale from the token file; related items sit close, sections are clearly separated. Lay out groups with gaps, not ad-hoc margins.
- **Shape:** medium radius for buttons and inputs, larger for cards, pill for flags and chips, extra-large for the search box. Hairline borders for structure; a stronger border only to show "selected / marked" or the priority item.
- **Alignment of side-by-side blocks [DECIDED]:** blocks shown next to each other that carry the same kind of content (e.g. stock history "Son 14 gün" and "Son 1 ay", offer cards, summary tiles) must line up row by row: same header height, same row order, same row height and element size (boxes, thumbnails, buttons), labels on one line (truncate rather than wrap), equal block heights (grid stretch), and their footers on the same baseline. Only the number of items per row may differ. Check alignment visually before a draft is presented.
- **Elevation:** very light shadow on cards, medium on the search box, the confirmation panel and the notification panel; no heavy shadows, no gradients.

---

## 4. Actions and buttons

### 4.1 Button hierarchy

| Type | Purpose | Rule |
|---|---|---|
| **Primary** (emerald) | The main action of a block: search, confirm ("Evet, bunu aldım"), go to store, add product | One per block |
| **Deal** (coral, dark text) | Open the deal ("Fırsatı gör") | **Only** for the deal moment; max one per surface |
| **Secondary** (outlined) | Alternative or lower-commitment action: mark ("İşaretle"), reveal ("Göster"), detail, end tracking, "just track" | Any number, never competing visually with primary |
| **Ghost** (text only) | Light utilities: check now, hide, undo mark, change, copy message, add to calendar | For actions that must not draw attention |
| **Danger** | Destructive: delete account, remove data | Always asks for confirmation |
| **Link** | Navigation or opening an external page (return policy, listing) | Underlined or clearly coloured; external links open the store |

### 4.2 Button behaviour
- **Label = verb + object** in the user's language ("Takibi bitir", "Mağazaya git", "Şimdi kontrol et"). No vague labels ("Tamam", "Devam").
- **States:** default, hover, pressed, focus (visible ring), disabled (reduced opacity, with a reason nearby), loading (label replaced by progress, width unchanged, not clickable twice).
- **Minimum touch target 44 px** on every interactive element.
- **Result is immediate and visible:** after an action the surface changes in place (marked, revealed, checked "just now"); avoid full-page reloads.
- **Reversible actions are simply undoable** (mark ↔ unmark, show ↔ hide, step tick ↔ untick). **Irreversible or costly actions are confirmed** (end tracking with unrecorded saving, delete account, applying a critical setting, and later: spending tokens).
- **External navigation** (go to store) re-checks stock and price first; if the offer is gone or the price rose, the user stays in the app and is shown the next option.
- Real button and link elements are always used so keyboard and assistive technology work.

### 4.3 Selection and toggles
- **Segmented choice** for a small set of mutually exclusive options (order status, time range, filters with counts, sorting, tracking duration). The selected option is visibly raised/filled and announced as pressed.
- **Chips** for quick corrections, recent searches and target-price suggestions; one tap applies them.
- **Marked/selected item** in a list: stronger emerald border plus a "marked" flag with a check icon (not border colour alone).

---

## 5. Core interaction patterns

### 5.1 Identify → mark → confirm (two-step confirmation)
1. Show candidates with enough detail to tell them apart (products/variants only — no seller names, no prices).
2. The user **marks** one (secondary button). Marking only selects; it can be undone.
3. A confirmation area shows everything we assumed (platform and seller bought from, date, status, return window) prefilled and editable. **The price paid is typed by the user**; it is prefilled only when read from the user's own link or order screenshot, never from our price data. No seller list is shown; the seller is typed by the user (confirmed by exact match) or taken from their own link or order screenshot, so no hidden seller's name can appear.
4. The user **confirms** with a primary button. Only then is anything saved.
Use this pattern whenever the system has guessed something the user must own (product identity, purchase details).

### 5.2 Reveal gate (hidden seller)
- Before reveal: a lock icon and the text that the seller is hidden, together with what **is** allowed to show — price, saving, stock status and duration, warranty type, price duration, **shipping cost, delivery time**, last check. Neither the seller's name nor the platform's name appears.
- Reveal control: secondary button "Göster", one per cheaper seller.
- After reveal (in place, no navigation): seller name first (with seller rating), the platform they sell on as a neutral label, a primary "go to listing" action, and "Gizle" to hide again.
- A revealed seller stays visible for a limited period (parameter, default 1 week), then returns to hidden; revealing again goes through the gate again.
- Hidden sellers are referred to by rank ("en ucuz satıcı", "2. ucuz satıcı") in lists, charts and histories.
- The gate is one reusable component. In the first release it is a free show/hide; later the same control uses an entitlement (monthly allowance, token or Premium). A slot for the **remaining-allowance indicator** (§5.10) and a short cost/entitlement note is reserved next to the button now, so screens need no redesign. When nothing is left: button disabled with the reason "Hakkın bitti" and a link to request Premium or tokens.

### 5.3 Deal moment
- A deal is announced by: the coral "Fırsat geldi" flag with a bolt icon, the saving amount in the largest type of the block, days left to return, and one coral "Fırsatı gör" action.
- The saving is the **net saving including shipping** when shipping is known; otherwise a small "kargo hariç" note sits next to it.
- If several sellers are cheaper, state the count and the **maximum** saving; list every cheaper offer, cheapest first (by net price).
- The item with a deal is ordered first and visually marked as the priority item (stronger border).
- Never use coral for anything that is not a deal.
- **Coral once per surface [DECIDED]:** when a surface has both the "Fırsat geldi" flag and the "Fırsatı gör" action, the action is coral and the flag uses the neutral flag style (bolt icon + text). On a surface without the action (e.g. `HeroBlock` with a secondary action), the flag is the coral element.

### 5.4 Urgency and deadlines
- Return deadline: amber flag with clock icon and the number of days (≤ 3 days); the last day is written as a date. When more than 3 days remain, use the neutral info style. When expired, red flag with a cross icon and tracking stops.
- A last day computed from an estimated delivery is labelled **"tahmini"** (§5.13).
- Low stock: amber flag. Sold out: red, and the next option is offered.
- No countdown animations, no blinking.

### 5.5 Freshness and "check now"
- Every price/stock shows its age ("2 dk önce kontrol edildi"). Durations use "en az".
- "Şimdi kontrol et" is a ghost button with a refresh icon; while running it shows progress in place, then updates the age to "az önce". If a fresh result already exists (within the cache window) it is shown instantly and no allowance is used.
- The remaining daily allowance is shown next to the button (§5.10). Bulk check states in advance how many items will be checked ("Kalan hakkın 3 · ilk 3 ürün kontrol edilecek").

### 5.6 Price history pattern
- States its period and shows start and end dates.
- Two series, distinguishable by line style **and** colour: **the price you paid** (solid, ink) and **the cheapest price now** (dashed, emerald). Each is labelled directly with its name and current value — no separate legend needed to read values.
- The purchase moment is a hollow point labelled "Aldın". A deal is a coral point at the end of the cheapest series.
- Variants: nothing cheaper → say the user's price is the cheapest; tracking stopped → mark the stop date; want-to-buy → dotted target-price reference with its value.
- History from before the user started tracking is shown **dimmed** (§5.12).
- Always accompanied by one plain-language sentence (what happened and when).
- The compact version (lists, home) and the full version (detail: value axis, date axis, selectable range, summary values) use the same colours, line styles and labels.

### 5.7 Stock history pattern
- A row of equal boxes, **one box = one day**, with dates under the first and last box.
- Three states, different by fill as well as colour: **in stock** = solid emerald, **low stock** = solid amber, **out of stock** = hollow box with dashed red border.
- A visible key explains the three states wherever the pattern appears.
- States which seller it refers to (by rank if hidden, or "the seller you bought from").
- Out-of-stock periods are named with dates where space allows; one sentence gives the current state and duration.
- On the detail level, a dated change log lists stock and price events, newest first.

### 5.8 Status flags
Small pill with icon + short text. Vocabulary is fixed: deal found (coral, bolt) · days left to return (amber or info, clock) · return window expired (red, cross) · low stock (amber) · sold out (red) · want-to-buy (neutral) · marked/selected (emerald, check) · cheapest (emerald, down arrow) · ended (neutral, dimmed row). Do not invent new flag colours; map new statuses to one of the five meanings in §2.3.

### 5.9 Money display
- Format follows the user's language (Turkish: `25.997 TL`).
- Saving is always shown as a positive amount in the savings colour with a down-arrow or the word "kazanç"; price differences against the user are written in words ("900 TL daha pahalı"), not in red.
- The user's own price is ink (neutral), the cheapest price is emerald.

### 5.10 Remaining-allowance indicator
- Shows what is left of a limited allowance next to the action that uses it: "Bugün 7 hakkın kaldı" (check), "Bu ay 2 Göster hakkın kaldı" (reveal), "Takipte 8/10" (tracking slots).
- Neutral (text-muted) while plenty is left; amber when one is left; at zero the action is disabled with the reason and a next step ("Yarın tekrar · ya da Premium").
- After a gated action, a short note says which allowance was used ("Aylık hakkından kullanıldı", later "1 jeton kullanıldı").
- Not shown for unlimited allowances (Premium reveals, Application Manager).
- Final visual design is made with the Product Detail and Tracked Items drafts (`modules.md` Appendix E); this section fixes its information content.

### 5.11 Step tick ("Yaptım ✓")
- Ordered action steps (return/cancel → re-buy → end tracking) each carry a ghost "Yaptım" control; ticking turns it into an emerald check "Yaptım ✓" and the step text becomes muted.
- Steps are numbered; the next un-ticked step is the visually current one.
- A later step stays usable before an earlier one is ticked, but shows the related amber warning next to it ("önce iade talebini oluştur").
- Ticks are reversible in one tap.

### 5.12 Dimmed pre-tracking history
- Price history that existed before the user started tracking is drawn with reduced emphasis (muted line or lower opacity), with a vertical marker "Takip başladı".
- The plain-language sentence never claims stock duration or price validity for the period before tracking.

### 5.13 Estimated ("tahmini") values
- A value computed from an assumption (e.g. last return day from an average delivery time) carries the word **"tahmini"** next to it, in the info style.
- Where the user can make it exact, a one-tap question sits beside it ("Teslim aldın mı?" · Evet, bugün · Evet, başka gün · Henüz değil); once answered, "tahmini" disappears.

### 5.14 Fake-discount note
- When a listing claims a discount or an old price that our history has not seen in the last 30 days: a neutral info note under the price — "Son 30 günde bu fiyattan satılmadı".
- No accusing words, no red, no warning icon; no note when history is insufficient.

### 5.15 Buy-or-wait hint
- In want-to-buy mode, a one-line info hint based on history and the campaign calendar (e.g. "Son 30 günün en düşüğüne yakın", "Kampanya dönemi yaklaşıyor").
- Phrased as information, never as an instruction or a promise; shown only when history is sufficient.

### 5.16 Contextual help panel
- A small "?" ghost control next to a concept the user may not know (withdrawal right, price difference, "tahmini", hidden seller) opens a side/bottom panel with a short explanation and a link to the full Help and FAQ article.
- The panel never covers the action it explains on phones without a clear close control; keyboard and screen-reader accessible.

### 5.17 Consent dialog
- Used when consent is legally required (sign-up notices, community sharing, a legal text version needing re-consent, cookie preferences).
- States plainly what is shared or accepted, links to the full text, and offers equally prominent accept and decline choices; nothing is pre-ticked.
- Declining keeps the user in a working state and explains what is unavailable.

### 5.18 Masked field + time-limited "Göster"
- Email and phone are shown masked by default (`m***@g***.com`, `+90 5** *** ** 67`); passwords are never shown.
- For the user: seeing or changing the full value asks for re-authentication [RECOMMENDED: within 15 minutes].
- For the Application Manager: "Göster" asks for a reason, reveals the value for a limited time (default 10 minutes) with a visible countdown, then masks it again; a note says the view is recorded.
- Never uses the coral accent; uses the lock icon like the reveal gate but the neutral style.

### 5.19 Multi-image upload
- Up to the configured number of images (default 5) in one go; each file shows its own thumbnail and progress.
- A rejected file ("desteklenmeyen dosya", "çok büyük") shows its reason in the danger style on that file only; the others continue. Order is kept; files can be removed individually before sending.
- Accepted types and size limit are stated near the control.

### 5.20 Image privacy note
- Shown next to every image upload control. The text depends on the purpose [DECIDED 2026-11-13]:
  - Identification photo / order screenshot (Search and Add, Add product dialog): "Görselin yalnız ürünü tanımak için kullanılır, 24 saat sonra silinir; ad, adres gibi bilgilerin kaydedilmez."
  - Support screenshot (Bize yaz): "Ekran görüntülerin talebin için 30 gün saklanır, sonra silinir; yalnız destek ekibi görür."
- Retention values come from settings (`media.private_retention_hours`, `support.attachment_retention_days`), never typed into the text.
- Info style with a lock or shield icon; always visible, not hidden in a tooltip.

### 5.21 App shell (`AppShell`)
- Defined once; every user screen renders inside it. Regions: **top bar** (logo, search entry, notification bell with panel, profile menu), **main navigation**, **content area**, **footer**.
- Main navigation order is fixed: Ana Sayfa · Takip · Ara ve Ekle · Keşfet · Kazancım · Profil [DECIDED 2026-11-12]. From `breakpoint.md` upward the first five sit in the top bar as text + icon links and **Profil is the avatar menu at the right end** of the top bar; below `breakpoint.md` they form a bottom tab bar (which five items go in the phone bar is [DECIDE LATER — together with the mobile app designs]; until then the phone-width drafts show Ana Sayfa · Takip · Ara ve Ekle · Kazancım · Profil) (`size.bottom-nav-height`) with icon + label. The current section is highlighted by weight, an indicator bar and `aria-current` (not by colour alone). [DECIDED]
- Until Profile and Following ships, the **Profil** entry opens Settings and Account. [DECIDED]
- Top bar height `size.header-height`; content centred within `size.content-max-width`.
- Footer: legal links (KVKK, Koşullar, Çerezler, Komisyon), help link, commission note. On phones it sits at the end of the content, above the bottom tab bar.
- Items the user has no permission for are not rendered (server still enforces). Guests see the shell with sign-in in place of the profile menu.
- **Profile menu entries [DECIDED]:** Profilim · Paketim · Ayarlar (Bildirimler, Güvenlik, Arama geçmişi, Dil, Tema, Gizlilik, Hesap) · Çıkış. When one of these pages is open the avatar button carries `aria-current` and a 2 px `primary` border.
- **AdminShell [DECIDED]:** admin pages use a `hero-surface` header with a "Yönetim" badge, the admin menu and "Kullanıcı görünümüne geç"; content area and templates are the same as the user app.
- **AuthShell [DECIDED]:** sign-in, sign-up, reset and verify pages use a header with logo + language switch only and a minimal footer.

### 5.22 Page templates (`PageTemplate`)
- Every screen picks one template; a new screen never invents its own layout. Templates: **List** (Tracked Items, Notifications) · **Detail** (Product Detail) · **Flow** (Search and Add, Sign-in) · **Summary** (Home, My Savings, Packages and Premium) · **Settings** (Settings and Account; admin settings screens) [DECIDED].
- Fixed regions in every template, in this order: page title (h1) · summary line (optional) · content · side panel slot (optional; a sheet on phones, §5.25) · page actions.
- Templates define layout only; content comes from the shared components. Each template draws the five states (loading, empty, error, stale, success) in the same positions.
- Region order, overlay usage (Dialog §5.28, Sheet §5.25, bell preview §5.29) and the page-by-page anatomy are specified in `pagedesign.md`.

### 5.23 Skeleton loader (`SkeletonBlock`)
- Placeholder blocks in the shape of the content they replace (text lines, thumbnails, cards), filled with `surface-alt`, using existing radius tokens.
- First real results replace placeholders as they arrive; no full-screen spinner.
- With reduced motion, placeholders are static (no shimmer).

### 5.24 Step indicator (`StepIndicator`)
- Shows position in an ordered flow (e.g. identify → mark → confirm) and in bulk add ("2/3"). Numbered steps with text labels; the current step is emphasised by weight and border, completed steps carry a check icon.
- A skippable step offers a ghost "Atla" control; skipped items are kept and can be returned to.

### 5.25 Panel / sheet (`Sheet`)
- One component, two forms: below `breakpoint.md` a bottom sheet; from `breakpoint.md` a side panel of `size.side-panel-width`.
- Always a visible close control; focus moves into the panel and is kept there while it is open; Escape closes it; the page behind keeps its state.
- Used for the confirm panel, contextual help (§5.16), the notification panel and filters.

### 5.26 Fact tile (good / bad)
- Short facts about a listing (seller rating, stock, warranty…) are shown as equal tiles in a row (three columns when there are three).
- Each tile: icon + label + value. Good = `savings-subtle` background, emerald check; bad = `danger-subtle` background, red cross. Never colour alone. [DECIDED]

### 5.27 Attribute chip with value list
- An attribute chip ("Renk Siyah") opens a list of allowed values under it (from the category template) and a "type it if not listed" field; the current value carries a check.
- Picking a value updates the chip (emphasised border while changed), re-runs the search and shows a status line with "Geri al". Changing a match-critical attribute clears any mark. [DECIDED]
- **Inline variant (side panel of a dialog) [DECIDED]:** when the attributes sit in a side panel (e.g. the Add product dialog), every allowed value is shown as a button (radio group) under the attribute label; the current value has the emphasised border. Attributes with more than 8 values fall back to the chip + value list above.

### 5.28 Dialog (`Dialog`) [DECIDED]
- Centred window over a dimmed page (`color.overlay`); the page behind keeps its state. Below `breakpoint.md` it becomes a full-height bottom sheet (§5.25).
- Width `size.modal-width`; an optional right side panel of `size.modal-aside-width` on `surface-alt` holds the selected item and the primary action.
- Header: icon tile (`primary-subtle`) + title + one-line description; a step indicator (§5.24) when the dialog has steps. Close is a 40px round bordered icon button in the top-right corner, `aria-label="Kapat"`.
- Focus moves in and is trapped; Escape closes; `aria-modal="true"`, labelled by the title. Radius `radius.xl`, shadow `shadow.lg`.
- Used for flows started in place that must not leave the page (Add product from Tracked Items). Never for limit-reached messages (§6).

### 5.29 Notification item and preview [DECIDED]
- Row: unread dot · product image (80 px on the page, 52 px in the bell panel) with the type as a 22–28 px corner badge · type + time · title · message · mode badge ("Aldım" `primary-subtle`, "Almak istiyorum" `surface-alt`, "Takipte değil" dashed outline) + check time · action column. Columns are fixed so rows align.
- Type badges use existing tokens only: deal = ink, return = `warning-subtle`, delivery/account = `info`, drop/stock/saving = `primary`.
- Bell panel preview: opens to the left of the panel (560 px) for the clicked item; product, message, three fact tiles (§5.26 layout, no good/bad colouring unless a saving), 14-day cheapest-price chart where relevant, check time, actions. The coral action appears only in the preview.

### 5.30 Product image, list search and category filter [DECIDED]
- **Product image is mandatory.** Wherever a product is shown (list row, card, tile, notification, preview, dialog, panel, email), its image is shown next to it. Sizes: 44–56 px in compact lists and side columns, 72–80 px in main lists, 120 px+ in previews and detail heroes. The image sits on a `surface-alt` square with `radius.md`, `object-fit: contain`.
- **Fallback:** if the catalogue has no image, a category illustration is shown in the same slot (never an empty box, never a generic icon only). Account/security items without a product use a lock tile instead.
- **Every list is searchable:** a search field above the list (placeholder says what is searched, e.g. "Takip listende ara: ürün, marka, satıcın"); results filter as you type; an empty result shows "Bu aramayla eşleşen … yok" + "Filtreyi temizle".
- **Every product list can be filtered by category:** category chips with counts (few categories) or a "Kategori" select with counts (many). Category and search combine with the list's other filters.

### 5.31 Deal showcase (Landing Page only) [DECIDED 2026-11-12]
The Landing Page's "Bu hafta bulunan fırsatlardan" block is the product's sales window and is allowed to stand out more than any in-app surface.
- **Surface:** `hero-surface` band, `radius.xl`, a soft `hero-savings` glow (10 % opacity, blurred) behind the title, and a field of twinkling 4-point stars (`sparkle`) and dots (`on-hero-surface`).
- **Header:** pill "★ Haftanın fırsatları" (`sparkle` background, `hero-surface` text) · title in `typography.scale.display` · right-aligned weekly total ("Bu hafta toplam kazanç [W] TL", `hero-savings`, hidden below the anonymity/volume threshold).
- **Category chips on the band:** selected = `sparkle` fill + `hero-surface` text; others = `hero-line` border, transparent, `on-hero-surface` text.
- **Cards:** `surface`, `radius.xl`, 2 px `sparkle` ring + `shadow.lg`; image 180 px with a "★ %N daha ucuz" pill (`sparkle`) and a periodic light sheen; name; Ödenen (struck) | Bulunan; bottom **saving strip** (`primary-subtle`, amount in `h2`). Hover lifts the card 4 px.
- **Closing action:** one `hero-savings` button "Senin ürünün de ucuzlamış olabilir · Ücretsiz başla".
- **Limits:** `sparkle` is used only in this block. No coral here (the page's single coral stays in the hero card). Data are real, anonymous and aggregate; no user or seller names; the block is hidden when fewer than 3 examples pass the threshold.
- **Motion:** see §9 — the only decorative looping motion in the product.

### 5.33 Store tile and logo [DECIDED 2026-11-12]
- **Logo tile:** 48 px square, `logo-surface` (white in both themes) with 1 px `border`, `radius.md`; holds the platform's official logo file (uploaded in Platforms with a permission source). Without a logo or permission: the platform's initials in `on-logo-surface`, weight 700. Never redraw a brand's logo.
- **Store tile (Help):** a `button` with logo tile + name · rule line ("14 gün · teslimden") · source line ("Mağazanın sitesinden · 3 saat önce"). Selected: 2 px `primary` border on `primary-subtle`. Warning variants on `warning-subtle`: "Sayfa okunamadı · en az 3 gün önceki değer" and "Varsayılan · mağazadan alınamadı".
- **Rule card:** title, 4 facts (İade süresi "en az", Süre başlangıcı, Kargoya verilmeden, İade kargo), no-withdrawal categories, warning box when unreadable or default, footer with read time and "Mağazanın iade sayfası ↗".

### 5.34 Person row and follow button [DECIDED 2026-11-12]
- Avatar: initials on `primary-subtle` (40 px in rows, 96 px in profile headers); @username always, real name never required.
- Badge "Fırsat Avcısı" on `primary-subtle` with a check icon; privacy pill (lock + "Sadece ben / Takipçilere açık / Herkese açık") on `surface-alt`.
- Follow button states: **Takip et** (primary) → **Takip ediliyor** (secondary; press again to unfollow) · private profile: **Takip isteği gönder** → **İstek gönderildi** (secondary; press again to withdraw).
- What another person shared is shown; what they did not share says so in muted text ("Ödediği fiyatı paylaşmıyor", "Kazancını paylaşmıyor") rather than disappearing silently.

### 5.35 Admin list with detail panel [RECOMMENDED 2026-11-13]
- Table rows are real buttons in a fixed-column grid shared with the header row; the selected row uses `primary-subtle`; dimmed rows (closed, pending deletion) use 60 % opacity.
- First column by row type: product image 48 · platform logo tile 40 (`logo-surface`) · person avatar 40 (initials on `primary-subtle`).
- Status pills: ok `primary-subtle` · warn `warning-subtle` · bad `danger-subtle` + `danger` text · info `info-subtle` · muted `surface-alt`. Never colour alone: the pill always has a word.
- Detail panel 380 px: title (+ image), badges, key–value rows (130 px label column), blocks (history, thread, signals), muted note, actions (first = primary, danger = outline), result line in `info-subtle`.
- Personal data stays masked in lists and panels; "Göster" with a reason opens it for 10 minutes. Hidden seller identity appears only in admin views and is audited.

### 5.32 Small recommendation strips
Strips of **6 items or fewer** (e.g. "Benzer ürünler", "Senin için") are exempt from the list search/category rule (§5.30); they still show product images, price and check time. Anything longer, or anything the user browses, is a list and follows §5.30.

---

## 6. Feedback, loading, empty and error states

- **Cached first:** show stored data immediately with its age; refresh in the background and update in place. Never a blank screen or a full-screen spinner for data we already have.
- **Loading new results:** placeholders in the shape of the content, first results as soon as they arrive, rest progressively.
- **Empty states** always offer the next step: nothing tracked → search/add; no exact match → closest three and a way to refine; no deal → say so plainly with when we last checked.
- **Success feedback** is shown in place (the item changes) plus a short non-blocking message for background results (e.g. saving recorded).
- **Errors** say what happened and what to do, in plain language, near where it happened; keep the user's input. A failed price/stock check never erases the last known value — it shows the old value with its age.
- **Offer disappeared or price rose** (after reveal or on click): explain ("fiyat değişti"), show the next cheapest option, offer "notify when back in stock".
- **Warnings that protect the user** (create the return first; category has no withdrawal right; many returns at one store) use the amber attention style and sit next to the action they concern.
- **Limit reached** (tracking slots, checks, reveals): use the remaining-allowance indicator (§5.10); never a blocking modal.

---

## 7. Navigation and structure

- Persistent top-level navigation with the same order everywhere; the current section is highlighted. Notifications: a bell opens a **panel** (latest items, unread first) with a "Tümü" link to the full page; the bell counter uses the deal accent only when there is an unread deal.
- Content has a comfortable maximum width and is centred; blocks stack into one column on narrow screens. The layout switch point is `breakpoint.md` (§5.21, §5.25).
- Order of information inside any surface: **status → what it is → money/time → evidence (history, stock) → actions**.
- The most urgent item comes first; lists default to priority order (open deal and nearest deadline first). Ended items sit dimmed at the bottom of "All".
- Search is always reachable; the search input accepts text, links and photos in one place.
- Moving from a summary to its detail keeps the same data, wording and order so the user recognises it.
- Pages and actions the user has no permission for are not shown; the server still enforces permissions (hiding in the client is cosmetic).

---

## 8. Rules for building a new screen or component

Follow this order every time:

1. **Read** `design-tokens.json` and this document. Check `product_spect.md` and `modules.md` for what the screen must show and which permission keys apply.
2. **Name the one primary action** of the screen and decide the single most important fact (usually saving or deadline).
3. **Reuse before inventing.** Pick a page template (§5.22) inside the app shell (§5.21), then compose it from existing patterns: flags, cards, money display, price history, stock history, reveal gate, two-step confirmation, segmented choice, status sentence, remaining-allowance indicator, step tick, masked field, multi-image upload. A new pattern is added to this document and the token file first.
4. **Apply the colour meanings** of §2.3. Check: is coral used at most once, and only for a deal? Does every status have an icon or label? Is any cheaper seller's or platform's name visible before reveal? (It must not be.) Is any email/phone shown unmasked? (It must not be.)
5. **Define all states:** loading, empty, error, stale, success, disabled, hidden/revealed, limit reached, light and dark, long text, Turkish and English.
6. **Buttons:** one primary per block, labels as verb + object, 44 px targets, visible focus, loading and disabled states.
7. **Freshness:** every price/stock has its age; durations say "at least"; estimates say "tahmini".
8. **Alignment:** side-by-side blocks of the same kind align row by row (§3).
9. **Product image, search, category:** every product shown has its image (§5.30); every list has search; every product list has a category filter.
10. **Responsive:** works from phone width upward; nothing overflows; wide tables scroll in their own area.
11. **Accessibility:** real buttons/links/inputs with labels; contrast AA; not colour alone; charts have a text description.
12. **No hard-coded values**; semantic tokens only; verify in light and dark.

---

## 9. Motion

- Short and functional: 120–320 ms with the standard easing from the token file.
- Use motion only to show cause and effect: an item becoming marked, a seller being revealed, a value updating after a check, a step being ticked.
- No decorative, looping or attention-grabbing animation inside the app. Respect the user's reduced-motion setting.
- **Single exception [DECIDED 2026-11-12]:** the Landing Page deal showcase (§5.31) may loop: star twinkle (1.8–3.4 s, staggered), card image sheen (≈4.5 s), 4 px hover lift. Under `prefers-reduced-motion: reduce` all three stop (stars stay visible, static). Nowhere else.

---

## 10. Language and tone in the interface

- Speak to the user directly and simply ("Senin ödediğin", "Kazancın", "Hangisi seninki?").
- Lead with the benefit and the number: "3.002 TL kazanç", "İade için 4 gün kaldı".
- Be precise and honest: "en az 3 gündür stokta", "2 dk önce kontrol edildi", "tam eşleşme bulunamadı", "tahmini".
- Same thing, same word everywhere (e.g. always "Takibi bitir", "Göster / Gizle", "Şimdi kontrol et", "Fırsat geldi", "Yaptım").
- All interface text comes from translation files (Turkish default, English second); product titles and seller names stay as the store provides them. Layouts must tolerate longer text.

---

## 11. Theming and platform parity

- One token file generates the web variables and the mobile theme; both platforms use the same roles, patterns and wording.
- Changing the active theme, or the user's light/dark choice, restyles everything instantly without code changes.
- Each new token needs a light and a dark value and must pass the contrast check.
- Seasonal themes may change brand and neutral colours and shapes, never the fixed meanings in §2.3.
- Admin screens use the same tokens and patterns as user screens, on web and mobile.

---

## 12. Do / Don't

| Do | Don't |
|---|---|
| Show saving and deadline first | Bury the saving under details |
| One coral action per surface, only for a deal | Use coral for ordinary buttons or errors |
| Hide the cheaper seller (and platform) until "Göster" | Mention a cheaper seller's or platform's name in text, charts, flags or notifications |
| Mark first, confirm second | Start tracking on a single tap |
| Let the user type the price paid | Prefill the price paid from our own price data |
| Label chart values directly | Show unlabeled lines or bars |
| Icon + text for every status | Rely on colour alone |
| Show when each value was checked; say "tahmini" for estimates | Show a price without its age or an estimate as exact |
| Show remaining allowance next to the action | Surprise the user with a blocking "limit reached" modal |
| Mask email and phone by default | Show personal data in full without a reason |
| Say how uploaded images are used and when they are deleted | Upload images silently |
| Use tokens and existing patterns | Hard-code colours or invent one-off components |
| Neutral seller/platform labels | Platform logos or brand colours as styling |
| Calm, factual urgency | Blinking, countdown animations, fake scarcity |
