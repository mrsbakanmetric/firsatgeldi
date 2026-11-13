# CLAUDE.md — FırsatGeldi

Production product, not an MVP. Condensed from `docs/agent_rules.md` (full rules there).
On conflict, `docs/` wins; precedence is in `docs/architecture.md`.

## Core rules — always apply, every session (no need to repeat them)
1. **Language:** chat with the user in Turkish; specs and every `.md` file in English.
2. **Replies:** short, clear, in bullet points. No detailed analysis unless the user explicitly asks ("detaylı analiz yap").
3. **Multi-language:** build and test every change for multiple languages (tr default, en second, more later). No hard-coded text; all strings from the i18n catalogue; tests cover both locales.
4. **Multi-platform:** build and test every change with web, Android and iOS in mind (same API, same server-side permission checks, platform-independent `core`/`contracts`/`i18n`/`tokens`). Mobile technology stays [OPEN]; building the mobile app is not started yet.
5. **Database deletions need double confirmation:** never delete data (rows, tables, columns, data-dropping migrations) without asking. Ask → on yes, restate exactly what will be deleted → ask again → only then delete.
6. **Code / logic / page deletions need double confirmation:** never delete code, business logic, pages, components or files without asking — same two-step confirmation.

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
2. Read `docs/session_log.md` (newest first), then `docs/build_status.md`, `docs/screen_status.md` and the docs named in the latest entries.
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
3. **Status:** update `docs/build_status.md` if code changed (in the code PR).
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
- Code, comments and docs in English; chat replies in Turkish (core rule 1).
- Out of scope now: building the mobile app (but design for it — core rule 4), phone-width proposals (P), Application Manager screens review, e-mail designs.
