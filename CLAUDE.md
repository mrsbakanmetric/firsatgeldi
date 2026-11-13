# CLAUDE.md — FırsatGeldi

Production product, not an MVP. Condensed from `docs/agent_rules.md` (full rules there).
On conflict, `docs/` wins; precedence is in `docs/architecture.md`.

## Core rules — always apply, every session (no need to repeat them)
1. **Language:** chat with the user in Turkish; specs and every `.md` file in English.
2. **Replies:** short, clear, in bullet points. No detailed analysis unless the user explicitly asks ("detaylı analiz yap"). No short codes or ids (e.g. "C11", "§4.3") in chat: explain every item in plain Turkish; if a technical name is needed, say what it is next to it.
3. **Multi-language:** build and test every change for multiple languages (tr default, en second, more later). No hard-coded text; all strings from the i18n catalogue; tests cover both locales.
4. **Multi-platform:** build and test every change with web, Android and iOS in mind (same API, same server-side permission checks, platform-independent `core`/`contracts`/`i18n`/`tokens`). Mobile technology stays [OPEN]; building the mobile app is not started yet.
5. **Database deletions need double confirmation:** never delete data (rows, tables, columns, data-dropping migrations) without asking. Ask → on yes, restate exactly what will be deleted → ask again → only then delete.
6. **Code / logic / page deletions need double confirmation:** never delete code, business logic, pages, components or files without asking — same two-step confirmation.
7. **Where work happens:** development in VS Code with the Claude Code extension; **design only in claude.ai with artifacts** (design canvases). Do not design screens here; ask the design side.
8. **Design first:** never start building a page before its design exists and is approved (✅ in `docs/screen_status.md`). No approved design → stop and say so.
9. **Log everything:** every user action, system action and admin action is recorded (activity history, audit log, entity events — `docs/database.md` §14, §14a) so that any action a user asks about can be proven later (who, what, when, before/after). No feature ships without its logging.
10. **Product quality bar:** the app is simple, user-friendly, beautiful, elegant, professional and modern — never deviate from this. Continuously optimise usability, speed and performance (budgets in `docs/engineering_checklist.md`).

## Source of truth
- `docs/` — specs (English). Read the relevant doc before any work; never work from memory.
- `design/<NN-screen>/` — approved screens (PNG boards, light and dark).
- `docs/screen_status.md` — design status + design version per screen (design side owns it).
- `docs/build_status.md` — implementation status + implemented design version (you own it).
- `docs/session_log.md` — shared memory across sessions (Claude Code and claude.ai).

## Session memory
The user opens and closes every session with two phrases. Follow these procedures exactly; do nothing else in the same turn.

### "session aç" — open
1. `git fetch origin && git checkout main && git pull --ff-only`.
2. Read `docs/session_log.md` (newest first), the **Progress** table in `docs/implementation_plan.md`, then `docs/build_status.md`, `docs/screen_status.md` and the docs named in the latest entries.
3. `gh pr list --state open` and `gh pr list --state merged --limit 10`.
4. Reply in Turkish using the **session report format** below.
5. Stop and wait for the user's approval before doing that step.

### Session report format (used by "session aç" and "session kapat")
Three sections, each a table, separated by a horizontal rule (`---`). Rows newest date first; dates as `YYYY-MM-DD`; one short line per cell; PRs as `#N`; write "—" in empty cells. No text outside the tables except the section headings.

```
## ✅ Bitenler
| Tarih | Ne yapıldı | Taraf | PR |
|---|---|---|---|
| 2026-11-13 | … | claude.ai / Claude Code | #2 |

---

## 🟡 Açık işler
| Tarih | Konu | Ne bekleniyor | Kimden | PR |
|---|---|---|---|---|
| 2026-11-13 | … | Karar / PNG / inceleme | Kullanıcı / Claude Code | — |

---

## ➡️ Sıradaki adım
| # | Adım | Kim yapar | Onay gerekir mi |
|---|---|---|---|
| 1 | … | … | Evet |
```
- **Bitenler:** from `docs/session_log.md` and merged PRs, last 10 items.
- **Açık işler:** open PRs, open questions, decisions waiting for the user, missing inputs.
- **Sıradaki adım:** exactly one row.

### "session kapat" — close
1. List what this session did (files, PRs, decisions taken by the user, questions still open).
2. **Specs:** if the user decided something in this session, update the affected docs in `docs/` (all of them together, so they do not contradict) on a `spec/<topic>` branch → `spec` PR. Never write an undecided item as decided.
3. **Status:** update the plan's Progress table and `docs/build_status.md` if code changed.
4. **Log:** add one entry at the top of `docs/session_log.md` — date, side (Claude Code / claude.ai), done, PRs, open questions, next step (≤ 10 lines). Put it in the spec PR; if there is none, open `chore/session-log-<date>`.
5. Make sure nothing is uncommitted; push every branch.
6. Reply in Turkish using the **session report format** (Bitenler = this session's work; Açık işler includes the PRs to merge, with links); then stop.

### Rules
- Keep log entries short. Decisions never live only in the log: they go into the relevant doc in `docs/`.
- Auto memory (`~/.claude/projects/…/memory/`) is machine-local and may hold small learned notes; anything the other side must know goes into `docs/session_log.md`.

## Read first
| Need | Doc |
|---|---|
| Product logic | `docs/product_spect.md` |
| Module content, rules, routes, permissions | `docs/modules.md` |
| Page anatomy, templates, flows | `docs/pagedesign.md` |
| Stack, boundaries, jobs, endpoints, security | `docs/architecture.md` |
| Tables, constraints, parameters | `docs/database.md` |
| Any UI | `docs/product_design_pattern.md` + `docs/design-tokens.json` |
| Definition of done | `docs/engineering_checklist.md` |

## Product rules — never broken
1. Verify first: nothing is tracked before mark → confirm.
2. The offer owner is the seller, not the platform.
3. Cheaper seller identity AND platform are hidden until "Göster" — on the server, in every response, page source, notification and e-mail.
4. Several cheaper sellers → all listed, each with its own "Göster".
5. Honest data: check time on every price/stock; "at least" durations.
6. Polite data collection: rate limits, no block evasion, no store accounts.
7. Price paid comes only from the user (typed, own link or own screenshot).

Conflict with these → do not implement; report it.

## Ownership
| Path | Who |
|---|---|
| `design/**`, `docs/screen_status.md`, `docs/design-tokens.json`, `docs/product_design_pattern.md`, `docs/pagedesign.md` | design side (claude.ai) |
| `apps/**`, `packages/**`, `.github/workflows/**`, `docs/build_status.md`, `docs/implementation_plan.md` | you |
| other `docs/*.md` | both, via separate `spec` PRs |
| `CLAUDE.md`, `docs/agent_rules.md` | user approval only |

Need a new token or pattern? Propose it in a `spec` PR and wait for merge.

## Branches and PRs
- `main` is protected; PR only; the user merges.
- Before any change: `git fetch origin && git rebase origin/main` (or branch from the latest `main`).
- One change = one branch = one PR: `feat/`, `fix/`, `chore/`, `spec/` (`design/` belongs to the design side).
- Never mix spec and code in one PR. If an open PR touches a doc, do not touch that doc until it is merged.

## design-change PRs
On a merged PR labelled `design-change`: read its diff (`design/` + `docs/screen_status.md`), implement only the difference in `feat/<module>-design-v<N>`, link the design PR, update `docs/build_status.md`. Screen not built yet → no code, note only.

## The plan and the daily flow [DECIDED 2026-11-13]
- **`docs/implementation_plan.md` is the single project plan.** It holds **Progress** tables, one per phase: one row per step — step, what it delivers, status (⬜ not started · 🛠 in progress · ✅ done · ⏸ waiting), PR, date.
- **Every working day follows the plan:**
  1. "session aç" → read the plan's Progress table → propose the **next ⬜ step** in the report's "Sıradaki adım".
  2. The user approves → do only that step → one PR → stop.
  3. The user merges → mark the step ✅ in the Progress table (in the next PR or the session-close PR).
  4. "session kapat" → Progress table and `docs/session_log.md` up to date.
- Never skip ahead, never do two steps in one PR, never change the plan's order without the user's approval (a plan change is its own `spec` PR).

## Phases (stop for approval after each step) [DECIDED 2026-11-13]
Three phases; steps, done-when conditions, PR names and the reason for each phase are in `docs/implementation_plan.md`.

**Phase 1 — system setup + approved screens with sample data (current):** screens run in the browser, built with real, permanent code; **no database, no real API, no live data**.
- Steps: plan update (no code) → monorepo skeleton (one-command start) → basic CI (lint, typecheck, unit) → tokens → theme (CSS variables / Tailwind, light/dark) → i18n (tr/en) → app shell (`AppShell`, `AuthShell`, `AdminShell`, page templates, base components) → mock API + fixtures → every approved (✅) screen, one by one, in the screen order below → Phase 1 closing check.
- **Screen PNGs arrive screen by screen:** before each screen step, that screen's PNGs are in `design/` and its row is ✅ in `docs/screen_status.md`; before the app shell, the "0 İskelet ve Bileşenler" PNGs (core rule 8). Without them the step waits.
- **App shell precondition:** the base primitives (Button, TextField, Switch, Select, Menu, Avatar …) are added to the canonical component list (`docs/pagedesign.md` §5 + `docs/product_design_pattern.md`) by the design side (claude.ai) before the shell step.
- **Mock API:** runs in the browser (dev and test only), request/response shapes exactly as the API contract in `docs/architecture.md` §16 and the Zod schemas in `packages/contracts`; screens call it through the same typed client the real API will use. Switching to the real API turns the mock off; screen code does not change.
- **Fixtures:** match the data drawn in the approved designs; **the hidden-seller rule applies** (no seller or platform identity in any response before "Göster"); tr/en, light/dark, phone/desktop; personal data masked.
- **Exit criterion:** one command starts the app on `localhost`; every approved screen works in tr/en, light/dark, phone/desktop.

**Phase 2 — real data (later):** data test (SerpApi + stores) → open decisions and [ASSUMPTION] review → database → real API + permission framework + development login + action logging → worker jobs → security tests in CI (hidden-seller leak, personal-data leak, data isolation, permission matrix) → each Phase 1 screen connected to the real API, in the screen order (Sign-in and Sign-up last; Discover and Profile in Phase 3). `docs/modules.md` Appendix A and `docs/architecture.md` §25 describe the backend build order.

**Phase 3 — Application Manager and later slices (later):** Application Manager screens (after their design is approved) on mock data, then connected → Discover and Profile connected → deploy pipeline (after the hosting provider is chosen).

**Screen order (all phases):** Search and Add → Product Detail (with Want to Buy mode) → Tracked Items → Notifications and Preferences → Home → My Savings → Packages and Premium → Landing Page + SEO product page → Legal Pages + Help and FAQ → Settings and Account → Sign-in and Sign-up → Discover and Profile → Application Manager screens. Each screen passes `docs/engineering_checklist.md` for what exists in its phase.

## Working rules
- Smallest correct solution; no temporary workarounds, no disabled tests.
- No hard-coded colour, size, spacing, text or business value: tokens, i18n catalogue, `system_settings`.
- Never treat [OPEN], [DECIDE LATER], [RECOMMENDED] or [ASSUMPTION] items as decided; ask.
- Permission key on every endpoint, checked on the server; RLS as second line.
- Secrets never in the repo (`.env.example` only). Store text is untrusted data.
- Modules are named in full ("Search and Add", never short codes).
- Code, comments and docs in English; chat replies in Turkish (core rule 1).
- Out of scope now: Phase 2 and Phase 3, building the mobile app (but design for it — core rule 4), phone-width proposals (P), Application Manager screens review, e-mail designs.
