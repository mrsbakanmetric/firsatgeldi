import { defineConfig } from "eslint/config";
import { hardCodedText } from "@firsatgeldi/config/eslint/hard-coded-text";
import { hardCodedValues } from "@firsatgeldi/config/eslint/hard-coded-values";
import next from "@firsatgeldi/config/eslint/next";

export default defineConfig(
  next,
  hardCodedValues({ entryPoint: "app/globals.css" }),
  // Next's config already registers the "react" plugin.
  hardCodedText({ registerReactPlugin: false }),
);
