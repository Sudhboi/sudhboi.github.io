// The path you took through the site, shown as a composite morphism.
//
// The trail lives in sessionStorage. It only grows along morphisms: arriving
// at b from a extends it when the trail ended at a and a -> b exists.
// Anything else (going back up, arriving from outside) starts it afresh. The
// category is thin, so the composite is the one morphism between its ends,
// whichever way round the diagram you went.

import { leq, meta, pages, type Page } from "../category";

const KEY = "trail";

const pageAt = (path: string): Page | undefined =>
  pages.find((p) => meta[p].href === path.replace(/\/?$/, "/"));

function referrerPage(): Page | undefined {
  try {
    const url = new URL(document.referrer);
    return url.origin === location.origin ? pageAt(url.pathname) : undefined;
  } catch {
    return undefined;
  }
}

function load(): Page[] {
  try {
    const trail = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(trail) ? trail.filter((p) => p in meta) : [];
  } catch {
    return [];
  }
}

function save(trail: Page[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(trail));
  } catch {
    // Storage blocked: the trail just won't persist.
  }
}

function update(here: Page): Page[] {
  const trail = load();
  const last = trail.at(-1);
  if (last === here) return trail; // a reload, or restored from the cache
  const from = referrerPage();
  if (last !== undefined && from === last && leq(last, here))
    return [...trail, here];
  return [here];
}

function render(trail: Page[]) {
  const el = document.querySelector<HTMLElement>(".trail");
  if (!el) return;
  if (trail.length < 3) return el.setAttribute("hidden", "");
  const names = trail.map((p) => meta[p].title);
  el.textContent = `via ${names.join(" → ")}`;
  el.title =
    `A composite, so the unique morphism ${names[0]} → ${names.at(-1)}: ` +
    "the diagram commutes.";
  el.removeAttribute("hidden");
}

// pageshow also fires when the back/forward cache restores a page.
addEventListener("pageshow", () => {
  const here = document.querySelector<HTMLElement>("nav[data-page]")?.dataset
    .page as Page | undefined;
  if (!here || !(here in meta)) return;
  const trail = update(here);
  save(trail);
  render(trail);
});
