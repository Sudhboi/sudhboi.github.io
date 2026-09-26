import { defineConfig } from "astro/config";
import type { AstroIntegration } from "astro";
import { arrows, missingComposites } from "./src/category";

const navClosure: AstroIntegration = {
  name: "nav-closure",
  hooks: {
    "astro:config:setup": () => {
      const missing = missingComposites(arrows);
      if (missing.length > 0)
        throw new Error(
          "Nav graph is not closed under composition. Missing arrows:\n  " +
            missing.join("\n  "),
        );
    },
  },
};

export default defineConfig({
  site: "https://www.sudhirkrisna.com",
  integrations: [navClosure],
});
