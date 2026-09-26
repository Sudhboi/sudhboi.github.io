import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import type { AstroIntegration } from "astro";
import { diagramProblems } from "./src/category";
import { satteri } from "@astrojs/markdown-satteri";
import { codeKinds } from "./src/code-kinds";

const navCategory: AstroIntegration = {
  name: "nav-category",
  hooks: {
    "astro:config:setup": () => {
      const problems = diagramProblems();
      if (problems.length > 0)
        throw new Error(
          "Nav diagram is not the category it claims to be:\n  " +
            problems.join("\n  "),
        );
    },
  },
};

export default defineConfig({
  site: "https://www.sudhirkrisna.com",
  markdown: { processor: satteri({ hastPlugins: [codeKinds] }) },
  integrations: [
    navCategory,
    // Pages with `noindex: true` in their frontmatter are left out here too.
    sitemap({ filter: (page) => !/\/(404|lambda)\/$/.test(page) }),
  ],
});
