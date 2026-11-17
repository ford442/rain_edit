/** Seed content for a first visit (no restored workspace session). */

export const INITIAL_MARKDOWN = `# REFERENCE LAYER
Use this space for documentation, specs, or notes.
It sits behind the rain but remains readable.
**Toggle visibility with Alt key.**

## API Reference
- \`raindrops.clearDroplets(x, y, r)\`
- \`render(time)\`
- \`update()\`

> [!NOTE]
> Rain is just confetti from the sky.

\`\`\`javascript
function example() {
  return true;
}
\`\`\`

> [!WARN]
> Heavy storms ahead.

`.trim();

export const INITIAL_CODE = [
  "// rain-2 demo",
  "function hello(){",
  ' console.log("hello world");',
  "}",
  "",
  "// @portal",
].join("\n");
