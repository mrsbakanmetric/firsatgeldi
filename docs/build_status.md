# FırsatGeldi — Build Status

Owned by the implementation side (Claude Code). One row per screen; updated in the same pull request as the code.

## Foundation

| Part | Status | Last PR | Note |
|---|---|---|---|
| Monorepo skeleton | ✅ | #20 | pnpm + Turborepo; `apps/web` (Next.js, empty page); packages `core`, `contracts`, `tokens`, `i18n`, `ui`, `config` (empty); dependency-boundary lint. `packages/mocks` comes with the mock API step. |
| Basic CI | ✅ | #21 | GitHub Actions `CI` / job `ci`: install → lint → typecheck → unit tests → build on every PR to `main` and every push to `main`; read-only, no secrets; actions pinned by commit SHA. |
| Tokens | 🛠 | #22 | `packages/tokens` generates typed TypeScript values + platform-neutral `tokens.json` from `docs/design-tokens.json` on every build; WCAG AA contrast test (light and dark); the low-stock box is checked by its `stock-low-border` (#23). |

## Screens

| # | Screen | Built | Design version implemented | Last PR | Note |
|---|---|---|---|---|---|
| 1 | Search and Add | ⬜ | — | — | |
| 2 | Product Detail | ⬜ | — | — | |
| 4 | Tracked Items | ⬜ | — | — | |
| 5 | Notifications | ⬜ | — | — | |
| 3 | Home | ⬜ | — | — | |
| 6 | My Savings | ⬜ | — | — | |
| 7 | Packages and Premium | ⬜ | — | — | |
| 9 | Settings and Account | ⬜ | — | — | |
| 10 | Landing Page + SEO product page | ⬜ | — | — | |
| 11 | Legal Pages + Help and FAQ | ⬜ | — | — | |
| 13 | Discover and Profile | ⬜ | — | — | |
| 8 | Sign-in and Sign-up | ⬜ | — | — | |
| 12 | Application Manager screens (12a–12e) | ⬜ | — | — | |

Legend: ⬜ not started · 🛠 in progress · ✅ built (engineering_checklist.md passed)
