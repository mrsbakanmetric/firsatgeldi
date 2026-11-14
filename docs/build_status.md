# FırsatGeldi — Build Status

Owned by the implementation side (Claude Code). One row per screen; updated in the same pull request as the code.

## Foundation

| Part | Status | Last PR | Note |
|---|---|---|---|
| Monorepo skeleton | ✅ | #20 | pnpm + Turborepo; `apps/web` (Next.js, empty page); packages `core`, `contracts`, `tokens`, `i18n`, `ui`, `config` (empty); dependency-boundary lint. `packages/mocks` comes with the mock API step. |
| Basic CI | ✅ | #21 | GitHub Actions `CI` / job `ci`: install → lint → typecheck → unit tests → build on every PR to `main` and every push to `main`; read-only, no secrets; actions pinned by commit SHA. |
| Tokens | ✅ | #22 | `packages/tokens` generates typed TypeScript values + platform-neutral `tokens.json` from `docs/design-tokens.json` on every build; WCAG AA contrast test (light and dark); the low-stock box is checked by its `stock-low-border` (#23). |
| Theme | ✅ | #24 | Generated `theme.css` (Tailwind v4 `@theme`, default scales removed) + light/dark CSS variables; follows the system by default, user choice (system / light / dark) stored in the browser and applied before first paint; no visible control yet. Hard-coded value lint in `apps/web` and `packages/ui` (ESLint + Stylelint). |
| i18n | ✅ | #25 | `packages/i18n`: tr (default) + en catalogues, typed keys, a missing key fails typecheck/build/CI; translated URL segments (`/tr/takip` ↔ `/en/tracking`). `core`: locale resolution (URL → user → `fg_locale` cookie → Accept-Language in q order → tr), money/date/plural formatting with Intl (Europe/Istanbul). Web: `proxy.ts` redirects `/` to the resolved locale; `<html lang>` per locale; no visible language control yet. Hard-coded text lint in `apps/web` and `packages/ui`. |
| App shell | ✅ | #50 | `AppShell` (signed-in, guest in the app, landing), `AuthShell`, `AdminShell` (header only; the sub-navigation is [RECOMMENDED] and not built) in `apps/web`; `PageTemplate` (List, Detail, Flow, Summary, Settings), `Dialog`, `Sheet`, `SkeletonBlock`, `StatusBanner`, `EmptyState`, `StepIndicator`, `SegmentedChoice` and the base primitives (`Button`, `TextField`, `Select`, `Switch`, `Checkbox`, `Menu`, `Tooltip`, `Avatar`, `Icon` with Lucide) in `packages/ui`. Main navigation routes render the shell with an empty template (guest viewer until the mock session, step 9). Development-only preview `/tr/dev/shell` (not in the production build). Tokens: z-index layers and numeric component values now generated as CSS variables. Design version: canvas 0 v1 + shell fixes #51 (28 px step dot, 44 px ghost button on touch, icon-only navigation from `breakpoint.md` to below `breakpoint.lg`). |
| Mock API and fixtures | ✅ | #55 | `packages/contracts`: Zod schemas, response envelope, error codes (tr/en messages in the catalogue), permission catalogue, activity actions, endpoint registry and the framework-free typed client; Search and Add endpoints + `GET /me`, `/me/entitlements`, `/me/search-history`, `/me/stream`. `packages/mocks`: MSW handlers derived from the registry (session, permission key, public allow-list, Zod input, idempotency, output shaping through the hidden/revealed offer views, activity rows); fixtures from design "1 Ara ve Ekle" in tr/en, masked personal data, times relative to now; session/scenario switch via `?mock-session=` / `?mock-scenario=` / `?mock-latency=` (development only). Web: `ApiProvider`, `useApiQuery`/`useApiMutation`/`useSession`, live updates; mock API only in development (`NEXT_PUBLIC_API_MOCKING=off` turns it off); `next build` fails if mock code is in the output. Hidden-seller leak test on bodies, errors, image URLs, live-update events and activity rows. Field-level contract: `architecture.md` §16.1 (#54). #55: `GET /uploads/:id` with `upload.own.view` (guests: own session only, users: own account only; logged as `upload.status`), guest polling with `poll` from the complete-upload answer (2 s / 60 s from settings) and `useUploadStatus` (timed-out state with the design's error text, tr/en; signed-in users use live updates), seller lookup limited to 10 per minute per user (`RATE_LIMITED`); `CompleteUploadResult.poll` is [ASSUMPTION] until written into §16.1. Shell viewer still a guest; connects to `GET /me` with the Search and Add step. |

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
