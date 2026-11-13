# FırsatGeldi — Session Log

Shared memory across sessions (Claude Code and claude.ai). Newest entry first. Each entry ≤ 10 lines. Decisions are recorded in the relevant doc in `docs/`; this log only points to them.

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
