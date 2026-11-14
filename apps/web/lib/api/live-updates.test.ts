import { describe, expect, it } from "vitest";
import { parseStreamMessage } from "./live-updates";

const uploadId = "0b6e2b0e-8f3c-4b8f-9f55-6d1e5b2a7c10";

describe("live-update messages", () => {
  it("accepts an event of the contract", () => {
    expect(parseStreamMessage("upload.ready", JSON.stringify({ uploadId, batchId: null }))).toEqual({ type: "upload.ready", data: { uploadId, batchId: null } });
  });

  it("ignores unknown events and malformed data", () => {
    expect(parseStreamMessage("seller.revealed", JSON.stringify({ uploadId }))).toBeNull();
    expect(parseStreamMessage("upload.ready", "{")).toBeNull();
    expect(parseStreamMessage("upload.ready", JSON.stringify({ uploadId: "x" }))).toBeNull();
  });
});

describe("check.finished", () => {
  it("is part of the contract and refreshes the Tracked Items list and summary", async () => {
    const { QueryClient } = await import("@tanstack/react-query");
    const { invalidateFor } = await import("./live-updates");
    const event = parseStreamMessage("check.finished", JSON.stringify({ trackedItemId: uploadId, checkedAt: "2026-11-14T09:00:00.000Z" }));
    expect(event?.type).toBe("check.finished");
    const client = new QueryClient();
    client.setQueryData(["listTrackedItems", { query: { filter: "all" } }], { data: 1 });
    client.setQueryData(["getTrackedItemsSummary"], { data: 1 });
    client.setQueryData(["getMe"], { data: 1 });
    if (event) await invalidateFor(client, event);
    expect(client.getQueryState(["listTrackedItems", { query: { filter: "all" } }])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["getTrackedItemsSummary"])?.isInvalidated).toBe(true);
    expect(client.getQueryState(["getMe"])?.isInvalidated).toBe(false);
  });
});
