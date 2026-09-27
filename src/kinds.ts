// What each inline `code` token in the pages is: a language, a library or a
// tool. Read at build time by src/code-kinds.ts (highlighting) and in the
// browser by scripts/prompt.ts (`:t`), so keep it free of build-only imports.
// Unknown tokens fail the build: add them here.

export type Kind = "lang" | "lib" | "tool";

// How `:t` names each kind, as a type.
export const kindType: Record<Kind, string> = {
  lang: "Lang",
  lib: "Lib",
  tool: "Tool",
};

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
