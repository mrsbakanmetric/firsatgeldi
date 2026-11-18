// Every mock route, in registry order. Development and tests only.
import { authHandlers } from "./handlers/auth";
import { catalogHandlers } from "./handlers/catalog";
import { homeHandlers } from "./handlers/home";
import { identifyHandlers } from "./handlers/identify";
import { productDetailHandlers } from "./handlers/product-detail";
import { settingsHandlers } from "./handlers/settings";
import { streamHandlers } from "./handlers/stream";
import { trackedItemHandlers } from "./handlers/tracked-items";
import { trackingHandlers } from "./handlers/tracking";
import type { MockController } from "./state";

export function createHandlers(controller: MockController) {
  return [...authHandlers(controller), ...catalogHandlers(controller), ...settingsHandlers(controller), ...identifyHandlers(controller), ...trackingHandlers(controller), ...trackedItemHandlers(controller), ...productDetailHandlers(controller), ...homeHandlers(controller), ...streamHandlers(controller)];
}
