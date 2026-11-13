// @vitest-environment jsdom
// Screens call the API through these hooks; here the mock API answers in Node,
// exactly as the in-browser worker does in development.
import { createMockServer } from "@firsatgeldi/mocks/node";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "http://mock.test");
vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "off");

const { server, controller } = createMockServer();
const { ApiProvider } = await import("./provider");
const { useApiQuery, useSession } = await import("./hooks");

beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  cleanup();
  controller.config = { ...controller.config, session: "user", scenario: "success" };
});
afterAll(() => {
  server.close();
  vi.unstubAllEnvs();
});

function Probe() {
  const session = useSession();
  const search = useApiQuery("autocomplete", { query: { q: "dyson" } });
  return (
    <div>
      <p data-testid="session">{session.status === "ready" ? (session.me?.displayName ?? "guest") : session.status}</p>
      <p data-testid="search">{search.isSuccess ? search.data.data.items.map((item) => `${item.name} · ${item.category.name}`).join(", ") : search.status}</p>
    </div>
  );
}

describe.each([
  ["tr", "Dyson V15 Detect Absolute · Kablosuz süpürge"],
  ["en", "Dyson V15 Detect Absolute · Cordless vacuum"],
] as const)("API hooks — %s", (locale, expected) => {
  it("query data comes from the mock API through the typed client, in the page language", async () => {
    render(
      <ApiProvider locale={locale}>
        <Probe />
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("search").textContent).toBe(expected));
    expect(screen.getByTestId("session").textContent).toBe("Sena B.");
  });
});

describe("session hook", () => {
  it("a guest is a ready session without a user", async () => {
    controller.config = { ...controller.config, session: "guest" };
    render(
      <ApiProvider locale="tr">
        <Probe />
      </ApiProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("session").textContent).toBe("guest"));
  });
});
