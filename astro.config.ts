import { defineConfig } from "astro/config";
import type { AstroIntegration } from "astro";
import { diagramProblems } from "./src/category";

const navCategory: AstroIntegration = {
  name: "nav-category",
  hooks: {
    "astro:config:setup": () => {
      const problems = diagramProblems();
      if (problems.length > 0)
        throw new Error(
          "Nav diagram is not a thin category with initial object Home:\n  " +
            problems.join("\n  "),
        );
    },
  },
};

export default defineConfig({
  site: "https://www.sudhirkrisna.com",
  integrations: [navCategory],
});
