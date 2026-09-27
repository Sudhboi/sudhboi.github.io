// A vim / ghci-style command line, opened with ":" (scripts/nav-keys.ts).
//
//   :cd <page>     travel there along the diagram (scripts/travel.ts)
//   :t <thing>     its type: a page, a token from the pages, or the author
//   :browse        the pages and arrows of the category
//   :set bg=dark   switch light / dark (scripts/theme.ts)
//   :chase [page]  chase a square of the diagram (scripts/chase.ts)
//   :q             close it
//   :pwd, :help and a few others
//
// Suggestions show as soon as it opens, filtered as you type: commands first,
// then the argument's options. ↑ / ↓ move the highlight through them, Tab /
// Shift-Tab fill them in one by one, the highlighted one is ghosted in after
// the cursor, and Enter takes it (or runs what's typed, if nothing matches).
// Shift-↑ / Shift-↓ walk the history, kept in sessionStorage.

import { arrows, meta, pages, type Page } from "../category";
import { kinds, kindType } from "../kinds";
import { all as squares, chase } from "./chase";
import { current, toggle } from "./theme";
import { travelTo } from "./travel";

interface Option {
  fill: string; // what the input becomes when it's picked
  label: string;
  hint: string;
}

interface Command {
  name: string;
  usage: string;
  hint: string;
  // Offered in the list; aliases and easter eggs work but aren't.
  listed: boolean;
  // Options for the argument, if it takes one.
  args?: () => { value: string; hint: string }[];
  // Whether it's useless without an argument (then picking it waits for one).
  needsArg?: boolean;
  run: (arg: string) => string | void;
}

const form = document.querySelector<HTMLFormElement>("form.prompt");
const input = form?.querySelector<HTMLInputElement>("input");
const list = form?.querySelector<HTMLUListElement>(".suggestions");
const out = form?.querySelector<HTMLElement>(".out");
const ghost = form?.querySelector<HTMLElement>(".ghost");

const here = (): Page | undefined =>
  document.querySelector<HTMLElement>("nav[data-page]")?.dataset.page as
    | Page
    | undefined;

const norm = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, "");

// A page by id or title ("freegroups", "Free Groups"), or a unique prefix.
function findPage(arg: string): Page | undefined {
  const a = norm(arg);
  const exact = pages.find((p) => p === a || norm(meta[p].title) === a);
  if (exact) return exact;
  const prefixed = pages.filter(
    (p) => p.startsWith(a) || norm(meta[p].title).startsWith(a),
  );
  return prefixed.length === 1 ? prefixed[0] : undefined;
}

const pageArgs = () =>
  pages.map((p) => ({ value: p, hint: meta[p].title }));

function cd(arg: string) {
  if (arg === "" || arg === "~" || arg === "/") arg = "home";
  if (arg === "..") {
    close();
    return history.back();
  }
  const to = findPage(arg);
  if (!to) return `E344: Can't find directory "${arg}" in cdpath`;
  if (to === here()) return `Already here: ${meta[to].href}`;
  close();
  travelTo(to);
}

// Known things, by what `:t` calls them.
function typeOf(arg: string): string {
  if (/^(sudhir|sudhir krisna|me|whoami)$/i.test(arg))
    return "Sudhir Krisna :: Name";
  if (arg in kinds) return `${arg} :: ${kindType[kinds[arg]]}`;
  const token = Object.keys(kinds).find((k) => norm(k) === norm(arg));
  if (token) return `${token} :: ${kindType[kinds[token]]}`;
  const p = pages.find((q) => q === norm(arg));
  if (p) return `${p} :: Page`;
  const [a, b] = arg.split(/\s*(?:->|→)\s*/);
  if (b !== undefined) {
    const x = findPage(a);
    const y = findPage(b);
    const arrow = arrows.find(([f, t]) => f === x && t === y);
    if (arrow) return `${a} -> ${b} :: Hom ${x} ${y}  -- ${arrow[2]}`;
  }
  return `<interactive>:1:1: error: Variable not in scope: ${arg}`;
}

function browse(): string {
  const w = Math.max(...pages.map((p) => p.length));
  const objs = pages.map((p) => `${p.padEnd(w)} :: Page    -- ${meta[p].href}`);
  const homs = arrows.map(
    ([a, b, why]) => `${a.padEnd(w)} -> ${b.padEnd(w)}  -- ${why}`,
  );
  return [...objs, "", ...homs].join("\n");
}

function set(arg: string) {
  const m = /^(?:bg|background)=(light|dark)$/.exec(arg.replace(/\s+/g, ""));
  if (!m) return `E518: Unknown option: ${arg || "(none)"}`;
  if (current() !== m[1]) toggle();
  return `background=${m[1]}`;
}

function help() {
  close();
  document.querySelector<HTMLDialogElement>("dialog.keys")?.showModal();
}

const commands: Command[] = [
  {
    name: "cd",
    usage: "cd <page>",
    hint: "travel there along the diagram",
    listed: true,
    args: pageArgs,
    needsArg: true,
    run: cd,
  },
  { name: "e", usage: "e <page>", hint: "", listed: false, args: pageArgs, run: cd },
  {
    name: "t",
    usage: "t <thing>",
    hint: "the type of a page, a token, or me",
    listed: true,
    needsArg: true,
    args: () => [
      { value: "sudhir", hint: "the author" },
      ...pages.map((p) => ({ value: p, hint: "a page" })),
      ...Object.entries(kinds).map(([k, v]) => ({
        value: k,
        hint: `a ${kindType[v].toLowerCase()}`,
      })),
    ],
    run: (arg) => (arg ? typeOf(arg) : "<interactive>:1:1: error: parse error"),
  },
  {
    name: "browse",
    usage: "browse",
    hint: "list the pages and arrows",
    listed: true,
    run: browse,
  },
  { name: "ls", usage: "ls", hint: "", listed: false, run: browse },
  {
    name: "set",
    usage: "set bg=<light|dark>",
    hint: "switch light / dark",
    listed: true,
    needsArg: true,
    args: () => [
      { value: "bg=light", hint: "light mode" },
      { value: "bg=dark", hint: "dark mode" },
    ],
    run: set,
  },
  {
    name: "chase",
    usage: "chase [page]",
    hint: "show a square of the diagram commutes",
    listed: true,
    // Each square, by the page where its two paths meet.
    args: () =>
      squares.map((sq) => ({
        value: sq.to,
        hint: `${meta[sq.from].title} ⇉ ${meta[sq.to].title}`,
      })),
    run: (arg) => {
      const to = arg ? findPage(arg) : undefined;
      const sq = squares.find((s) => s.to === to);
      if (arg && !sq) return `E486: No square ends at: ${arg}`;
      close();
      void chase(sq);
    },
  },
  {
    name: "pwd",
    usage: "pwd",
    hint: "where you are",
    listed: true,
    run: () => {
      const p = here();
      return p ? `${meta[p].href}  (${p} :: Page)` : location.pathname;
    },
  },
  {
    name: "help",
    usage: "help",
    hint: "keyboard shortcuts",
    listed: true,
    run: help,
  },
  {
    name: "q",
    usage: "q",
    hint: "close the prompt",
    listed: true,
    run: () => close(),
  },
  { name: "q!", usage: "q!", hint: "", listed: false, run: () => close() },
  { name: "quit", usage: "quit", hint: "", listed: false, run: () => close() },
  {
    name: "wq",
    usage: "wq",
    hint: "",
    listed: false,
    run: () => "E45: 'readonly' option is set (add ! to override)",
  },
  { name: "wq!", usage: "wq!", hint: "", listed: false, run: () => "force wrote nothing" },
  {
    name: "x",
    usage: "x",
    hint: "",
    listed: false,
    run: () => "E45: 'readonly' option is set (add ! to override)",
  },
];

const byName = (name: string) => commands.find((c) => c.name === name);

// "cd  lambda" → ["cd", "lambda"]; "q!" stays whole.
function parse(v: string): [string, string, boolean] {
  const m = /^(\S*)(\s+)?(.*)$/.exec(v.trimStart())!;
  return [m[1], m[3].trim(), m[2] !== undefined];
}

// A whole command, ready to run.
function complete(v: string): boolean {
  const [name, arg] = parse(v);
  const c = byName(name);
  return !!c && (!c.needsArg || arg !== "");
}

function suggest(v: string): Option[] {
  const [name, arg, spaced] = parse(v);
  if (!spaced) {
    const n = name.toLowerCase();
    return commands
      .filter((c) => c.listed && c.name.startsWith(n))
      .map((c) => ({
        fill: c.args ? `${c.name} ` : c.name,
        label: c.usage,
        hint: c.hint,
      }));
  }
  const c = byName(name);
  if (!c?.args) return [];
  const a = norm(arg);
  const all = c.args();
  // Prefix matches first, then anything containing it.
  const starts = all.filter((o) => norm(o.value).startsWith(a));
  const contains = all.filter(
    (o) => !norm(o.value).startsWith(a) && norm(o.value).includes(a),
  );
  return [...starts, ...contains].map((o) => ({
    fill: `${c.name} ${o.value}`,
    label: o.value,
    hint: o.hint,
  }));
}

// History of commands run, newest last.
const KEY = "prompt-history";
function loadHistory(): string[] {
  try {
    const h = JSON.parse(sessionStorage.getItem(KEY) ?? "[]");
    return Array.isArray(h) ? h.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function remember(v: string) {
  const h = loadHistory().filter((x) => x !== v);
  h.push(v);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(h.slice(-50)));
  } catch {
    // Storage blocked: history just won't survive the page.
  }
}

let options: Option[] = [];
let sel = 0;
let cycling = false; // Tab is stepping through a fixed list
let navigated = false; // ↑ / ↓ have moved the highlight since the last edit
let back = -1; // position in the history while Shift-↑ / Shift-↓ walk it
let draft = ""; // what was typed before walking the history
let returnTo: Element | null = null;

function render() {
  if (!list || !input || !ghost) return;
  list.replaceChildren(
    ...options.map((o, i) => {
      const li = document.createElement("li");
      li.id = `prompt-opt-${i}`;
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", String(i === sel));
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = `:${o.label}`;
      const hint = document.createElement("span");
      hint.className = "hint";
      hint.textContent = o.hint;
      li.append(label, hint);
      li.addEventListener("click", () => pick(i));
      return li;
    }),
  );
  list.hidden = options.length === 0;
  input.setAttribute("aria-expanded", String(options.length > 0));
  if (options[sel]) {
    input.setAttribute("aria-activedescendant", `prompt-opt-${sel}`);
    list.children[sel]?.scrollIntoView({ block: "nearest" });
  } else input.removeAttribute("aria-activedescendant");

  // Ghost in the rest of the highlighted suggestion after what's typed.
  const v = input.value;
  const o = options[sel];
  const rest =
    !cycling && (v !== "" || navigated) && o && o.fill.startsWith(v)
      ? o.fill.slice(v.length)
      : "";
  const typed = document.createElement("span");
  typed.className = "typed";
  typed.textContent = v;
  ghost.replaceChildren(typed, rest);
}

function refresh() {
  if (!input) return;
  cycling = false;
  navigated = false;
  options = suggest(input.value);
  sel = 0;
  render();
}

function fill(v: string) {
  if (!input) return;
  input.value = v;
  input.setSelectionRange(v.length, v.length);
}

function pick(i: number) {
  const o = options[i];
  if (!o || !input) return;
  fill(o.fill);
  refresh();
  input.focus();
}

function say(text: string) {
  if (!out) return;
  out.textContent = text;
  out.hidden = text === "";
}

function run(v: string) {
  const [name, arg] = parse(v);
  const c = byName(name);
  remember(v.trim());
  const result = c ? c.run(arg) : `E492: Not an editor command: ${v.trim()}`;
  // Still open: show the result above a fresh line, with the suggestions.
  if (typeof result === "string" && form && !form.hidden) {
    fill("");
    refresh();
    say(result);
  }
}

function enter() {
  if (!input) return;
  let v = input.value.trim();
  const o = options[sel];
  if (v === "" && !(navigated && o)) return close();
  // Take the highlighted suggestion, if there is one; what's typed runs as
  // it is only when nothing matches it. One that wants an argument waits.
  if (o) {
    if (!complete(o.fill)) {
      fill(o.fill);
      return refresh();
    }
    v = o.fill.trim();
  }
  back = -1;
  run(v);
}

function tab(step: 1 | -1) {
  if (options.length === 0) return;
  if (!cycling) {
    cycling = true;
    // The first Tab takes the highlighted one; later ones step on.
    if (input?.value === options[sel].fill) sel = (sel + step + options.length) % options.length;
  } else sel = (sel + step + options.length) % options.length;
  fill(options[sel].fill);
  // Only one choice: go straight on to its argument's options.
  if (options.length === 1) refresh();
  else render();
}

// Move the highlight without touching what's typed; Enter or Tab takes it.
function move(step: 1 | -1) {
  if (options.length === 0) return;
  sel = (sel + step + options.length) % options.length;
  cycling = false;
  navigated = true;
  render();
}

function walk(step: 1 | -1) {
  const h = loadHistory();
  if (h.length === 0 || !input) return;
  if (back === -1) {
    if (step === 1) return;
    draft = input.value;
    back = h.length;
  }
  back += step;
  if (back < 0) back = 0;
  if (back >= h.length) {
    back = -1;
    fill(draft);
  } else fill(h[back]);
  refresh();
}

export function openPrompt() {
  if (!form || !input) return;
  if (form.hidden) returnTo = document.activeElement;
  form.hidden = false;
  back = -1;
  say("");
  fill("");
  refresh();
  input.focus();
}

// Close, handing focus back to where it was (unless it's already moved on).
function close(restore = true) {
  if (!form || form.hidden) return;
  form.hidden = true;
  // A hidden input can otherwise keep focus and swallow keys. (Hidden first,
  // so the focusout this fires finds it already closed.)
  input?.blur();
  say("");
  const to = returnTo;
  returnTo = null;
  if (restore && (to instanceof HTMLElement || to instanceof SVGElement)) to.focus();
}

input?.addEventListener("input", () => {
  back = -1;
  say("");
  refresh();
});

input?.addEventListener("keydown", (e) => {
  switch (e.key) {
    case "Escape":
      e.preventDefault();
      return close();
    case "Enter":
      e.preventDefault();
      return enter();
    case "Tab":
      e.preventDefault();
      return tab(e.shiftKey ? -1 : 1);
    case "ArrowUp":
      e.preventDefault();
      return e.shiftKey ? walk(-1) : move(-1);
    case "ArrowDown":
      e.preventDefault();
      return e.shiftKey ? walk(1) : move(1);
    case "Backspace":
      // Backspace on an empty line closes it, as in vim.
      if (input.value === "") {
        e.preventDefault();
        close();
      }
  }
});

form?.addEventListener("submit", (e) => e.preventDefault());

// Clicking a suggestion shouldn't take focus from the input.
list?.addEventListener("mousedown", (e) => e.preventDefault());

// Leaving it (clicking elsewhere, or tabbing away) closes it.
form?.addEventListener("focusout", (e) => {
  if (!form.contains(e.relatedTarget as Node | null)) close(false);
});

// The hint at the bottom of the window opens it too (the only way in on a
// touch screen), and only shows once that works.
const hint = document.querySelector<HTMLButtonElement>(".prompt-hint");
hint?.addEventListener("click", () => openPrompt());
hint?.removeAttribute("hidden");
