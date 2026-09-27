// Inline `code` in the pages is highlighted by kind, like tokens in an editor.
// A Sätteri hast plugin tags each <code> (outside <pre>) with `tok-<kind>`, and
// its type for the hover tooltip, at build time, so there's no client JS. Unknown tokens fail the build: add them to
// src/kinds.ts.

import { defineHastPlugin } from "satteri";
import { kinds, kindType } from "./kinds";

export const codeKinds = defineHastPlugin({
  name: "code-kinds",
  element: {
    filter: ["code"],
    visit(node, ctx) {
      if (ctx.parent(node)?.tagName === "pre") return;
      const token = ctx.textContent(node);
      const kind = kinds[token];
      if (!kind)
        throw new Error(
          `${ctx.fileURL?.pathname ?? "page"}: inline code ${JSON.stringify(token)} ` +
            "has no kind in src/kinds.ts",
        );
      ctx.setProperty(node, "className", [`tok-${kind}`]);
      // Its type, shown on hover (global.css), as `:t` would give it.
      ctx.setProperty(node, "dataType", `${token} :: ${kindType[kind]}`);
    },
  },
});
