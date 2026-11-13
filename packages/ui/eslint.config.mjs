import { defineConfig } from "eslint/config";
import base from "@firsatgeldi/config/eslint/base";
import { hardCodedValues } from "@firsatgeldi/config/eslint/hard-coded-values";

// UI components are styled by the web app's Tailwind entry (it scans packages/ui/src).
export default defineConfig(base, hardCodedValues({ entryPoint: "../../apps/web/app/globals.css" }));
