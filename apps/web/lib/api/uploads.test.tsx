// @vitest-environment jsdom
// Upload status as the Search and Add screen will watch it (architecture.md §11a):
// guests poll with the server's values and stop with an error state; signed-in
// users wait for live updates. The mock API answers in Node.
import { type ApiLocale, createApiClient, type UploadPolling } from "@firsatgeldi/contracts";
import { createTranslator, LOCALES } from "@firsatgeldi/i18n";
import { type MockSession, startGuestSession, SYSTEM_SETTINGS } from "@firsatgeldi/mocks";
import { createMockServer } from "@firsatgeldi/mocks/node";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://mock.test");
vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "off");

/** Image processing runs only when a test says so, to keep an upload "in progress". */
const processing: (() => void)[] = [];
const { server, controller } = createMockServer({ schedule: (task) => void processing.push(task) });
const { ApiProvider } = await import("./provider");
const { UPLOAD_TIMEOUT_TEXT, useUploadStatus } = await import("./uploads");

const INTERVAL_MS = SYSTEM_SETTINGS["upload.guest_poll_interval_seconds"] * 1000;
const MAX_MS = SYSTEM_SETTINGS["upload.guest_poll_max_seconds"] * 1000;

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  processing.length = 0;
  controller.config = { ...controller.config, session: "user", scenario: "success" };
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function signInAs(session: MockSession) {
  controller.config = { ...controller.config, session };
}

/** Presign → PUT → complete, as the screen does before it watches the status. */
async function startUpload(locale: ApiLocale = "tr"): Promise<{ uploadId: string; poll: UploadPolling | null }> {
  const api = createApiClient({ baseUrl: "http://mock.test", platform: "web", locale: () => locale });
  const presign = await api.call("presignUploads", { body: { purpose: "IDENTIFY", files: [{ mime: "image/jpeg", bytes: 1000 }] } });
  const target = presign.data.uploads[0];
  if (!target) throw new Error("no upload");
  await fetch(target.uploadUrl, { method: "PUT", body: "jpeg" });
  const complete = await api.call("completeUploads", { body: { batchId: presign.data.batchId }, idempotencyKey: crypto.randomUUID() });
  return { uploadId: target.uploadId, poll: complete.data.poll };
}

function statusReads(uploadId: string): number {
  return controller.state.activity.filter((row) => row.action === "upload.status" && row.targetId === uploadId).length;
}

function Probe({ uploadId, poll, locale }: { uploadId: string; poll: UploadPolling | null; locale: ApiLocale }) {
  const t = createTranslator(locale);
  const status = useUploadStatus(uploadId, poll);
  return (
    <div>
      <p data-testid="state">{status.state === "done" ? `done:${status.upload.status}` : status.state === "error" ? `error:${status.error.body.code}` : status.state}</p>
      {status.state === "timedOut" ? (
        <>
          <p data-testid="title">{t(UPLOAD_TIMEOUT_TEXT.title)}</p>
          <p data-testid="body">{t(UPLOAD_TIMEOUT_TEXT.body)}</p>
          <button type="button" onClick={status.retry}>
            retry
          </button>
        </>
      ) : null}
    </div>
  );
}

function show(uploadId: string, poll: UploadPolling | null, locale: ApiLocale = "tr") {
  render(
    <ApiProvider locale={locale}>
      <Probe uploadId={uploadId} poll={poll} locale={locale} />
    </ApiProvider>,
  );
}

const state = () => screen.getByTestId("state").textContent;

describe("guest upload status", () => {
  it("the server sends the poll values from system settings to a guest only", async () => {
    signInAs("guest");
    expect((await startUpload()).poll).toEqual({ intervalSeconds: 2, maxSeconds: 60 });
    signInAs("user");
    expect((await startUpload()).poll).toBeNull();
  });

  it("polls every interval until the photo is ready, logging each read, then stops", async () => {
    signInAs("guest");
    const { uploadId, poll } = await startUpload();
    show(uploadId, poll);
    await waitFor(() => expect(state()).toBe("waiting"));
    const first = statusReads(uploadId);
    expect(first).toBe(1);

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS));
    await waitFor(() => expect(statusReads(uploadId)).toBe(2));

    for (const task of processing.splice(0)) task();
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS));
    await waitFor(() => expect(state()).toBe("done:READY"));
    const done = statusReads(uploadId);
    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS * 5));
    expect(statusReads(uploadId)).toBe(done);

    const rows = controller.state.activity.filter((row) => row.action === "upload.status" && row.targetId === uploadId);
    expect(rows.every((row) => row.userId === null && row.anonId === controller.state.anonId && row.outcome === "OK")).toBe(true);
  });

  it("another guest session gets NOT_FOUND for the upload", async () => {
    signInAs("guest");
    const { uploadId, poll } = await startUpload();
    startGuestSession(controller.state);
    show(uploadId, poll);
    await waitFor(() => expect(state()).toBe("error:NOT_FOUND"));
  });
});

describe.each(LOCALES)("guest upload status runs out — %s", (locale) => {
  it("shows the error state after the poll limit, stops asking, and a retry asks again", async () => {
    const t = createTranslator(locale);
    signInAs("guest");
    const { uploadId, poll } = await startUpload(locale);
    show(uploadId, poll, locale);
    await waitFor(() => expect(state()).toBe("waiting"));

    await act(() => vi.advanceTimersByTimeAsync(MAX_MS));
    await waitFor(() => expect(state()).toBe("timedOut"));
    expect(screen.getByTestId("title").textContent).toBe(t(UPLOAD_TIMEOUT_TEXT.title));
    expect(screen.getByTestId("body").textContent).toBe(t(UPLOAD_TIMEOUT_TEXT.body));
    // At most one read per interval within the limit (the first read is at 0 s).
    const reads = statusReads(uploadId);
    expect(reads).toBeLessThanOrEqual(MAX_MS / INTERVAL_MS + 1);
    expect(reads).toBeGreaterThan(MAX_MS / INTERVAL_MS / 2);

    await act(() => vi.advanceTimersByTimeAsync(INTERVAL_MS * 5));
    expect(statusReads(uploadId)).toBe(reads);

    for (const task of processing.splice(0)) task();
    act(() => screen.getByRole("button").click());
    await waitFor(() => expect(state()).toBe("done:READY"));
  });
});

describe("signed-in upload status", () => {
  it("does not poll: the result comes through live updates", async () => {
    const { uploadId, poll } = await startUpload();
    show(uploadId, poll);
    await waitFor(() => expect(state()).toBe("waiting"));
    await act(() => vi.advanceTimersByTimeAsync(MAX_MS * 2));
    expect(statusReads(uploadId)).toBe(1);
    expect(state()).toBe("waiting");
  });
});
