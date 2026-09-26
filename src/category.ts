// The site as a category.
//
// Objects are pages; the arrows below generate the morphisms, and composites
// (e.g. home -> projects -> lambda) exist implicitly. An arrow a -> b reads
// "a leads on to b". The category is thin — at most one morphism between any
// two pages — so every diagram in it commutes.
//
// `astro.config.ts` refuses to build unless all of that holds.

export const pages = [
  "home",
  "experience",
  "projects",
  "about",
  "freegroups",
  "lambda",
  "notes",
] as const;
export type Page = (typeof pages)[number];

export const meta: Record<Page, { title: string; href: string }> = {
  home: { title: "Home", href: "/" },
  experience: { title: "Experience", href: "/experience/" },
  projects: { title: "Projects", href: "/projects/" },
  about: { title: "About", href: "/about/" },
  // Not /free_groups_26/: that path belongs to the module's documentation.
  freegroups: { title: "Free Groups", href: "/free-groups/" },
  lambda: { title: "Lambda", href: "/lambda/" },
  notes: { title: "Notes", href: "/notes/" },
};

type Arrow = readonly [from: Page, to: Page, why: string];

// Generating arrows, as drawn in the nav diagram.
export const arrows: Arrow[] = [
  ["home", "experience", "what I do"],
  ["home", "projects", "what I build"],
  ["home", "about", "who I am"],
  ["experience", "freegroups", "built as a research assistant"],
  ["projects", "freegroups", "an open-source Python module"],
  ["projects", "lambda", "an interpreter in progress"],
  ["about", "lambda", "an interest in type theory"],
  ["about", "notes", "what I'm studying"],
];

export type Loop = "up" | "down" | "left" | "right";

// Where each object sits in the nav diagram ([column, row]), and which way its
// identity loop opens — towards whichever side is free of arrows.
export const layout: Record<Page, { at: readonly [number, number]; loop: Loop }> =
  {
    home: { at: [1, 0], loop: "up" },
    experience: { at: [0, 0], loop: "up" },
    about: { at: [2, 0], loop: "up" },
    notes: { at: [3, 0], loop: "up" },
    freegroups: { at: [0, 1], loop: "down" },
    projects: { at: [1, 1], loop: "down" },
    lambda: { at: [2, 1], loop: "down" },
  };

const successors = (p: Page) =>
  arrows.filter(([a]) => a === p).map(([, b]) => b);

// Everything reachable from p, including p itself (its identity).
export function above(p: Page): Set<Page> {
  const seen = new Set<Page>([p]);
  const queue = [p];
  while (queue.length > 0)
    for (const q of successors(queue.shift()!))
      if (!seen.has(q)) seen.add(q), queue.push(q);
  return seen;
}

// Whether there is a morphism a -> b.
export const leq = (a: Page, b: Page) => above(a).has(b);

// The shortest chain of generating arrows from a to b, if there is one.
function path(a: Page, b: Page): Page[] | undefined {
  const parent = new Map<Page, Page | undefined>([[a, undefined]]);
  const queue = [a];
  while (queue.length > 0 && !parent.has(b)) {
    const p = queue.shift()!;
    for (const q of successors(p))
      if (!parent.has(q)) parent.set(q, p), queue.push(q);
  }
  if (!parent.has(b)) return undefined;
  const chain: Page[] = [];
  for (let p: Page | undefined = b; p !== undefined; p = parent.get(p))
    chain.unshift(p);
  return chain;
}

// How the nav travels from one page to another (scripts/travel.ts): along
// the arrows when a morphism exists, else by teleporting to Home (initial,
// so it reaches everything) and going on from there.
export function route(
  from: Page,
  to: Page,
): { teleport: boolean; path: Page[] } {
  const direct = path(from, to);
  if (direct) return { teleport: false, path: direct };
  return { teleport: true, path: path("home", to)! };
}

// Everything wrong with the diagram; empty when all is well.
export function diagramProblems(): string[] {
  const problems: string[] = [];

  // Thin and skeletal: no cycles, so no two pages are isomorphic.
  for (const [a, b] of arrows)
    if (leq(b, a)) problems.push(`cycle through ${a} -> ${b}`);

  // Home is initial: it has a (necessarily unique) morphism to every page.
  for (const p of pages)
    if (!leq("home", p)) problems.push(`no morphism home -> ${p}`);

  return problems;
}
