// Light/dark toggle. The page follows prefers-color-scheme until the button
// is pressed; the choice is kept in localStorage and applied as
// <html data-theme>, before first paint, by the inline script in Base.astro.
// Choosing what the system already prefers forgets the override.

export type Theme = "light" | "dark";
const KEY = "theme";

const root = document.documentElement;
const system = matchMedia("(prefers-color-scheme: dark)");
const button = document.querySelector<HTMLButtonElement>(".theme-toggle");

const systemTheme = (): Theme => (system.matches ? "dark" : "light");
export const current = (): Theme =>
  (root.dataset.theme as Theme | undefined) ?? systemTheme();

function label() {
  if (!button) return;
  const next = current() === "dark" ? "light" : "dark";
  button.setAttribute("aria-label", `Switch to ${next} mode`);
  button.title = `Switch to ${next} mode`;
}

function set(theme: Theme) {
  try {
    if (theme === systemTheme()) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    // Storage blocked: the choice still holds for this page.
  }
  if (theme === systemTheme()) delete root.dataset.theme;
  else root.dataset.theme = theme;
  label();
}

// Cross-fade the whole page where view transitions exist; otherwise, or
// with reduced motion, switch instantly.
const still = matchMedia("(prefers-reduced-motion: reduce)");

export function toggle() {
  const next: Theme = current() === "dark" ? "light" : "dark";
  if (!("startViewTransition" in document) || still.matches) return set(next);
  document.startViewTransition(() => set(next));
}

button?.addEventListener("click", toggle);
system.addEventListener("change", label);

label();
// Only show the button once it works.
button?.removeAttribute("hidden");
