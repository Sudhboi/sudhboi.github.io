// Vim-style keyboard shortcuts for the nav diagram.
//
//   h j k l   move focus to the neighbouring page in the diagram
//   Enter     follow it (native: the nodes are links)
//   g h       go home
//   H L       back / forward in history
//   ?         show or hide the cheatsheet

type Dir = "h" | "j" | "k" | "l";
const STEP: Record<Dir, readonly [number, number]> = {
  h: [-1, 0],
  j: [0, 1],
  k: [0, -1],
  l: [1, 0],
};

const nodes = () =>
  Array.from(
    document.querySelectorAll<SVGElement>(".diagram [data-page][data-col]"),
  );

const at = (el: SVGElement) =>
  [Number(el.dataset.col), Number(el.dataset.row)] as const;

// Where a move starts from: the focused node, else the current page, else Home.
function origin(): SVGElement | undefined {
  const all = nodes();
  const active = document.activeElement;
  return (
    all.find((n) => n === active) ??
    all.find((n) => n.classList.contains("current")) ??
    all.find((n) => n.dataset.page === "home")
  );
}

// The nearest node in direction d: least sideways drift first, then distance.
function neighbour(from: SVGElement, d: Dir): SVGElement | undefined {
  const [x, y] = at(from);
  const [dx, dy] = STEP[d];
  let best: SVGElement | undefined;
  let bestScore = Infinity;
  for (const n of nodes()) {
    const [nx, ny] = at(n);
    const along = (nx - x) * dx + (ny - y) * dy;
    if (along <= 0) continue;
    const across = Math.abs((nx - x) * dy + (ny - y) * dx);
    const score = across * 100 + along;
    if (score < bestScore) (best = n), (bestScore = score);
  }
  return best;
}

function move(d: Dir) {
  const from = origin();
  if (!from) return;
  // The first press only lands on the starting node.
  if (document.activeElement !== from) return from.focus();
  neighbour(from, d)?.focus();
}

const dialog = document.querySelector<HTMLDialogElement>("dialog.keys");

function toggleHelp() {
  if (!dialog) return;
  if (dialog.open) dialog.close();
  else dialog.showModal();
}

// Clicking the backdrop (the dialog itself, outside its content) closes it.
dialog?.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

let pendingG = 0;

document.addEventListener("keydown", (e) => {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
  if (typing(e.target)) return;

  if (e.key === "?") {
    e.preventDefault();
    return toggleHelp();
  }
  if (dialog?.open) return;

  if (pendingG && e.key === "h") {
    pendingG = 0;
    e.preventDefault();
    return location.assign("/");
  }
  window.clearTimeout(pendingG);
  pendingG = 0;

  switch (e.key) {
    case "h":
    case "j":
    case "k":
    case "l":
      e.preventDefault();
      return move(e.key);
    case "g":
      pendingG = window.setTimeout(() => (pendingG = 0), 1000);
      return;
    case "H":
      return history.back();
    case "L":
      return history.forward();
  }
});

// Only advertise the shortcuts once they work.
document.querySelector<HTMLElement>(".keys-hint")?.removeAttribute("hidden");
