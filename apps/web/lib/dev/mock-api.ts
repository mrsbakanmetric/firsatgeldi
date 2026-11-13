// Development only: starts the in-browser mock API. Loaded by a dynamic import
// behind the mock API switch in lib/api/ready.ts, which a production build folds
// to `false`, so neither this file nor @firsatgeldi/mocks reaches the production
// bundle (checked by scripts/check-no-mock.mjs after `next build`).
export { startMockWorker } from "@firsatgeldi/mocks/browser";
