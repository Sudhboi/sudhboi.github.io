// The site as a category.
//
// Objects are pages; the arrows below generate the morphisms, and composites
// (e.g. home -> projects -> lambda) exist implicitly. An arrow a -> b reads
// "a leads on to b". The category is thin — at most one morphism between any
// two pages — so every diagram in it commutes.
//
// Two squares are more than commutative: they are pushouts. free_groups_26 is
// both research work and an open-source project, and it is the *least* page
// that both Experience and Projects lead to. Likewise Lambda for Projects and
// About (my interests). In a thin category a pushout is a join, so this is
// checkable.
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

// Squares  a <- apex -> b  whose pushout is `pushout`.
export const pushouts: { apex: Page; legs: [Page, Page]; pushout: Page }[] = [
  { apex: "home", legs: ["experience", "projects"], pushout: "freegroups" },
  { apex: "home", legs: ["projects", "about"], pushout: "lambda" },
];

export type Loop = "up" | "down" | "left" | "right";

// Where each object sits in the nav diagram ([column, row]), and which way its
// identity loop opens — towards whichever side is free of arrows.
export const layout: Record<Page, { at: readonly [number, number]; loop: Loop }> =
  {
    home: { at: [1, 0], loop: "up" },
    experience: { at: [0, 1], loop: "left" },
    projects: { at: [1, 1], loop: "down" },
    about: { at: [2, 1], loop: "right" },
    freegroups: { at: [0.5, 2], loop: "down" },
    lambda: { at: [1.5, 2], loop: "down" },
    notes: { at: [2.5, 2], loop: "down" },
  };

const successors = (p: Page) =>
  arrows.filter(([a]) => a === p).map(([, b]) => b);

// Everything reachable from p, including p itself (its identity).
function above(p: Page): Set<Page> {
  const seen = new Set<Page>([p]);
  const queue = [p];
  while (queue.length > 0)
    for (const q of successors(queue.shift()!))
      if (!seen.has(q)) seen.add(q), queue.push(q);
  return seen;
}

const leq = (a: Page, b: Page) => above(a).has(b);

// Everything wrong with the diagram; empty when all is well.
export function diagramProblems(): string[] {
  const problems: string[] = [];

  // Thin and skeletal: no cycles, so no two pages are isomorphic.
  for (const [a, b] of arrows)
    if (leq(b, a)) problems.push(`cycle through ${a} -> ${b}`);

  // Home is initial: it has a (necessarily unique) morphism to every page.
  for (const p of pages)
    if (!leq("home", p)) problems.push(`no morphism home -> ${p}`);

  // Each claimed pushout is the least page both legs lead to.
  for (const { apex, legs: [a, b], pushout } of pushouts) {
    const name = `pushout of ${a} <- ${apex} -> ${b}`;
    if (!leq(apex, a) || !leq(apex, b)) problems.push(`${name}: not a span`);
    if (!leq(a, pushout) || !leq(b, pushout))
      problems.push(`${name}: ${pushout} is not a cocone`);
    for (const q of above(a))
      if (above(b).has(q) && !leq(pushout, q))
        problems.push(`${name}: ${q} is a cocone not factoring through ${pushout}`);
  }

  return problems;
}
