// English UI texts. Must have exactly the keys of the Turkish catalogue.
import type { CatalogueShape } from "../types";
import type { tr } from "./tr";

export const en = {
  app: {
    name: "FırsatGeldi",
  },
  meta: {
    title: "FırsatGeldi",
  },
} as const satisfies CatalogueShape<typeof tr>;
