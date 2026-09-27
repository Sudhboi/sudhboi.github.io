// Diagram chasing: every square in the nav diagram commutes, and chasing one
// shows it. Both of its paths light up, a dot runs down each at once, the
// two meet at the far corner, and the equation of the two paths shows under
// the diagram.
//
// Started from a square's ⟲ (click, Enter or Space), the `c` key (the next
// square each time; scripts/nav-keys.ts), or `:chase` (scripts/prompt.ts).
// With reduced motion there are no dots: the paths and the equation just show.

import { meta, squares, type Page, type Square } from "../category";
import { runDot, travelling } from "./travel";

const HOP = 300; // ms per arrow
const SHOW = 3000; // ms the result stays up

const still = matchMedia("(prefers-reduced-motion: reduce)");
const svg = document.querySelector<SVGSVGElement>("nav .diagram");
const line = document.querySelector<HTMLElement>("nav .chase");
const text = line?.querySelector("span");
export const all = squares();

let next = 0; // which square `c` chases next
let run = 0; // the chase playing now; older ones stop where they are
let fade: number | undefined;
let emptying: number | undefined;

const arrow = (a: Page, b: Page) =>
  svg?.querySelector<SVGGElement>(`.arrow[data-from="${a}"][data-to="${b}"]`) ??
  null;

const path = (sq: Square, via: Page) =>
  [sq.from, via, sq.to].map((p) => meta[p].title).join(" → ");

function clear() {
  window.clearTimeout(fade);
  if (!svg || !line) return;
  for (const el of svg.querySelectorAll(".chasing, .meet, .spin"))
    el.classList.remove("chasing", "meet", "spin");
  // Close it (see .chase in NavDiagram.astro), and empty it once closed.
  line.classList.remove("shown");
  window.clearTimeout(emptying);
  emptying = window.setTimeout(() => {
    if (text && !line.classList.contains("shown")) text.textContent = "";
  }, 500);
}

export async function chase(sq: Square = all[next % all.length]) {
  if (!svg || !line || travelling()) return;
  const id = ++run;
  // Finish off any chase already running (its dots resolve and it stops).
  for (const a of svg.getAnimations({ subtree: true })) a.finish();
  clear();
  next = all.indexOf(sq) + 1;

  // Bring the diagram into view if it's scrolled away (phones).
  const r = svg.getBoundingClientRect();
  if (r.bottom < 0 || r.top > innerHeight)
    svg.scrollIntoView({ block: "nearest", behavior: still.matches ? "auto" : "smooth" });

  const legs = sq.via.map((v) => [
    [sq.from, v],
    [v, sq.to],
  ]) as [Page, Page][][];
  for (const [a, b] of legs.flat()) arrow(a, b)?.classList.add("chasing");

  if (!still.matches)
    for (const hop of [0, 1]) {
      await Promise.all(
        legs.map((l) => runDot(svg, arrow(...l[hop]), l[hop][0], HOP)),
      );
      if (id !== run) return;
    }

  // They meet: the far corner lights up and the ⟲ turns.
  svg.querySelector(`.obj[data-page="${sq.to}"]`)?.classList.add("meet");
  svg.querySelector(`.cell[data-square="${all.indexOf(sq)}"]`)?.classList.add("spin");
  window.clearTimeout(emptying);
  if (text) text.textContent = `${path(sq, sq.via[0])} = ${path(sq, sq.via[1])}`;
  line.classList.add("shown");
  fade = window.setTimeout(() => {
    if (id === run) clear();
  }, SHOW);
}

// Make the ⟲ cells work, then show them.
if (svg) {
  for (const cell of svg.querySelectorAll<SVGGElement>(".cell")) {
    const sq = all[Number(cell.dataset.square)];
    if (!sq) continue;
    cell.setAttribute("role", "button");
    cell.setAttribute("tabindex", "0");
    cell.addEventListener("click", () => void chase(sq));
    cell.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      void chase(sq);
    });
  }
  svg.dataset.chase = "";
  // In the layout from now on, closed until a chase opens it.
  if (line) line.hidden = false;
}
