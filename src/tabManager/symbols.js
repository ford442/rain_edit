/**
 * Lightweight symbol extraction for echo outlines (regex-based; JS/TS/Python).
 */

/**
 * Extract top-level symbols (functions, classes, variables, methods) from source code.
 * Uses simple regex patterns — works best with JS/TS/Python.
 * @param {string} source
 * @returns {{ name: string, kind: string, line: number }[]}
 */
export function _extractSymbols(source) {
  const symbols = [];
  const patterns = [
    { kind: "class", re: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/m },
    { kind: "function", re: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/m },
    {
      kind: "arrow",
      re: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/m,
    },
    { kind: "method", re: /^[\t ]{2,}(?:async\s+)?(\w+)\s*\([^)]*\)\s*\{/m },
    { kind: "def", re: /^def\s+(\w+)\s*\(/m },
    { kind: "const", re: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/m },
  ];
  const lines = source.split("\n");
  lines.forEach((line, idx) => {
    for (const { kind, re } of patterns) {
      const m = line.match(re);
      if (m) {
        // Avoid duplicate names at same line
        if (!symbols.some((s) => s.name === m[1] && s.line === idx + 1)) {
          symbols.push({ name: m[1], kind, line: idx + 1 });
        }
        break;
      }
    }
  });
  return symbols;
}

/**
 * Return a small icon character for a symbol kind.
 * @param {string} kind
 * @returns {string}
 */
export function _symbolKindIcon(kind) {
  const map = {
    class: "◉",
    function: "ƒ",
    arrow: "→",
    method: "⬡",
    def: "δ",
    const: "κ",
  };
  return map[kind] ?? "·";
}
