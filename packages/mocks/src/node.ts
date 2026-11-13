// Mock API in Node (unit and UI tests).
import { setupServer } from "msw/node";
import { createHandlers } from "./handlers";
import { createMockController, type MockController, type MockControllerOptions } from "./state";

export function createMockServer(options: MockControllerOptions = {}): { server: ReturnType<typeof setupServer>; controller: MockController } {
  const controller = createMockController({ ...options, config: { latencyMs: 0, ...options.config } });
  return { server: setupServer(...createHandlers(controller)), controller };
}
