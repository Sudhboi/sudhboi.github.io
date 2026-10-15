// Switches for features that are built but not shown right now. Read at build
// time (layouts/Base.astro) and in the browser (scripts/), so keep it free of
// build-only imports.

// The ":" command line (scripts/prompt.ts) and its hint pill. Off: neither is
// rendered, ":" does nothing, and the cheatsheet leaves it out.
export const prompt = false;
