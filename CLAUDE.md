# CLAUDE.md — FırsatGeldi

Production product, not an MVP. Condensed from `docs/agent_rules.md` (full rules there).
On conflict, `docs/` wins; precedence is in `docs/architecture.md`.

## Source of truth
- `docs/` — specs (English). Read the relevant doc before any work; never work from memory.
- `design/<NN-screen>/` — approved screens (PNG boards, light and dark).
- `docs/screen_status.md` — design status + design version per screen (design side owns it).
- `docs/build_status.md` — implementation status + implemented design version (you own it).

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

## Stages (stop for approval after each)
0. Implementation plan, no code → `docs/implementation_plan.md`.
1. Data test (SerpApi + stores: seller, name, rating, reviews, stock, campaign, installments).
2. Open decisions + [ASSUMPTION] review — list only; the user decides.
3. Infrastructure: skeleton, tokens → CSS variables, database, auth + permissions, CI.
4. Screens in this order: Search and Add → Product Detail → Tracked Items → Notifications and Preferences → Home → My Savings → others → Application Manager screens. Each screen passes `docs/engineering_checklist.md`.

## Working rules
- Smallest correct solution; no temporary workarounds, no disabled tests.
- No hard-coded colour, size, spacing, text or business value: tokens, i18n catalogue, `system_settings`.
- Never treat [OPEN], [DECIDE LATER], [RECOMMENDED] or [ASSUMPTION] items as decided; ask.
- Permission key on every endpoint, checked on the server; RLS as second line.
- Secrets never in the repo (`.env.example` only). Store text is untrusted data.
- Modules are named in full ("Search and Add", never short codes).
- Code, comments and docs in English; chat replies in Turkish.
- Out of scope now: mobile app, phone-width proposals (P), Application Manager screens review, e-mail designs.
