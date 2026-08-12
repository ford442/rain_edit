#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const src = path.join(process.cwd(), "src");
const groups = [
  { out: "styles_base.css", shards: [1, 2, 3, 4], title: "Base layout, shell, editor chrome" },
  { out: "styles_views.css", shards: [5, 6, 7, 8, 9, 10], title: "3D view-mode body classes" },
  { out: "styles_echo.css", shards: [11, 12, 13], title: "Echo documents and depth effects" },
  { out: "styles_ui.css", shards: [14, 15], title: "Dock, overlays, cheatsheet" },
];

for (const { out, shards, title } of groups) {
  const parts = shards.map((n) => {
    const file = path.join(src, `styles_${n}.css`);
    const body = fs.readFileSync(file, "utf8").trim();
    return `/* ─── styles_${n}.css ─── */\n${body}`;
  });
  const merged = `/* ${title} — merged from styles_${shards.join(", styles_")}.css */\n\n${parts.join("\n\n")}\n`;
  fs.writeFileSync(path.join(src, out), merged);
}

console.log("Wrote styles_{base,views,echo,ui}.css");
