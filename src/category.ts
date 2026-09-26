// The site as a category.
//
// Objects are pages; the arrows below generate the morphisms, and composites
// (e.g. home -> projects -> lambda) exist implicitly. The category is thin —
// at most one morphism between any two pages — so every diagram commutes:
// home -> projects -> lambda = home -> about -> lambda.
//
// `astro.config.ts` refuses to build unless the generators really do present
// a thin category (no cycles) with Home as its initial object.

export const pages = ["home", "projects", "lambda", "notes", "about"] as const;
export type Page = (typeof pages)[number];

export const meta: Record<Page, { title: string; href: string }> = {
  home: { title: "Home", href: "/" },
  projects: { title: "Projects", href: "/projects/" },
  lambda: { title: "Lambda", href: "/lambda/" },
  notes: { title: "Notes", href: "/notes/" },
  about: { title: "About", href: "/about/" },
};

type Arrow = readonly [from: Page, to: Page];

// Generating arrows, as drawn in the nav diagram.
export const arrows: Arrow[] = [
  ["home", "projects"],
  ["home", "about"],
  ["projects", "lambda"],
  ["projects", "notes"],
  ["about", "lambda"],
];

// Grid position of each object in the nav diagram: [column, row].
//
//   Home ───→ Projects ───→ Notes
//    │           │
//    ↓           ↓
//   About ───→ Lambda
export const layout: Record<Page, readonly [col: number, row: number]> = {
  home: [0, 0],
  projects: [1, 0],
  notes: [2, 0],
  about: [0, 1],
  lambda: [1, 1],
};

const successors = (p: Page) =>
  arrows.filter(([a]) => a === p).map(([, b]) => b);

// Everything wrong with the diagram as a presentation of a thin category
// with initial object Home; empty when all is well.
export function diagramProblems(): string[] {
  const problems: string[] = [];

  // Acyclic: otherwise two distinct pages would be isomorphic.
  const state = new Map<Page, "visiting" | "done">();
  const visit = (p: Page, path: Page[]) => {
    if (state.get(p) === "done") return;
    if (state.get(p) === "visiting") {
      problems.push(`cycle: ${[...path, p].join(" -> ")}`);
      return;
    }
    state.set(p, "visiting");
    for (const q of successors(p)) visit(q, [...path, p]);
    state.set(p, "done");
  };
  for (const p of pages) visit(p, []);

  // Initial: Home has a (necessarily unique) morphism to every page.
  const reached = new Set<Page>(["home"]);
  const queue: Page[] = ["home"];
  while (queue.length > 0)
    for (const q of successors(queue.shift()!))
      if (!reached.has(q)) reached.add(q), queue.push(q);
  for (const p of pages)
    if (!reached.has(p)) problems.push(`no morphism home -> ${p}`);

  return problems;
}
