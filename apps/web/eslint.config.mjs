import { defineConfig } from "eslint/config";
import { hardCodedValues } from "@firsatgeldi/config/eslint/hard-coded-values";
import next from "@firsatgeldi/config/eslint/next";

export default defineConfig(next, hardCodedValues({ entryPoint: "app/globals.css" }));
