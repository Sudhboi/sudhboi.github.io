// Inline `code` in the pages is highlighted by kind, like tokens in an editor.
// A Sätteri hast plugin tags each <code> (outside <pre>) with `tok-<kind>` at build
// time, so there's no client JS. Unknown tokens fail the build: add them here.

import { defineHastPlugin } from "satteri";

export type Kind = "lang" | "lib" | "tool";

export const kinds: Record<string, Kind> = {
  // Languages
  Python: "lang",
  Haskell: "lang",
  "Template Haskell": "lang",
  C: "lang",
  Java: "lang",
  "Lean 4": "lang",
  // Libraries and packages
  free_groups_26: "lib",
  numpy: "lib",
  matplotlib: "lib",
  scipy: "lib",
  networkx: "lib",
  "graph-tool": "lib",
  pytorch: "lib",
  sortedcontainers: "lib",
  vty: "lib",
  // Tools, systems and services
  Linux: "tool",
  Nix: "tool",
  NixOS: "tool",
  nixpkgs: "tool",
  devenv: "tool",
  "Home Manager": "tool",
  Git: "tool",
  GitHub: "tool",
  "GitHub Actions": "tool",
  Cabal: "tool",
  Stack: "tool",
  MariaDB: "tool",
  MySQL: "tool",
  PyPI: "tool",
  Sphinx: "tool",
  pytest: "tool",
};

export const codeKinds = defineHastPlugin({
  name: "code-kinds",
  element: {
    filter: ["code"],
    visit(node, ctx) {
      if (ctx.parent(node)?.tagName === "pre") return;
      const token = ctx.textContent(node);
      const kind = kinds[token];
      if (!kind)
        throw new Error(
          `${ctx.fileURL?.pathname ?? "page"}: inline code ${JSON.stringify(token)} ` +
            "has no kind in src/code-kinds.ts",
        );
      ctx.setProperty(node, "className", [`tok-${kind}`]);
    },
  },
});
