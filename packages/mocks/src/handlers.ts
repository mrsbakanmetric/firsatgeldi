// Every mock route, in registry order. Development and tests only.
import { catalogHandlers } from "./handlers/catalog";
import { identifyHandlers } from "./handlers/identify";
import { streamHandlers } from "./handlers/stream";
import { trackedItemHandlers } from "./handlers/tracked-items";
import { trackingHandlers } from "./handlers/tracking";
import type { MockController } from "./state";

export function createHandlers(controller: MockController) {
  return [...catalogHandlers(controller), ...identifyHandlers(controller), ...trackingHandlers(controller), ...trackedItemHandlers(controller), ...streamHandlers(controller)];
}
