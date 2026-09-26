// The site as a category.
//
// Objects are pages; morphisms are navigation links. Identities are implicit
// (the logo on Home is the drawn one). `astro.config.ts` refuses to build
// unless `arrows` is closed under composition.

export const pages = ["home", "projects", "lambda", "notes", "about"] as const;
export type Page = (typeof pages)[number];

export const meta: Record<Page, { title: string; href: string }> = {
  home: { title: "Home", href: "/" },
  projects: { title: "Projects", href: "/projects/" },
  lambda: { title: "Lambda", href: "/lambda/" },
  notes: { title: "Notes", href: "/notes/" },
  about: { title: "About", href: "/about/" },
};

export const sections = pages.filter((p) => p !== "home");

type Arrow = readonly [from: Page, to: Page];

// Every navigation link on the site.
export const arrows: Arrow[] = [
  // Home is the table of contents.
  ...sections.map((p): Arrow => ["home", p]),
  // The logo always leads Home.
  ...sections.map((p): Arrow => [p, "home"]),
  // Forced by composition: p -> home -> q means p must link q directly.
  ...sections.flatMap((p) =>
    sections.filter((q) => q !== p).map((q): Arrow => [p, q]),
  ),
];

const key = ([a, b]: Arrow) => `${a}->${b}`;

// Composites a -> b -> c whose direct arrow a -> c is missing.
export function missingComposites(as: readonly Arrow[]): string[] {
  const present = new Set(as.map(key));
  const missing = new Set<string>();
  for (const [a, b] of as)
    for (const [b2, c] of as)
      if (b === b2 && a !== c && !present.has(key([a, c])))
        missing.add(key([a, c]));
  return [...missing].sort();
}

export const hasArrow = (from: Page, to: Page) =>
  arrows.some(([a, b]) => a === from && b === to);

// Header nav: each section the page has an arrow to, plus the page itself.
export const navFor = (page: Page) =>
  sections.filter((q) => q === page || hasArrow(page, q));
