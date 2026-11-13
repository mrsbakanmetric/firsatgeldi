# FırsatGeldi — Page Design

**Status:** v1.1 · **Last updated:** 2026-11-12 · **Scope:** web, desktop 1280 (layout switches below `breakpoint.md`), light and dark · **Language of UI copy:** Turkish (English supported, see product_spect §3.2)

This document explains **how every page is built**: the one shell, the page templates, the shared components, the global page rules, the page-by-page anatomy of the approved screens, and the procedure for deriving any new page. It is the bridge between `product_design_pattern.md` (rules and patterns), `design-tokens.json` (values), `modules.md` (what each screen must do) and the code.

**Precedence.** If this document and another one disagree: values → `design-tokens.json`; behaviour and data → `modules.md` / `product_spect.md`; visual rule → `product_design_pattern.md`. Fix the conflict in the same change; the documents must never contradict each other.

**Design canvases (approved drafts, light + dark, five states each):**

| # | Screen | Canvas |
|---|---|---|
| 0 | App shell and component set | FırsatGeldi — 0 İskelet ve Bileşenler |
| 1 | Search and Add | FırsatGeldi — 1 Ara ve Ekle |
| 2 | Product Detail | FırsatGeldi — 2 Ürün Detayı |
| 3 | Home | FırsatGeldi — 3 Ana Sayfa |
| 4 | Tracked Items (+ Add product dialog) | FırsatGeldi — 4 Takip Ettiklerim |
| 5 | Notifications (+ bell panel, "Takip et" dialog) | FırsatGeldi — 5 Bildirimler |
| 6 | My Savings | FırsatGeldi — 6 Kazancım |
| 7 | Packages and Premium | FırsatGeldi — 7 Paketim ve Premium |
| 8 | Sign-in and Sign-up | FırsatGeldi — 8 Giriş |
| 9 | Settings and Account (user + Application Manager) | FırsatGeldi — 9 Ayarlar ve Hesap |
| 10 | Landing Page (+ SEO product page) | FırsatGeldi — 10 Tanıtım Sayfası |
| 11 | Legal Pages + Help and FAQ | FırsatGeldi — 11 Yasal Sayfalar ve Yardım |
| 13 | Discover and Profile | FırsatGeldi — 13 Keşfet ve Profil |
| 12 | Application Manager screens (pre-approved, review pending) | FırsatGeldi — 12a … 12e Yönetim |

---

## Contents
1. [Building blocks at a glance](#1-building-blocks-at-a-glance)
2. [The shell](#2-the-shell)
3. [Page templates](#3-page-templates)
4. [Overlays](#4-overlays)
5. [Shared components](#5-shared-components)
6. [Global page rules (apply to every page)](#6-global-page-rules-apply-to-every-page)
7. [The five states](#7-the-five-states)
8. [Page specifications](#8-page-specifications)
8.10 [Landing Page and product page](#810-landing-page--locale-signed-out-and-product-page--localeurunslug)
8.11 [Help and Legal Pages](#811-help-and-faq)
8.12 [Discover and Profile](#812-discover)
8.13 [Application Manager screens](#813-application-manager-screens)
9. [Cross-page flows](#9-cross-page-flows)
10. [How to build a new page](#10-how-to-build-a-new-page)
11. [Implementation notes](#11-implementation-notes)

---

## 1. Building blocks at a glance

```
AppShell (header · content · footer)            ← one per app, §2
 └─ PageTemplate: List | Detail | Flow | Summary  ← one per page, §3
     └─ Regions (fixed order): title · summary line · toolbar · content · side column · page actions
         └─ Shared components (§5) filled with data (modules.md)
 Overlays on top of any page: Dialog · Sheet/side panel · Bell panel + preview  ← §4
```

Every page = **shell + one template + shared components + the five states**. A page never invents its own layout, colour, size or component.

---

## 2. The shell

### 2.1 `AppShell` (signed-in and guest)
- **Header** (height `size.header-height`, `surface`, bottom `border`), content centred in `size.content-max-width` with `space.6` side padding:
  - Logo (links to Home).
  - Main navigation, fixed order: **Ana Sayfa · Takip · Ara ve Ekle · Keşfet · Kazancım** (icon + text) [DECIDED 2026-11-12]. Current section: `primary` text, weight 600, 2 px indicator bar, `aria-current="page"`.
  - Right end: **notification bell** (counter: coral only when an unread deal exists, otherwise neutral ink) and the **profile avatar menu**.
  - Profile menu entries: **Profilim** · **Paketim** · **Ayarlar** (Bildirimler, Güvenlik, Arama geçmişi, Dil, Tema, Gizlilik, Hesap) · **Çıkış**. When a page inside the menu is open, the avatar button carries `aria-current="page"` and a 2 px `primary` border.
  - Guest (Landing Page, product pages, legal, help): navigation becomes **Nasıl çalışır · Örnek fırsatlar · Haklarını bil · Yardım**; right end **Giriş yap** (text) + **Ücretsiz başla** (primary). Inside the app a guest sees the normal navigation with "Giriş yap" in place of bell and avatar.
- **Footer** (`surface`, top `border`): KVKK aydınlatma metni · Kullanım koşulları · Çerez politikası · Komisyon açıklaması · Yardım ve SSS · language switch (Türkçe · English).
- Below `breakpoint.md`: bottom tab bar (`size.bottom-nav-height`) with the four sections + Profil; side panels become bottom sheets.

### 2.2 `AuthShell` (Sign-in, Sign-up, password reset, email verification)
- Header with **logo + language switch only**; no main navigation, no bell, no profile.
- Minimal footer (KVKK, Koşullar, Çerezler, Yardım).

### 2.3 `AdminShell` (Application Manager pages)
- Header on `hero-surface` (ink) with logo + **"Yönetim"** badge (`hero-savings`), admin menu (Genel bakış · Kullanıcılar · Ürünler · Kaynaklar · Suistimal · Sistem), **"Kullanıcı görünümüne geç"**, bell (neutral counter) and avatar. Same content width, templates and components as the user app.
- **Sub-navigation [RECOMMENDED 2026-11-13]:** a 48 px `surface` row under the header with the current section's modules (active: `primary`, 2 px underline). Mapping: Genel bakış → Admin Overview · Kullanıcılar → Users, Roles and Permissions, Support Requests, Package Settings and Requests · Ürünler → Catalogue and Products, Category Templates, Reports and Match Corrections, Campaign Calendar · Kaynaklar → Platforms and Source Health, Return Rules, Provider Usage and Cost · Suistimal → Fraud Monitoring · Sistem → System Settings, Notification Templates, Legal and Content, Audit Log, History Explorer.
- Footer line: "Yönetim ekranlarında yapılan her görüntüleme ve işlem Denetim Kaydı’na yazılır."

---

## 3. Page templates

All templates use the content width `size.content-max-width`, vertical padding `space.8`, horizontal `space.6`, and gap `space.5`–`space.6` between regions. Regions appear in this order; optional ones are skipped, never reordered.

| Region | What goes there |
|---|---|
| **Title** | h1 (`font.h1`) + optional badge (e.g. plan) + one muted caption line (freshness, counts, reset times) |
| **Page actions** | right-aligned on the title row; at most one primary + one secondary |
| **Summary** | stat tiles (equal columns, aligned) or a hero block |
| **Toolbar** | search field · category filter · type/state filters with counts · sort · period |
| **Content** | the list / detail sections / flow steps |
| **Side column** | 320–360 px; secondary context (allowance, explanations, suggestions) |

### 3.1 List template
Used by **Tracked Items**, **Notifications**, and every future list (admin lists included).
- Title + actions → summary tiles (optional) → **toolbar (search + category + filters + sort)** → list → footnote.
- List rows are **grids with fixed column widths** shared by the header row and every data row (alignment rule). First data column is always the **product image**.
- Optional right side column (Notifications: "Senin için").
- Ended/inactive items: dimmed at the bottom under a divider label.

### 3.2 Detail template
Used by **Product Detail**.
- Two-column top: main (product image, name, deal hero, price history) | aside (action steps, price-difference message).
- Then full-width sections: offers grid (max 2 columns; a lone last item spans), stock history (14 days + 1 month, same box size), history and help.

### 3.3 Flow template
Used by **Search and Add**, **Sign-in**; the same structure runs inside the **Dialog** for "Ürün ekle" / "Takip et".
- Left: the step content (input → candidates → choice). Right: the confirm/summary panel with the single primary action at its bottom.
- Step indicator (§5.24 design) when there is more than one step.
- Typed values survive going back and sign-in hand-offs.

### 3.4 Summary template
Used by **Home**, **My Savings**, **Packages and Premium**.
- Title → one hero block (`hero-surface`, max one per page) or stat tiles → aligned sections → lists (which follow the List rules: image, search, category).
- Optional right column with one "what you can do now" card and one "how it works" card.

### 3.5 Settings template
Used by **Settings and Account** (both roles) and admin settings screens.
- Title → two columns: section menu (260 px, icon + label, current = `primary-subtle`, `aria-current`) | section content (section title + one-line description + "Kaydedildi" status, then cards/tables).
- Each section has its own URL (`/ayarlar/{section}`); sections shown depend on the role's permissions.
- Switches save instantly; forms save with their own "Kaydet"; sensitive actions ask for re-authentication in a Dialog.

---

## 4. Overlays

| Overlay | Pattern | Size | Used for |
|---|---|---|---|
| **Dialog** | design §5.28 | `size.modal-width` (1120), optional right panel `size.modal-aside-width` (360) | Ürün ekle (Tracked Items) · Takip et step 2 (Notifications, recent searches) · Premium/jeton isteği (Packages) |
| **Sheet / side panel** | design §5.25 | `size.side-panel-width` (440), full height under the header | Bell panel · Kaydı düzelt (My Savings) · confirm panel on phones |
| **Bell preview** | design §5.29 | 560 px card to the **left** of the bell panel | Preview of the clicked notification |

Rules: dimmed page (`color.overlay`), page state kept, focus moved in and trapped, Escape and the round 40 px bordered × close it, focus returns to the opener. Below `breakpoint.md` every overlay is a bottom sheet.

---

## 5. Shared components

| Component | Design ref | Where used |
|---|---|---|
| `AppShell`, `AdminShell`, `AuthShell` | §5.21, this §2 | every page |
| `PageTemplate` (List/Detail/Flow/Summary) | §5.22 | every page |
| `ProductImage` (image slot with category-illustration fallback) | §5.30 | every product mention |
| `ProductRow` (image · name/line · data columns · action) | §3 alignment, §5.30 | Tracked Items, Home, My Savings, Packages, Notifications |
| `StatTile` | §3 | Tracked Items, My Savings, Packages |
| `HeroBlock` (`hero-surface`) | §2 | Home (deal), My Savings, Sign-in |
| `Flag` / `ModeBadge` ("Aldım" · "Almak istiyorum" · "Takipte değil") | §5.29 | rows, previews, dialogs |
| `PriceSparkline` (paid solid · cheapest dashed · target dotted) | §5.x charts | Tracked Items, Home, bell preview |
| `StockStrip` (14 boxes; in / low / out by fill + colour) | §5 stock | Tracked Items, Product Detail |
| `HiddenOfferCard` + "Göster" gate | Hidden Seller | Product Detail, Home, teaser |
| `FactTile` (good/bad) | §5.26 | confirm panel |
| `AttributeChip` / inline value buttons | §5.27 | Search and Add, Add product dialog |
| `SearchField`, `CategoryFilter`, `FilterChips` (with counts), `SortSelect`, `PeriodSelect` | §5.30 | every list toolbar |
| `AllowanceMeter` (label · big value · progress · reset caption) | §5.10 | Packages, Notifications (daily cap), Tracked Items (bulk check) |
| `NotificationItem` + `NotificationPreview` | §5.29 | Notifications page, bell panel |
| `Dialog`, `Sheet` | §5.28, §5.25 | overlays |
| `StepIndicator` | §5.24 | Flow template, dialogs |
| `SkeletonBlock` | §5.23 | loading state of every page |
| `StatusBanner` (info / warning / danger) | §6 | stale, limit, error states |

---

## 6. Global page rules (apply to every page)

1. **Tokens only.** Colours, sizes, radii, shadows, type come from `design-tokens.json`; new values are proposed first and added to the token file after approval.
2. **Coral once per surface, only for a deal.** If a flag and an action both qualify, the action is coral and the flag neutral. Header and an open overlay count as separate surfaces; a read deal no longer makes the bell coral.
3. **Hidden seller.** A cheaper seller's name, rating, platform and link never appear before "Göster" — not in lists, previews, notifications, history or spending views; refer by rank ("en ucuz satıcı", "2. ucuz satıcı"). The user's own seller is always shown.
4. **Product image everywhere** a product is mentioned; category illustration if missing (design §5.30).
5. **Every list is searchable; every product list has a category filter** (chips with counts, or a select with counts). Empty result → "Bu aramayla eşleşen … yok" + "Filtreyi temizle".
6. **Alignment.** Side-by-side blocks of the same kind align row by row; list rows share column widths with their header (design §3).
7. **Freshness.** Every price and stock value shows when it was checked; durations say "en az"; estimates say "tahmini".
8. **One primary action per block**; labels are verb + object; targets ≥ 44 px.
9. **Five states drawn** for every page (§7), light and dark, long Turkish and English strings.
10. **Turkish text search** folds case with the Turkish locale and treats ı/i as equal (`"Insta360"` must match `insta`).
11. **Settings live in Profile › Ayarlar.** Pages link to them ("Bildirim ayarları"); they are not edited in place.
12. **Small strips exempt.** Recommendation strips of 6 items or fewer need no search or category filter (design §5.32); they still show images.
13. **Motion.** No decorative looping motion, except the Landing Page deal showcase (design §5.31, §9); reduced-motion always respected.

---

## 7. The five states

| State | Look | Position |
|---|---|---|
| Loading | `SkeletonBlock` in the exact shape and size of the real content; no full-screen spinner | in place |
| Empty | short title + one sentence + one primary action; explains what will appear | in place of the list/content |
| Error | `StatusBanner` danger or inline alert; says what still works; "Tekrar dene" | top of the affected region |
| Stale | `StatusBanner` warning with the age ("en az 6 saat önceki"); old values remain visible with their age | above the affected region |
| Success | the normal page | — |

Page-specific extra states (limit reached, pending request, dimmed ended items, empty filter) use the same components.

---

## 8. Page specifications

Each page lists: route · shell · template · regions top-to-bottom · overlays · states · API. Detailed behaviour is in `modules.md`.

### 8.1 Home — `/[locale]` (signed in)
- **Shell/template:** AppShell · Summary.
- **Regions:** greeting + summary line (tracked count, amount protected, last check) → **search box** with inline 3-tile results area that pushes content down → **Hemen Gözat** (product image 120, flags, name, purchase line; two aligned columns: price history | up to 3 hidden offers; coral "Fırsatı gör") → return reminder strip → **Diğer takip ettiklerin** rows (image 56 · flag · name/line · state · Detay) → "Tümü" to Tracked Items.
- **States:** new user (3 steps) · no deal (Hemen Gözat = nearest return, no coral) · stale (checking) · error · loading.
- **API:** `GET /home`, `GET /search/autocomplete`.

### 8.2 Search and Add — `/[locale]/ara`
- **Shell/template:** AppShell · Flow.
- **Regions:** search box (text · link · photo) → autocomplete (3 image tiles + scrollable list + preview) → "Nasıl anladık" chips → "Hangisi seninki?" candidates (image 72, product/variant only, no price/store) → right **confirm panel** (platform, typed seller with exact match, price paid typed, order date/status, return day, fact tiles, teaser after price) → "Evet, bunu aldım" / "Almadım, sadece takip et".
- **States:** loading · empty (three ways to add) · error (keeps input) · stale · success ("Takibe eklendi" with image).
- **API:** `/search/autocomplete`, `/identify`, `/products/:id/confirm-context`, `/products/:id/seller-lookup`, `/products/:id/teaser`, `POST /tracked-items`.

### 8.3 Product Detail — `/[locale]/takip/[id]`
- **Shell/template:** AppShell · Detail.
- **Regions:** product image 96 + name + purchase line → deal hero + price history | action steps + price-difference message → hidden offers grid (≤ 2 columns) → stock history 14 days + 1 month → help.
- **Added 2026-11-12 (to be drawn when Product Detail is revised):** product rating line under the name ("4 mağazada 3.850 değerlendirme · ortalama 4,5 ★", seller-less) · seller trust tile on each hidden offer (Güvenilir satıcı ✓ / Dikkat ✗ + reason; breakdown and store rating after Göster) · request tracking in the action steps ("Fiyat farkı istedim" → "Yanıt bekleniyor", outcome) · price history ranges up to 2 years / Tümü with the lowest marked by rank · campaign note and **installment note** ("Peşin fiyatına en çok 6 taksit"; table after Göster) on each offer, compact one-line summary on the card [RECOMMENDED].
- **Overlays:** "Göster" gate; allowance-used-up card (Packages state 1).
- **States:** loading · no cheaper seller · error · stale (per-offer age) · success after "Şimdi kontrol et".
- **API:** `/tracked-items/:id`, `/offers`, `/price-history`, `/stock-history`, `/offers/:ref/reveal`.

### 8.4 Tracked Items — `/[locale]/takip`
- **Shell/template:** AppShell · List.
- **Regions:** title "Takip ettiklerim" + "Takipte N/limit" + "Ürün ekle" → 4 stat tiles → **search + Kategori** → filters (Tümü · Aldım · Almak istiyorum · Fırsat var · Biten, with counts) + sort + "Görünenleri kontrol et (N)" with remaining allowance → rows (image 72 · flags/name/line · 14-day sparkline · 14-day stock · state + check time · Detay) → "Biten takipler" dimmed.
- **Overlays:** **Ürün ekle dialog** (search · link paste · photo · suggestions · 3 image tiles · right panel with selected product and attribute value buttons · "Devam et" → step 2 Aldım / Almak istiyorum).
- **States:** empty · empty filter · bulk check (allowance short, progress) · stale row · error · loading.
- **API:** `GET /tracked-items?filter=&sort=&q=&category=`, `/summary`, `/check-now-bulk`.

### 8.5 Notifications — `/[locale]/bildirimler` + bell panel
- **Shell/template:** AppShell · List with right column.
- **Regions:** title + unread count + "Tümünü okundu yap" + "Bildirim ayarları" link → **search + Kategori** → filters (Tümü · Fırsat · İade · Aramalarım · Diğer) + "Yalnızca okunmamışlar" → groups (Bugün / Dün / Bu hafta) of `NotificationItem` (dot · image 80 + type badge · type/time · title · message · ModeBadge + check time · action) → right column "Senin için" (latest drops in tracked list · recent searches with drop + "Takip et" · frequent searches).
- **Overlays:** bell panel (side panel, last 10) + **preview to its left** (image, mode, message, three fact tiles, 14-day chart, check time, actions) · **Takip et dialog step 2** (Aldım: platform, typed seller, price, date, status, teaser · Almak istiyorum: target + suggestion chips, duration).
- **States:** empty · empty filter · digest on / daily cap reached · live connection lost · error · loading.
- **API:** `GET /notifications?type=&q=&category=`, read/read-all, `/me/notification-preferences` (edited in Settings), `/me/stream`.

### 8.6 My Savings — `/[locale]/kazancim`
- **Shell/template:** AppShell · Summary.
- **Regions:** title + period (Bu ay · Bu yıl · Tümü) → hero (total, month/year/average, monthly bar chart; `hero-line`) → "Nasıl kazandın?" 3 method tiles → records (search + category chips; image 56 · name · method · date · first paid · re-paid · saving · Düzelt + days left / Kesinleşti) → missed deals (not in total) | right column "Şu an kazanabileceğin" + "Nasıl hesaplıyoruz?".
- **Overlays:** **Kaydı düzelt** side panel (method incl. "Fırsatı kullanmadım", re-paid / difference, locked first price, live result).
- **States:** empty (how saving happens + open deals) · only missed deals · final record (support request) · stale · error · loading.
- **API:** `GET /savings?period=&q=&category=`, `PATCH /savings/:id`.

### 8.7 Packages and Premium — `/[locale]/paketim` (profile menu)
- **Shell/template:** AppShell (avatar active) · Summary.
- **Regions:** title + plan badge + "Jeton iste" / "Premium iste" → 4 `AllowanceMeter`s (Göster · Takip · Günlük kontrol · Jeton) → Free vs Premium table (aligned rows, Premium column outlined, "Fiyat henüz belli değil") → reveal order (4 steps, current highlighted) → **"Nereye harcadın?"** (period · search · category · totals; tab "Ürün bazında": image, reveals, monthly, tokens, refunded, last use, expandable events with date-time, seller rank, price at that moment, source · tab "Tüm hareketler": filter by type).
- **Overlays:** **request dialog** (Premium / N tokens, note, summary panel, sent state).
- **States:** Göster allowance used up (on Product Detail) · tracking limit full · request pending · request rejected (admin note) · Premium active (end date) · error · loading.
- **API:** `/me/entitlements`, `/plans`, `/me/reveals?period=&q=&category=&group=product`, `/me/token-ledger`, `/package-requests`.

### 8.8 Sign-in and Sign-up — `/[locale]/giris`
- **Shell/template:** AuthShell · Flow.
- **Regions:** left hero (value proposition, example deal notification with image, 3 steps) | right: guest hand-back card ("Seçtiğin ürün seni bekliyor" with image) → tabs Giriş yap / Kayıt ol → Google, Apple → divider → email, password (show/hide), "Şifremi unuttum" → sign-up: live password rules, terms checkbox (unticked), KVKK link → primary → reset and verify screens.
- **States:** wrong credentials (no field disclosed) · too many attempts (countdown) · email not verified · email linked to Google/Apple only · account pending deletion (restore) · suspended (support) · error · signing in.
- **API:** `/auth/*`, `POST /me/restore`.

### 8.9 Settings and Account — `/[locale]/ayarlar/{section}` (both roles)
- **Shell/template:** AppShell (avatar active) or AdminShell · Settings.
- **User sections:** Profil · E-posta ve şifre · Bildirimler (delivery, time slots, daily cap, type × channel switches) · Güvenlik ve cihazlar · Arama geçmişi (search + category, product images, hide) · Dil ve görünüm · Gizlilik ve çerezler · Verilerim ve hesap.
- **Application Manager sections:** the above without Arama geçmişi, plus two-step verification in E-posta ve şifre, "Yönetim bildirimleri" group, **Yetkilerim** and **Yönetim etkinliğim** (search + type filter, product images); account deletion closed until the role is handed over.
- **Overlays:** re-authenticate dialog · delete-account dialog · e-mail change.
- **States:** re-authenticate · delete confirmation · e-mail change pending · export ready · not saved · stale · error · loading.
- **API:** `/me`, `/me/reauth`, `/me/pii`, `/me/email`, `/me/notification-preferences`, `/me/sessions`, `/me/search-history`, `/me/export`, `DELETE /me`, `/me/2fa/*`, `/me/admin-activity`.

### 8.10 Landing Page — `/[locale]` (signed out) and product page — `/[locale]/urun/[slug]`
- **Shell/template:** AppShell (guest header §2.1) · Summary; product page uses the Detail template.
- **Landing regions:** hero on `hero-surface` (h1 `display`, search box text/link, "kayıt olmadan arayabilirsin · üye olunca 3 hediye jeton", two stacked example notification cards — the hero's "Fırsat geldi" is the page's single coral) → 3 figure tiles (`[X] TL kazanç` · `[Y] üründe` · `[Z] mağaza`, real data) → Nasıl çalışır (3 steps) → **Deal showcase** "Bu hafta bulunan fırsatlardan" (design §5.31: stars, weekly total, category chips, 3 cards with % pill and saving strip, closing action) → Haklarını bil (3 cards to Help) → CTA band → footer with commission disclosure.
- **Product page regions:** breadcrumb → image 400 + 4 thumbnails | brand · category, h1, key attributes, package chips, price box ("Şu an N satıcıda, en düşük X TL", check time, highest, 90-day hint; seller rows by **rank only** with price, stock and "Göster" → sign-in for guests; "Bu ürünü takip et" primary, "Bunu aldım, ucuzlarsa haber ver" secondary) → price history of the daily lowest price, 30 d / 90 d / 1 y, seller-less, 4 stats → Benzer ürünler (4, images) → Sık sorulanlar (FAQ, also emitted as structured data).
- **States:** figures below threshold (all three tiles switch to value statements; showcase hidden under 3 examples) · guest search with no result (paste link / sign up and add) · low data (`noindex`, "fiyat geçmişi henüz oluşmadı", min 2 sellers + 14 days [ASSUMPTION]) · product not found (no seller for 30 days → similar products) · error + stale (banner, last values dimmed with age; stale after 1 h [ASSUMPTION]) · loading (skeleton only on client transitions; the page is server-rendered).
- **API:** `GET /public/stats`, `GET /public/deals?category=`, `GET /public/products/:slug`, `GET /search/autocomplete` (guest).

### 8.11 Help and FAQ — `/[locale]/yardim`, `/yardim/[slug]`, `/yardim/iletisim` · Legal Pages — `/kvkk`, `/kosullar`, `/cerezler`, `/komisyon`
- **Shell/template:** AppShell (guest header for visitors) · Help home = Summary; article = Detail; Bize yaz + Taleplerim = Flow (form) | List; legal = Detail with a document menu.
- **Help home regions:** `primary-subtle` band (h1 `display`, search 720 px, frequent-search shortcuts) → main | aside 360: **Mağaza iade rehberleri** (store search, 8 logo tiles, selected store's rule card — design §5.33) → **Tüm yazılar** (topic chips with counts, rows: icon · title · topic · reading time · updated) | Bize yaz card + Taleplerim, Sık sorulanlar, legal links.
- **Article regions:** breadcrumb → "Bu sayfada" (220) | article (title, updated, **Süre ve kurallar** box from the rule table with read time or "Varsayılan", numbered steps, cancel, price difference with info note, "İşine yaradı mı?") | aside 300 (sign-up prompt, other store guides with logo tiles, related).
- **Bize yaz + Taleplerim:** form (topic radio cards, related product with image, message 10–2000, up to 3 screenshots, reply-to email note; guests enter an email) | Taleplerim (search, status chips with counts, rows with product image or topic icon, status pill).
- **Legal:** document menu (260) | title, version + effective date + "Türkçe metin bağlayıcıdır", lead, "Bu sürümde ne değişti?", contents, numbered sections, action box.
- **Overlays:** cookie bar (equal-weight choices) · cookie preferences dialog · re-consent dialog · contextual help side panel (400 px, "Yardım merkezinde aç").
- **States:** store page unreadable (last value + age) / default rule · article not found · request sent (number) · send failed (text kept) · request thread · Taleplerim empty · previous versions · loading.
- **API:** `GET /help/search`, `GET /help/stores`, `GET /content/:slug`, `POST /content/:slug/feedback`, `POST /support-requests`, `GET /support-requests/mine`, `POST /content/consents`.

### 8.12 Discover — `/[locale]/kesfet` · Profile — `/[locale]/u/[username]` · Profilim — `/[locale]/profil`
- **Shell/template:** AppShell (Keşfet active; Profilim → avatar active) · Discover = List with aside 360; profiles = Summary header + List.
- **Discover regions:** title + one-line privacy promise → tabs **En çok takip edilen · Fırsat yakalananlar · Takip ettiklerinden · Paylaşılan fırsatlar** → search (placeholder per tab) + category chips with counts → tab content (popular rows: rank · image 72 · name/category · trackers + 7-day change · lowest price + age · "Takip et"; deal cards: image 96 · "Son 7 günde N kişi fırsat yakaladı" · average saving · rank-only cheapest + Göster; feed: avatar · @user · verb · product image 56 · detail per the person's sharing; shared: image · @user · "Doğrulandı" · price + saving · Göster) | aside: "Link paylaş" (reward count) · "Senin paylaşımın" summary → Ayarlar › Gizlilik · people to follow (≤ 3, strip).
- **Profile (other):** header card (avatar 96, @username, Fırsat Avcısı badge, privacy pill, counts, member since; "Takip et / Takip ediliyor / İstek gönderildi"; "Şikayet et · Engelle") → 3 tiles (savings if shared · deals caught · items in common) → tabs Takip ettikleri · Yakaladığı fırsatlar · Paylaştığı fırsatlar → search + category → rows with images.
- **Profilim:** same header with "Profili düzenle" (→ Ayarlar › Profil) and "Profil bağlantısını kopyala" → tabs Takipçilerim (follow requests: Onayla / Reddet) · Takip ettiklerim · Paylaştığım fırsatlar (status: Doğrulandı +1 jeton · İnceleniyor · Reddedildi + reason) → aside "Neyi kim görüyor?" and "Başkaları nasıl görüyor?" preview (Ben / Bir takipçi).
- **Overlays:** first-visit sharing consent (nothing pre-ticked; paid price is a separate consent; audience select) · Link paylaş dialog · verified result · rejected result with reason.
- **States:** feed empty · private profile · request sent · user not found/blocked · below the anonymity threshold · share under review · error · loading.
- **No coral** on these surfaces: other people's deals are not the user's deal.
- **API:** `GET /discover?tab=&q=&category=`, `GET /users/:username`, `POST|DELETE /follows/:userId`, `POST /follows/:userId/approve|decline`, `POST /blocks/:userId`, `POST /link-submissions`, `GET /me/link-submissions`, `PUT /me/community-consents`.

### 8.13 Application Manager screens — `/[locale]/admin/…` (18 modules)
- **Shell/template:** AdminShell + sub-navigation · List with detail panel (Admin Overview: Summary; Roles and Permissions: matrix).
- **Admin list regions [RECOMMENDED 2026-11-13]:** title + description + page actions → summary tiles → optional tabs → toolbar (search with a placeholder naming what is searched + counted filter chips + result count) → fixed-column table (image, logo or avatar first where the row is a product, platform or person; status pills) | **detail panel 380 px** (title, badges, key–value rows, blocks such as history or thread, note, actions). Row click selects; each action opens a preview + confirmation (reason required where the module says so); danger actions use a `danger` outline; every view and action is audited.
- **States per group:** loading skeleton · confirm dialogs (critical change with preview, danger action) · empty queue · range/validation error · no permission (attempt audited).
- **Canvases:** 12a Admin Overview, Return Rules, Platforms · 12b Users, Roles and Permissions, Audit Log · 12c Catalogue, Category Templates, Reports · 12d Packages, Support, Legal and Content, Notification Templates · 12e System Settings, Provider Usage, Campaign Calendar, History Explorer, Fraud Monitoring (links in `screen_status.md`).
- **API:** the `/admin/*` endpoints in `architecture.md`.

---

## 9. Cross-page flows

```
Guest search (Home / Search and Add) ──mark──► Confirm ──sign-in needed──► Sign-in ──► back to Confirm (values kept)
Home "Fırsatı gör" ──► Product Detail ──"Göster"──► allowance (Packages order) ──► seller revealed ──► store
Tracked Items "Ürün ekle" ──► Dialog step 1 (find) ──► step 2 (Aldım / Almak istiyorum) ──► Tracked Items
Notification / recent search "Takip et" ──► Dialog step 2 ──► Tracked Items
Bell ──► panel ──click──► preview ──► Product Detail / Takip et / İade adımları
Product Detail "Takibi bitir" ──► method + re-paid price ──► My Savings record (editable 7 days)
Allowance used up ──► Packages request dialog ──► admin ──► notification + email
Profile menu ──► Paketim · Ayarlar (Bildirimler, Güvenlik, Arama geçmişi …)
Landing search ──► Search and Add (guest) ──confirm──► Sign-in ──► back to Confirm
Landing "Ücretsiz başla" / showcase action ──► Sign-up ──► Home (new user)
Product page "Bu ürünü takip et" / "Bunu aldım…" ──► Sign-in ──► Add product dialog step 2 (Almak istiyorum / Aldım)
Product page "Göster" (guest) ──► Sign-in ──► Product page with allowance prompt
Footer / "Haklarını bil" / "?" ──► Help (store picker ──► guide) · contextual panel ──► "Yardım merkezinde aç"
Help "Bize yaz" ──► request number ──► Taleplerim ──► reply notification + email
Keşfet "Takip et" (product) ──► Add product dialog step 2 · "Göster" ──► reveal gate
Keşfet first visit ──► sharing consent dialog ──► Ayarlar › Gizlilik holds the values
"Link paylaş" ──► verification ──► verified (+1 token, hidden-seller offer) │ rejected (reason)
Sign-in with pending re-consent ──► Re-consent dialog ──► accept │ "Şimdilik değil" ──► limited mode
```

Every arrow keeps the user's typed values and returns to the place they came from. Back in the browser restores the previous page state.

---

## 10. How to build a new page

0. **Start from `screen_status.md`:** take the next screen from its "Order from here" table and check its platform (web desktop, web phone width, mobile app, or one platform only).
1. **Read the module** in `modules.md`: purpose, data, rules, API, states.
2. **Choose the shell** (AppShell, AdminShell or AuthShell) and **one template** (List, Detail, Flow, Summary, Settings). If none fits, propose a template change to the design owner first; do not build a one-off.
3. **Lay out the regions** in template order. Put lists in fixed-width grids shared with their header row.
4. **Fill with shared components** (§5). A new component is proposed with its tokens, states and accessibility, added to `product_design_pattern.md`, then used.
5. **Apply the global page rules** (§6): image on every product, search + category on lists, coral check, hidden-seller check, freshness labels, one primary per block.
6. **Draw the five states** (§7) plus page-specific states, in light and dark, with long Turkish and English strings.
7. **Define overlays** using Dialog / Sheet only.
8. **Wire the flows** (§9): where the user comes from, where each action goes, what is kept.
9. **Update the documents in the same change:** `screen_status.md` (status, canvas link, platform, order — every time), `modules.md` (screen + API), `product_spect.md` (if scope changes), `architecture.md` (endpoints), `database.md` (fields), `design-tokens.json` + `product_design_pattern.md` (new values/patterns), `engineering_checklist.md` (new checks), and this file (page spec + flows).
10. **Review** with the design checklist (`product_design_pattern.md` §8) and `engineering_checklist.md`.

---

## 11. Implementation notes

- **Next.js** route per page under `/[locale]/…`; the shell is the root layout; templates are layout components with named slots for the regions; overlays use Radix Dialog/Sheet primitives styled by tokens.
- **Tailwind** theme generated from `design-tokens.json`; no literal colours or sizes in components.
- **Data:** TanStack Query; known data renders at once, fresh data arrives in the background; live updates over SSE (`/me/stream`).
- **Search fields:** debounced (≈250 ms), server-side for paginated lists, Turkish case folding (§6 rule 10); the query is kept in the URL so back/forward restores it.
- **Images:** catalogue images from `/img/:sha256/:variant` (CDN) with `alt` = product name; fallback illustration per category from the design kit.
- **Accessibility:** real buttons/links/inputs, `aria-current` on the active section, `aria-live` for live result areas, `role="alert"` for errors, focus trap in overlays, reduced-motion respected.
