# FırsatGeldi — Session Log

Shared memory across sessions (Claude Code and claude.ai). Newest entry first. Each entry ≤ 10 lines. Decisions are recorded in the relevant doc in `docs/`; this log only points to them.

---

## 2026-11-14 (late) · Claude Code
- **Done:** plan step 8 — app shell (#50): `AppShell`, `AuthShell`, `AdminShell` (header only), five page templates, overlays, base primitives with Lucide; main navigation routes render empty templates; development-only preview `/tr/dev/shell`; z-index and component values as CSS variables; 328 tests, axe clean in tr/en, light/dark, 390/900/1280.
- **Decided (user), written in docs:** shell preview page is development-only (#48, `implementation_plan.md` step 8); width tokens `size.side-column-width`, `size.section-menu-width` (#49, `design-tokens.json` 1.8.0); where canvas 0 and the docs differ, the docs win (5-item top bar with Keşfet, stale state as a warning `StatusBanner`).
- **Open:** canvas "0 İskelet ve Bileşenler" to be updated to the docs (5-item top bar, amber stale banner) — claude.ai, with the next design fix · Settings section names (profile menu "Ayarlar" opens `/ayarlar/bildirimler` until the Settings screen) · logo tile and bell counter still use the nearest token (canvas 28 px / 18 px).
- **Next:** plan step 9 — mock API and fixtures (`feat/mock-api`), after the user's approval.

---

## 2026-11-14 (late) · claude.ai
- **Decided (user), written in docs:** shell fixes (#51, `design-tokens.json` 1.9.0, `product_design_pattern.md` v1.7, `pagedesign.md` v1.3): step indicator circle `size.step-indicator-dot` 28 px · ghost button 44 px below `breakpoint.md` and on touch (`button.ghost.height-touch`) · new `breakpoint.lg` 1024 px, top-bar navigation icon-only from `md` to below `lg` (label as accessible name + Tooltip).
- **Open:** update canvas 0 to the docs (5-item top bar, amber stale banner) with the next design fix.

---

## 2026-11-14 · claude.ai
- **Decided (user):** mobile app track starts after the web is finished (`product_spect.md` §3 Platform, `architecture.md` §21.2, `screen_status.md`) · icon library Lucide (`product_design_pattern.md` §5.36, `design-tokens.json` 1.7.1, `architecture.md` §3).
- **Done:** remaining 16 canvases imported, one design-change PR each (#29–#44, sha256 checked); base primitives + z-index tokens (#45); temporary transfer artifact deleted (double confirmation); claude.ai project mirrors refreshed to `main`.
- **Open:** Application Manager screens review, phone-width proposals, e-mail designs (backlog).
- **Next:** Claude Code plan step 8 — app shell, new session.

---

## 2026-11-14 · Claude Code
- **Done:** plan steps 3–7 — monorepo skeleton (#20), basic CI with required check `ci` (#21), tokens + WCAG AA contrast test (#22, low-stock box checked by `stock-low-border` from #23), theme + hard-coded value lint (#24), i18n + localised routes + hard-coded text lint (#25).
- **Decided (user), written in this PR:** MSW for the mock API (`implementation_plan.md` §4); English URL segments, Accept-Language q order, money format, Europe/Istanbul, relative times from the catalogue (`architecture.md` §19, `product_spect.md` §3.2); theme step proven by automated tests, no test page (plan step 6).
- **Open:** "mobile app after the web is finished" (claude.ai log, 2026-11-13 midnight) is not in `docs/` yet — the user to confirm where it is written · TypeScript stays on 6.0.x until `typescript-eslint` supports 7.
- **Next:** plan step 8 — app shell (`feat/web-shell`); preconditions now on `main` (canvas 00 #27, base primitives + z-index tokens #45); needs the user's approval.

---

## 2026-11-13 (midnight) · claude.ai
- **Decided (user):** designs reach `design/` as canvas HTML, PNG optional; flow "tasarım güncellendi, GitHub'a gönder" → design-change PR (#26, `design/README.md`) · low-stock box gets a `stock-low-border` (#23) · mock API with MSW, i18n route table, money format (`25.997 TL` / `TL 25,997`), browser-language order, relative time from the catalogue, Europe/Istanbul default · mobile app after the web is finished — these last decisions are not yet in `docs/` (Claude Code's session-close spec PR).
- **Done:** reviewed plan steps 3–7 (#20, #21, #22, #24, #25); `ci` required on `main` (ruleset checked); spec #23, #26; design import 00 and 01 (#27).
- **Open:** 16 canvases to import (02…13, 12a–12e) · base primitives + z-index tokens (spec PR, before the app shell) · delete the temporary artifact "FırsatGeldi — tasarım aktarımı (geçici)" (user approval) · refresh claude.ai project mirrors (stale since `1e8ee2c`).
- **Next:** new claude.ai session → import the remaining canvases, then base primitives + z-index tokens; Claude Code plan step 8 (app shell) waits for those.

---

## 2026-11-13 (late night) · Claude Code
- **Decided (user):** three phases — Phase 1 setup + approved screens on mock data; Phase 2 real data; Phase 3 Application Manager, Discover and Profile connection, deploy. Screen PNGs arrive screen by screen; base primitives added to the component list by the design side before the app shell (`docs/implementation_plan.md`, `CLAUDE.md` › Phases).
- **Done:** three-phase plan with Progress tables (#16); `CLAUDE.md` three phases (#17); build-order references in `architecture.md` §25 and `modules.md` Appendix A aligned (this PR); plan step 1 marked ✅.
- **Open:** "0 İskelet ve Bileşenler" PNGs + base primitives in `pagedesign.md` §5 (design side, before the app shell) · mock API tool (MSW) and `packages/mocks` are [PROPOSAL] in the plan.
- **Next:** step 3 — monorepo skeleton (`chore/monorepo-skeleton`), after the user's approval.

---

## 2026-11-13 (night) · claude.ai
- **Decided (user):** Phase A first — screens built with real code, mock data, no database / real API / live data; backend is Phase B. `docs/implementation_plan.md` is the single plan with a Progress table; every day follows it one step at a time (`CLAUDE.md` › The plan and the daily flow, Phases).
- **Done:** claude.ai project mirrors refreshed to `main` @ `1e8ee2c`.
- **Open:** PNG exports for "0 İskelet ve Bileşenler" and "1 Ara ve Ekle" (needed before the first screen).
- **Next:** Claude Code rewrites `docs/implementation_plan.md` for Phase A with the Progress table (spec PR, no code).

---

## 2026-11-13 (evening) · claude.ai
- **Done:** core rules 1–10 (#5); Stage 0 plan (#4); decisions + contradiction fixes (#6–#11, by Claude Code); design-side fixes (this PR): canonical component list in `pagedesign.md` §5, purpose-specific image privacy note (24 h vs 30 days), Packages API names, History Explorer setting key, "no short codes in chat" in core rule 2.
- **Open:** `design/` PNG exports (before Stage 4) · Stage 2 questions: does a deal that ends because the price rose count as a missed deal? · threshold and recency window for "Aradığın ürün ucuzladı" · `implementation_plan.md` still uses old component names (Claude Code to align).
- **Next:** refresh claude.ai project mirrors → SerpApi key in local `.env` → Stage 1 data test (needs the user's explicit "başla").

---

## 2026-11-13 · claude.ai
- **Done:** repository set up as the single source; `docs/` (10 specs), `CLAUDE.md`, PR template imported (PR #1, `141dd66`). Project docs in claude.ai are now read-only mirrors of `main`.
- **Done:** `screen_status.md` gained "Design version" (all v1) and "Change note" columns; `build_status.md` added (owned by Claude Code).
- **Done:** labels `design-change`, `spec`, `feat`, `chore`; `main` ruleset (PR required, 0 approvals, squash only, linear history).
- **Local setup:** `/Users/satilmisbakan/Developer/myProject/Firsatgeldi` cloned; Git, Node 24, pnpm 11, gh (logged in as mrsbakanmetric); Claude Code runs locally in VS Code.
- **Open:** `design/` has no PNGs yet (user exports canvases before Stage 4) · `modules.md` Appendix A order vs the screen order in `CLAUDE.md` — awaiting the user's decision.
- **Next:** Claude Code Stage 0 — `docs/implementation_plan.md` on `spec/implementation-plan`, then stop for approval.
