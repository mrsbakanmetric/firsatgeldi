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
