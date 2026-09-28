// Travelling between pages along the nav diagram.
//
// Following a node (or the name, or `g h`) zooms the page out into the
// diagram, pans the camera along the arrows to the target, then loads it; the
// new page zooms back in out of its node. The route is `route()` from the
// category: forwards along arrows when a morphism exists, else a teleport to
// Home and on from there. A teleport zooms out straight onto Home rather than
// onto the page being left (and, played in reverse, zooms straight in from
// Home).
//
// Back / forward can't be delayed, so the arriving page plays the trip
// instead: back replays the trip that made that history step in reverse
// (against the arrows), forward replays it as it was. Each history entry
// records the trip that reached it, and when it was created (`born`), which
// tells back from forward.
//
// Hand-off between pages is through sessionStorage:
//   travel      a trip that just played, for the next page to zoom in from
//   shown       the page last shown, for back / forward. Written on
//               arrival: written on pagehide, it can land after a page
//               restored from the back/forward cache has already read it.
// The inline script in Base.astro's <head> reads both to hide the page before
// first paint while a trip is pending (<html data-travel>).

import { meta, pages, route, type Page } from "../category";

interface Trip {
  from: Page;
  to: Page;
  teleport: boolean;
  path: Page[];
}

// One step of a trip: along an arrow, or a jump (teleport) between nodes.
interface Leg {
  a: Page;
  b: Page;
  jump: boolean;
}

const ZOOM = 250; // ms to zoom out of, or into, a page
const HOP = 250; // ms per arrow
const SHRINK = 0.92; // how far the page shrinks as it zooms out

const root = document.documentElement;
const still = matchMedia("(prefers-reduced-motion: reduce)");
const isPage = (p: unknown): p is Page => pages.includes(p as Page);

const currentPage = (): Page | undefined => {
  const p = document.querySelector<HTMLElement>("nav[data-page]")?.dataset.page;
  return isPage(p) ? p : undefined;
};

function legs(trip: Trip): Leg[] {
  const out: Leg[] = [];
  if (trip.teleport) out.push({ a: trip.from, b: "home", jump: true });
  for (let i = 1; i < trip.path.length; i++)
    out.push({ a: trip.path[i - 1], b: trip.path[i], jump: false });
  return out;
}

const reversed = (ls: Leg[]): Leg[] =>
  [...ls].reverse().map((l) => ({ a: l.b, b: l.a, jump: l.jump }));

function read<T>(key: string): T | undefined {
  try {
    return JSON.parse(sessionStorage.getItem(key) ?? "null") ?? undefined;
  } catch {
    return undefined;
  }
}

function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked: the next page just won't animate.
  }
}

// Clicking or pressing a key mid-trip skips the rest of it.
let skipping = false;
const ms = (d: number) => (skipping ? 0 : d);

function skip() {
  skipping = true;
  for (const a of document.getAnimations()) a.finish();
}

// The page apart from the stage: everything that zooms out and in.
const scene = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      "body > .sidebar > *, body > main, body > .theme-toggle",
    ),
  );

// Shrink or grow the scene about the middle of the window.
function zoomScene(out: boolean) {
  const [cx, cy] = [innerWidth / 2, innerHeight / 2];
  const small = { opacity: 0, transform: `scale(${SHRINK})` };
  const full = { opacity: 1, transform: "scale(1)" };
  return scene().map((el) => {
    const r = el.getBoundingClientRect();
    el.style.transformOrigin = `${cx - r.left}px ${cy - r.top}px`;
    return el.animate(out ? [full, small] : [small, full], {
      duration: ms(ZOOM),
      easing: "ease-in-out",
      fill: out ? "forwards" : "none",
    });
  });
}

// A full-window copy of the diagram, with a camera: a transform that puts a
// node in the middle of the window at some zoom.
class Stage {
  el = document.createElement("div");
  backdrop = document.createElement("div");
  svg: SVGSVGElement;
  original: SVGSVGElement;
  centre = new Map<Page, { x: number; y: number }>();
  rect: DOMRect;
  zoom: number;
  // Whether the nav is on screen to grow out of (not on a scrolled phone).
  inView: boolean;

  constructor(original: SVGSVGElement) {
    this.original = original;
    this.rect = original.getBoundingClientRect();
    this.inView = this.rect.bottom > 0 && this.rect.top < innerHeight;
    for (const hit of original.querySelectorAll<SVGElement>("[data-page] .hit")) {
      const p = hit.closest<SVGElement>("[data-page]")!.dataset.page as Page;
      const r = hit.getBoundingClientRect();
      this.centre.set(p, {
        x: r.left + r.width / 2 - this.rect.left,
        y: r.top + r.height / 2 - this.rect.top,
      });
    }
    // Zoom so that one column of the diagram spans ~40% of the window.
    const home = this.centre.get("home")!;
    const about = this.centre.get("about")!;
    const col = Math.abs(about.x - home.x) || 1;
    this.zoom = Math.min(3, Math.max(1, (0.4 * innerWidth) / col));

    this.svg = original.cloneNode(true) as SVGSVGElement;
    // Give the copy its own marker ids: markers inherit visibility from where
    // they're defined, and the original is hidden while the stage shows.
    for (const el of this.svg.querySelectorAll("[id]")) el.id = `travel-${el.id}`;
    for (const el of this.svg.querySelectorAll("[marker-end]"))
      el.setAttribute(
        "marker-end",
        el.getAttribute("marker-end")!.replace("url(#", "url(#travel-"),
      );
    // Nor the chase: its ⟲ cells, dots and lit arrows (scripts/chase.ts).
    for (const el of this.svg.querySelectorAll(".id, .id-label, .cell, .dot"))
      el.remove();
    for (const el of this.svg.querySelectorAll(".chasing, .meet"))
      el.classList.remove("chasing", "meet");
    for (const el of this.svg.querySelectorAll(".current")) {
      el.classList.remove("current");
      el.removeAttribute("aria-current");
    }
    Object.assign(this.svg.style, {
      left: `${this.rect.left}px`,
      top: `${this.rect.top}px`,
      width: `${this.rect.width}px`,
    });

    this.el.className = "travel-stage";
    this.el.setAttribute("aria-hidden", "true");
    this.el.inert = true;
    this.backdrop.className = "backdrop";
    this.el.append(this.backdrop, this.svg);
    document.body.append(this.el);
    original.style.visibility = "hidden";
  }

  // Put p in the middle of the window.
  cam(p: Page) {
    const c = this.centre.get(p)!;
    const x = innerWidth / 2 - this.rect.left - this.zoom * c.x;
    const y = innerHeight / 2 - this.rect.top - this.zoom * c.y;
    return `translate(${x}px, ${y}px) scale(${this.zoom})`;
  }

  // Where the copy sits exactly over the original.
  home = "translate(0px, 0px) scale(1)";

  here(p: Page) {
    for (const el of this.svg.querySelectorAll(".here")) el.classList.remove("here");
    this.svg.querySelector(`.obj[data-page="${p}"]`)?.classList.add("here");
  }

  arrow(a: Page, b: Page) {
    return this.svg.querySelector<SVGGElement>(
      `.arrow[data-from="${a}"][data-to="${b}"], .arrow[data-from="${b}"][data-to="${a}"]`,
    );
  }

  move(frames: Keyframe[], duration: number) {
    return this.svg.animate(frames, {
      duration: ms(duration),
      easing: "ease-in-out",
      fill: "forwards",
    }).finished;
  }

  // Point the camera at p without moving.
  at(p: Page) {
    this.here(p);
    void this.move([{ transform: this.cam(p) }], 0);
  }

  // Play legs along arrows. Teleports never get here: they're replaced by
  // zooming out onto, or in from, Home.
  async play(ls: Leg[]) {
    for (const { a, b } of ls) {
      const arrow = this.arrow(a, b);
      arrow?.classList.add("lit");
      await Promise.all([
        this.move([{ transform: this.cam(a) }, { transform: this.cam(b) }], HOP),
        this.dot(arrow, a),
      ]);
      this.here(b);
    }
  }

  dot(arrow: SVGGElement | null, a: Page) {
    return runDot(this.svg, arrow, a, ms(HOP));
  }

  remove() {
    this.el.remove();
    this.original.style.visibility = "";
  }
}

// A dot running along the arrow from a to b in svg, which may be against it.
// Also used by scripts/chase.ts.
export async function runDot(
  svg: SVGSVGElement,
  arrow: SVGGElement | null,
  a: Page,
  duration: number,
) {
  const line = arrow?.querySelector<SVGLineElement>(".stroke");
  if (!arrow || !line) return;
  const n = (k: string) => line.getAttribute(k)!;
  let [start, end] = [`${n("x1")}px, ${n("y1")}px`, `${n("x2")}px, ${n("y2")}px`];
  if (arrow.dataset.from !== a) [start, end] = [end, start];
  const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  dot.classList.add("dot");
  dot.setAttribute("r", "2.5");
  svg.append(dot);
  await dot.animate(
    [
      { transform: `translate(${start})`, opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { opacity: 1, offset: 0.8 },
      { transform: `translate(${end})`, opacity: 0 },
    ],
    { duration, easing: "ease-in-out" },
  ).finished;
  dot.remove();
}

const diagram = () => document.querySelector<SVGSVGElement>("nav .diagram");

let busy = false;

// Whether a trip is playing (scripts/chase.ts waits its turn).
export const travelling = () => busy;

// Skip on any click or key while a trip plays.
function during<T>(run: () => Promise<T>): Promise<T> {
  busy = true;
  skipping = false;
  addEventListener("pointerdown", skip, true);
  addEventListener("keydown", skip, true);
  return run().finally(() => {
    busy = false;
    removeEventListener("pointerdown", skip, true);
    removeEventListener("keydown", skip, true);
  });
}

// Leave for another page along the diagram, or just go if we can't animate.
export function travelTo(to: Page) {
  const from = currentPage();
  const svg = diagram();
  const href = meta[to].href;
  if (busy) return skip();
  if (!from || !svg || from === to || still.matches) return location.assign(href);
  const trip: Trip = { from, to, ...route(from, to) };
  const ls = legs(trip);
  // A teleport comes first: zoom out straight onto Home instead.
  const first = ls[0]?.jump ? ls.shift()!.b : from;
  void during(async () => {
    const stage = new Stage(svg);
    stage.here(from);
    const halfway = setTimeout(() => stage.here(first), ms(ZOOM / 2));
    await Promise.all([
      stage.move(
        stage.inView
          ? [{ transform: stage.home }, { transform: stage.cam(first) }]
          : [
              { transform: stage.cam(first), opacity: 0 },
              { transform: stage.cam(first), opacity: 1 },
            ],
        ZOOM,
      ),
      stage.backdrop.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: ms(ZOOM),
        fill: "forwards",
      }).finished,
      ...zoomScene(true).map((a) => a.finished),
    ]);
    clearTimeout(halfway);
    stage.here(first);
    await stage.play(ls);
    write("travel", { href, t: Date.now(), trip });
    location.assign(href);
  });
}

document.addEventListener("click", (e) => {
  if (e.defaultPrevented || e.button !== 0) return;
  if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
  const link = (e.target as Element).closest<HTMLElement | SVGElement>(
    "nav a.obj[data-page], a.logo",
  );
  if (!link) return;
  const to = link.classList.contains("logo") ? "home" : link.dataset.page;
  if (!isPage(to) || to === currentPage()) return;
  e.preventDefault();
  travelTo(to);
});

// Arriving: zoom in after a trip, or play one for back / forward.
function arrive(backForward: boolean) {
  const here = currentPage();
  const svg = diagram();
  const state = history.state ?? {};
  const arrived = read<{ href: string; t: number; trip: Trip }>("travel");
  try {
    sessionStorage.removeItem("travel");
  } catch {}

  let lit: Leg[] = []; // arrows already crossed, from the last page
  let ls: Leg[] | undefined; // legs still to play
  let start: Page | undefined;
  if (here && svg && !still.matches) {
    if (
      !backForward &&
      arrived?.trip?.to === here &&
      arrived.href === location.pathname &&
      Date.now() - arrived.t < 5000
    ) {
      state.trip = arrived.trip;
      lit = legs(arrived.trip).filter((l) => !l.jump);
      ls = [];
      start = here;
    } else if (backForward) {
      const left = read<{ page: Page; born?: number; trip?: Trip }>("shown");
      const mine: Trip | undefined = state.trip;
      if (left?.born !== undefined && state.born !== undefined) {
        if (state.born < left.born && left.trip?.from === here && left.trip.to === left.page)
          ls = reversed(legs(left.trip));
        else if (state.born > left.born && mine?.from === left.page && mine.to === here)
          ls = legs(mine);
      }
      start = left?.page;
    }
  }
  state.born ??= Date.now();
  history.replaceState(state, "");
  if (here) write("shown", { page: here, born: state.born, trip: state.trip });

  if (!here || !svg || !ls || !start || !isPage(start)) {
    delete root.dataset.travel;
    return;
  }
  const trip = ls;
  // A teleport first (forward) starts on Home; one last (back) is replaced by
  // zooming straight in from Home.
  const from = trip[0]?.jump ? trip.shift()!.b : start;
  const end = trip.at(-1)?.jump ? trip.pop()!.a : here;
  void during(async () => {
    const stage = new Stage(svg);
    for (const l of lit) stage.arrow(l.a, l.b)?.classList.add("lit");
    stage.at(from);
    if (backForward) {
      // Nothing zoomed out on the way here (the browser just went), so fade in.
      await stage.move([{ opacity: 0 }, { opacity: 1 }], 150);
      await stage.play(trip);
    }
    for (const el of stage.svg.querySelectorAll(".lit")) el.classList.remove("lit");
    const zooming = zoomScene(false);
    delete root.dataset.travel;
    await Promise.all([
      stage.move(
        stage.inView
          ? [{ transform: stage.cam(end) }, { transform: stage.home }]
          : [
              { transform: stage.cam(end), opacity: 1 },
              { transform: stage.cam(end), opacity: 0 },
            ],
        ZOOM,
      ),
      stage.backdrop.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: ms(ZOOM),
        fill: "forwards",
      }).finished,
      ...zooming.map((a) => a.finished),
    ]);
    stage.remove();
  });
}

// Hide the page as it goes, in case it comes back from the back/forward cache
// with a trip to play first.
addEventListener("pagehide", () => {
  if (!still.matches) root.dataset.travel = "";
});

addEventListener("pageshow", (e) => {
  if (!e.persisted) return;
  // Undo this page's own departure, left as it was when it went.
  document.querySelector(".travel-stage")?.remove();
  const svg = diagram();
  if (svg) svg.style.visibility = "";
  for (const el of scene()) for (const a of el.getAnimations()) a.cancel();
  arrive(true);
});

const nav = performance.getEntriesByType("navigation")[0] as
  | PerformanceNavigationTiming
  | undefined;
arrive(nav?.type === "back_forward");
