# FırsatGeldi — Screen Design Status (Web and Mobile)

**Last updated:** 2026-11-14 · **Method:** draft → comment → revision → approval → documents updated (`pagedesign.md`, `modules.md`, `product_design_pattern.md`, `design-tokens.json`, `database.md`, `architecture.md`, `engineering_checklist.md`, `product_spect.md`)

**How this file is used [DECIDED 2026-11-13]:** this is the single plan for screen work. Every screen plan starts from §5 "Order from here"; the file is updated in the same change as every new draft, approval, revision, hold, canvas link or platform decision (`agent_rules.md` › Screen Work Rules).

**Design version and change note:** every design change to an approved screen raises its **Design version** (v1 → v2 …) in §2.1 and writes a one-line **Change note**, in the same `design-change` pull request that updates `design/`. The implementation side applies only the difference and records the implemented version in `build_status.md`. All screens start at v1 (repository import, 2026-11-13).

**Where we are:** Web — all 15 user screen groups approved (Product Detail want-to-buy mode approved 2026-11-13); web screen drawing is complete apart from the backlog; Application Manager screens (12, all 18 modules) drawn on 2026-11-13 and pre-approved, review pending; the phone-width check is waiting for approval; Product Detail needs a revision. Mobile app — not started; the track starts after the web is finished [DECIDED 2026-11-14] (technology still open).

Legend: ✅ approved · 🔁 approved, revision needed · 🟡 waiting for approval · ⏸ on hold · ⬜ not started · 💡 proposal (not decided)

---

## 1. Platforms at a glance

Three surfaces, kept apart in this document:

| Surface | What it is | Width drawn |
|---|---|---|
| **Web — desktop** | The browser site on a computer | 1280 |
| **Web — phone width** | The same web site in a phone browser (responsive, not an app) | 390 |
| **Mobile app** | The installed iOS / Android app (technology [OPEN]) | 390 |

**Rule from the access matrix (`modules.md`) [DECIDED]:** every module exists on **both web and mobile**, including all Application Manager modules. So most screens are designed **twice**: web (done) and mobile app (later). The differences are in §4.

---

## 2. Web

### 2.1 Summary list

| # | Screen (Turkish name) | Desktop | Phone width | Canvas | Design version | Change note |
|---|---|---|---|---|---|---|
| 0 | App shell and component set (İskelet ve Bileşenler) | ✅ | ✅ shell rules | [0 İskelet ve Bileşenler](https://claude.ai/artifact/UviFwo1Ftk2FrYFU3aeAr4) | v1 | Initial import |
| 1 | Search and Add (Ara ve Ekle) | ✅ | ✅ in canvas 1 · 🟡 updated in check P | [1 Ara ve Ekle](https://claude.ai/artifact/HoAoJ78ugpSN9VUwg4RLiu) | v2 | Desktop input step: right "Fotoğraflar" panel removed; photo chips, limits line and privacy note under the search box; right column only for the confirm panel |
| 2 | Product Detail (Ürün Detayı) | ✅ revision approved 2026-11-13 · want-to-buy mode ✅ approved 2026-11-13 | 🟡 check P | [2 Ürün Detayı](https://claude.ai/artifact/7rCf9eKdjfCuVuPWvqsqDA) | v1 | Initial import |
| 3 | Home (Ana Sayfa) | ✅ revision approved 2026-11-13 | 🟡 check P | [3 Ana Sayfa](https://claude.ai/artifact/8ufA9dkjTMtKo1ixGGqykA) | v1 | Initial import |
| 4 | Tracked Items + Add product dialog (Takip Ettiklerim) | ✅ | rules only | [4 Takip Ettiklerim](https://claude.ai/artifact/64fCN5dCFLKUCcPHnJaZRT) | v1 | Initial import |
| 5 | Notifications + bell panel (Bildirimler) | ✅ | 🟡 bell sheet in check P | [5 Bildirimler](https://claude.ai/artifact/8TPYLuzZrGAC5AG2FkCKEM) | v1 | Initial import |
| 6 | My Savings (Kazancım) | ✅ | rules only | [6 Kazancım](https://claude.ai/artifact/W74PZmdtk6jJQvejRYKfL8) | v1 | Initial import |
| 7 | Packages and Premium (Paketim ve Premium) | ✅ | rules only | [7 Paketim ve Premium](https://claude.ai/artifact/NCWYuVBrBG1gGnNPuy8e8d) | v1 | Initial import |
| 8 | Sign-in and Sign-up (Giriş) | ✅ | rules only | [8 Giriş](https://claude.ai/artifact/GDBvXDshPKjPDGCL27cS7L) | v1 | Initial import |
| 9 | Settings and Account — user + Application Manager (Ayarlar ve Hesap) | ✅ | rules only | [9 Ayarlar ve Hesap](https://claude.ai/artifact/583co7NkFoJBVoWfno3Dzw) | v1 | Initial import |
| 10 | Landing Page + SEO product page (Tanıtım Sayfası) — **web only** | ✅ | rules only | [10 Tanıtım Sayfası](https://claude.ai/artifact/VYgzqcJ676aKA1LEj3kP88) | v1 | Initial import |
| 11 | Legal Pages + Help and FAQ (Yasal Sayfalar ve Yardım) | ✅ | rules only | [11 Yasal Sayfalar ve Yardım](https://claude.ai/artifact/DSwJqFNKt78WfeiV5wsRjV) | v1 | Initial import |
| 12 | Application Manager screens, 18 modules (Yönetim ekranları) | 🟡 drawn — pre-approved, review pending | rules only | [12a](https://claude.ai/artifact/K5qu4o4jieKCnuYQfkusWK) · [12b](https://claude.ai/artifact/CevxVkR2ejS9R89Fjugo6J) · [12c](https://claude.ai/artifact/7pWeHDAUzj6AsPFKciXYU1) · [12d](https://claude.ai/artifact/EXYR8tngQ7j96mb1sqbDce) · [12e](https://claude.ai/artifact/FGsCMwDHkyjesQWuDasxym) | v1 | Initial import |
| 13 | Discover and Profile (Keşfet ve Profil) | ✅ | rules only | [13 Keşfet ve Profil](https://claude.ai/artifact/XuHmZev2Tcesb3AK3tSQkb) | v1 | Initial import |
| P | Phone-width check: Home, Product Detail, Search and Add + sheets (Telefon Genişliği) | — | 🟡 waiting for approval | [Telefon Genişliği Kontrolü](https://claude.ai/artifact/KWLWdHbxK2RELuoiwcnULf) | — | Backlog; not in the repository |
| E | E-mail designs (E-posta tasarımları) — sent from the server, used by both | ⬜ 💡 | ⬜ | — | — | — |

"Rules only" = the phone-width layout follows the shell, template and breakpoint rules (`pagedesign.md`, `product_design_pattern.md` §5.21, §5.25); not drawn separately.

### 2.2 Web — detail per screen

**0 · App shell — ✅**
Shell (desktop/phone, light/dark, guest), page templates, shared components, five states. Main navigation now **Ana Sayfa · Takip · Ara ve Ekle · Keşfet · Kazancım**; profile menu **Profilim · Paketim · Ayarlar · Çıkış**.

**1 · Search and Add — ✅**
Input (text · link · photo), 3 image tiles, "Nasıl anladık", mark, confirm panel, phone screens, five states. The rating tile now uses the seller trust indicator (documents updated; drawing unchanged).

**v2 [DECIDED 2026-11-14]:** on desktop the input step is one full-width column. The separate "Fotoğraflar" panel on the right is removed; photos are added only from "Fotoğraf ekle" in the search box (and the "Sipariş ekranının fotoğrafını ekle" card in the empty state). Added photos appear as compact chips under the search box (thumbnail · file name · status · remove), followed by one limits line ("3 / 5 fotoğraf · … · dosya başına en çok 10 MB") and the image privacy note as a single line. The right column appears only once a product is marked (confirm panel). Phone layout unchanged.

**2 · Product Detail — ✅ revision approved 2026-11-13 (interactive)**
Approved: deal summary, price history, cheaper sellers, stock history, action steps, price-difference message, states. To add (already in the documents):
1. Product rating line: "4 mağazada 3.850 değerlendirme · ortalama 4,5 ★" (no store names before Göster).
2. Seller trust tile on each hidden offer (✓ / ✗ + reason; breakdown after Göster).
3. Request tracking in the action steps ("Fiyat farkı istedim" → "Yanıt bekleniyor" → outcome).
4. Price history up to 2 years / Tümü; lowest marked by rank.
5. Two buyer questions at the end of tracking.
6. Campaign note on offers ("Bir satıcıda kart kampanyası olabilir"; details after Göster).
7. **Installment note** on offers ("Peşin fiyatına en çok 6 taksit"; bank/card table after Göster) [DECIDED 2026-11-13].

**Want-to-buy mode — ✅ approved 2026-11-13 (interactive, boards Want / WantDark).** Same page without a purchase: "Almak istiyorum" pill; header line with target, duration and days left; hero "Hedefe X TL kaldı" (coral "Fırsat geldi" only when the target is reached); dotted target line on the chart; summary tiles Hedef / Hedefe kalan; aside: target chips (incl. "Son 30 günün en düşüğü", "Son 6 ayın en düşüğü") and duration chips (1 hafta / 1 ay / 3 ay / Süresiz), "Şimdi al mı, bekle mi?" hint (hedged), "Almaya karar verince" steps with **Aldım, kaydet** (opens the Search and Add confirm panel; price, seller, date entered by the user); sellers titled "En ucuz 3 satıcı" with differences to the cheapest. FırsatGeldi never sells: no cart, no payment; buying happens on the store's site.

Drawn with the recommended one-line summary on each offer card ("✓ Güvenilir satıcı · Peşin fiyatına en çok 6 taksit · Kart kampanyası olabilir") that expands into trust, installment, campaign and (after Göster) store-rating details.

**3 · Home — ✅ revision approved 2026-11-13** Summary line, inline 3-tile search, Hemen Gözat, return reminder, other items. Added: the one-line offer summary from Product Detail on each Hemen Gözat offer ("✓ Güvenilir · 6 taksit · Kart kampanyası olabilir"), expandable; bank and card after Göster.

**4 · Tracked Items — ✅** List with images, search + category, ended items dimmed; Add product dialog with right attribute panel.

**5 · Notifications — ✅** Page, bell panel with preview, "Takip et" → dialog step 2; preferences in Ayarlar.

**6 · My Savings — ✅** Hero, method tiles, records, missed deals, correct-record panel; buyer questions per record (documents).

**7 · Packages and Premium — ✅** Allowances, Free vs Premium, reveal order, "Nereye harcadın?", request dialog.

**8 · Sign-in and Sign-up — ✅** Four modes in one board, guest hand-back.

**9 · Settings and Account — ✅** User and Application Manager variants.

**10 · Landing Page + SEO product page — ✅ (web only)** Hero, figures, how it works, deal showcase with stars, rights, CTA; SEO product page with rank-only sellers.

**11 · Legal Pages + Help — ✅** Help home with store picker, guide article, Bize yaz + Taleplerim, legal template, cookie bar, re-consent, contextual help.

**13 · Discover and Profile — ✅** Discover (4 tabs), user profile, Profilim, sharing consent, link share.

**P · Phone-width check — 🟡**
Home, Product Detail, Search and Add, bottom sheets. Open proposals: phone header 56 px · sheet max 92 % · "İade sayfası" short label.

**12 · Application Manager screens — 🟡 drawn 2026-11-13, pre-approved by the user, review pending**
All 18 modules drawn in five canvases, light + dark, each with a States board (loading, confirm dialogs, empty, no permission). Shell: dark admin header with six sections + a **second-row sub-navigation** for the section's modules (proposal). Template: title + actions → summary tiles → search + counted filter chips → fixed-column table | 380 px detail panel → action buttons open preview + confirm; reason required; everything audited. Sample data only.

| Group | Modules | Canvas |
|---|---|---|
| 12a | Admin Overview · Return Rules · Platforms and Source Health | [12a](https://claude.ai/artifact/K5qu4o4jieKCnuYQfkusWK) |
| 12b | Users · Roles and Permissions · Audit Log | [12b](https://claude.ai/artifact/CevxVkR2ejS9R89Fjugo6J) |
| 12c | Catalogue and Products · Category Templates · Reports and Match Corrections | [12c](https://claude.ai/artifact/7pWeHDAUzj6AsPFKciXYU1) |
| 12d | Package Settings and Requests · Support Requests · Legal and Content · Notification Templates | [12d](https://claude.ai/artifact/EXYR8tngQ7j96mb1sqbDce) |
| 12e | System Settings · Provider Usage and Cost · Campaign Calendar · History Explorer · Fraud Monitoring | [12e](https://claude.ai/artifact/FGsCMwDHkyjesQWuDasxym) |

**Added 2026-11-13:** Campaign Calendar reads campaigns from store and bank pages (source filter, conditions, approve / correct / reject); card offers shown only as a note.

**Proposals and assumptions to review:**
1. Admin sections → modules: Genel bakış (Admin Overview) · Kullanıcılar (Users, Roles and Permissions, Support Requests, Package Settings and Requests) · Ürünler (Catalogue and Products, Category Templates, Reports and Match Corrections, Campaign Calendar) · Kaynaklar (Platforms and Source Health, Return Rules, Provider Usage and Cost) · Suistimal (Fraud Monitoring) · Sistem (System Settings, Notification Templates, Legal and Content, Audit Log, History Explorer).
2. Second-row sub-navigation under the admin header (new pattern).
3. List + 380 px detail panel as the admin template (new pattern); row click selects, actions open preview + confirm.
4. Roles matrix columns: view/edit × web/mobile per permission key.
5. Packages: a third tab "Elle verilenler" (manual grants, revocable).
6. History Explorer: queries need a date range; maximum 12 months per query (`history.max_range_months`) [ASSUMPTION].
7. Users: CSV export with personal data masked; e-mail search needs the full address.
8. Example values (setting ranges, campaign boosts, mass-drop threshold, fraud thresholds) are illustrative [ASSUMPTION].

**E · E-mail designs — ⬜ 💡** "Fırsat geldi", return last day, target reached, request reply, account e-mails, export ready. Texts live in Notification Templates (12d).

---

## 3. Mobile app

Status: **⬜ not started** — separate track that starts after the web is finished [DECIDED 2026-11-14]; technology [OPEN]. The web drafts are the content reference; the app is drawn from them with native patterns.

### 3.1 Screens to design (same modules as web)

| # | Screen | Mobile app status | Note |
|---|---|---|---|
| M0 | App shell: bottom tab bar, top bar, sheets, navigation | ⬜ | Decide here: the five bottom-bar items (proposal: Keşfet in, Kazancım into Profil) |
| M1 | Search and Add | ⬜ | Web phone screens are the starting point |
| M2 | Product Detail | ⬜ | Start from check P + revision (2) |
| M3 | Home | ⬜ | Start from check P |
| M4 | Tracked Items + add product | ⬜ | Dialog becomes a full-screen flow |
| M5 | Notifications | ⬜ | + push notifications |
| M6 | My Savings | ⬜ | |
| M7 | Packages and Premium | ⬜ | Payment rules of the app stores to check before Premium pricing |
| M8 | Sign-in and Sign-up | ⬜ | + Apple sign-in is required on iOS when Google sign-in is offered |
| M9 | Settings and Account | ⬜ | + app-only settings (§4.2) |
| M11 | Legal Pages + Help | ⬜ | Help opens in-app; legal texts the same |
| M12 | Application Manager screens | ⬜ | [DECIDED] admin modules work on mobile; long editors adapted |
| M13 | Discover and Profile | ⬜ | |

### 3.2 Mobile-only screens 💡 (proposals, not decided)

| Screen | Why |
|---|---|
| Welcome / onboarding (2–3 cards + sign-in) | Replaces the Landing Page inside the app |
| Push notification permission (pre-prompt + system prompt) | Asked after the first tracked item, not at launch |
| **Share to FırsatGeldi** (share sheet from a store app or browser) | The fastest way to add a product: share the listing link from Trendyol/Hepsiburada apps → confirm |
| Camera capture for the order screen | Photo of the order / receipt for identification |
| Biometric unlock (Face ID / fingerprint) | Optional, in Ayarlar › Güvenlik |
| App update required / maintenance | Store-version control |
| Offline state | Last data with its age; actions queued or disabled |
| App rating prompt | After a recorded saving, never after an error |
| Home-screen widget (later) | "Takipte 4 ürün · 1 fırsat" |

---

## 4. Web-only and mobile-only

### 4.1 Web only

| Screen / element | Reason | Status |
|---|---|---|
| Landing Page (10) | Signed-out marketing page; the app uses the welcome screens instead | ✅ |
| SEO product pages (10) | For search engines; in the app the same data appears in Product Detail for guests | ✅ |
| Deal showcase motion (stars) | Landing Page only | ✅ |
| Cookie bar + cookie preferences (11) | Browser cookies; the app uses its own consent screen (and iOS tracking permission if ever needed) | ✅ |
| Hover states, keyboard shortcuts in lists | Pointer and keyboard | ✅ in drafts |
| Admin panel at `/admin` on desktop width | The richest admin layout; mobile admin is adapted (M12) | 🟡 drawn |

### 4.2 Mobile app only 💡
Welcome/onboarding · push permission · share-to-FırsatGeldi · camera capture · biometric unlock · update required · offline · rating prompt · widget (later). App-only settings: push on/off per type, biometric lock, default share action.

### 4.3 Both (same module, platform-specific layout)
Everything else: Home, Search and Add, Product Detail, Tracked Items, Notifications, My Savings, Packages, Sign-in, Settings, Legal and Help, Discover and Profile, all admin modules.

---

## 5. Order from here

| Step | Platform | Work | Depends on |
|---|---|---|---|
| 1 | Both | Move to a GitHub repository as the single source (docs/, design/, CLAUDE.md); start Claude Code with an implementation plan | Repository created |
| 2 | Both | One pass over open decisions and [ASSUMPTION] values (about 40) | — |
| 3 | Data | Data-availability test: seller, name, rating, reviews, stock, campaign, installments for ~20 products × 5 stores | Environment with SerpApi and store access |
| 4 | Mobile | Mobile app track (technology choice first) | After the web is finished [DECIDED 2026-11-14] |

### Backlog (parked by the user on 2026-11-13, to revisit later)
- Phone-width proposals (P): header 56 px, sheet max 92 %, "İade sayfası" short label.
- Application Manager screens review (12a–12e) and its 8 proposals.
- E-mail designs (E).

## 6. Open decisions that affect screens
- More expensive sellers shown by name? (Appendix C-1)
- Deal e-mails and commercial-message consent (İYS) — legal opinion (C-2)
- Premium and token prices, payment provider; app-store payment rules on mobile (C-5)
- Search history hide vs KVKK erasure — legal (C-10)
- Phone bottom bar items — with the mobile app (C-12)
- Mobile-only screens list (§3.2) — to confirm
- Before launch: legal approval of the legal texts, logo permissions, verification of store guide content.
