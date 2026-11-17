import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  LAYOUTS,
  defaultLayout,
  layoutFor,
  layoutInput,
  overlayVars,
  placementToVars,
} from "../src/tabManager/layouts/index.js";
import { VIEW_MODES, echoBehavior, getViewMode } from "../src/tabManager/viewModes.js";
import { planEchoes, ECHO_POOL_SIZE, ECHO_RICH_COUNT } from "../src/tabManager/EchoLayer.js";
import { VIEW_MODE_TOGGLES, applyViewMode } from "../src/workspace/sessionSchema.js";
import {
  allowAttribute,
  escapeHtml,
  filterClassTokens,
  MARKDOWN_POLICY,
  MONACO_TOKENS_POLICY,
} from "../src/dom/sanitize.js";

const VIEWPORT = { width: 1280, height: 800 };
const file = (id, name = `file-${id}.js`) => ({ id, name, language: "javascript" });
const inputFor = (index, count, extra = {}) =>
  layoutInput({ index, count, viewport: VIEWPORT, file: file(index + 1), ...extra });

/** Lay out n documents with a layout and flatten to the CSS EchoLayer writes. */
const render = (fn, n) =>
  Array.from({ length: n }, (_, i) => placementToVars(fn(inputFor(i, n))));

/** Modes styled purely by CSS keyframes: they keep the default parallax stack. */
const CSS_ONLY_MODES = new Set(["aurora", "card-spread", "dna-helix", "outline"]);

test("every view mode has a pure layout (or is a known CSS-only mode)", () => {
  const values = new Set(VIEW_MODES.map((m) => m.value));
  for (const key of Object.keys(LAYOUTS)) {
    assert.ok(values.has(key), `layout "${key}" has no VIEW_MODES row`);
  }
  for (const value of values) {
    assert.ok(
      LAYOUTS[value] || CSS_ONLY_MODES.has(value),
      `view mode "${value}" has no layout`,
    );
  }
  assert.equal(layoutFor(""), defaultLayout);
  assert.equal(layoutFor("not-a-mode"), defaultLayout);
});

test("layouts are deterministic for n=8 and emit finite CSS", () => {
  for (const [key, fn] of [["", defaultLayout], ...Object.entries(LAYOUTS)]) {
    const first = render(fn, 8);
    const second = render(fn, 8);
    assert.deepEqual(first, second, `${key || "default"} is not deterministic`);
    for (const vars of first) {
      for (const [prop, value] of Object.entries(vars)) {
        assert.doesNotMatch(value, /NaN|Infinity|undefined/, `${key} ${prop}=${value}`);
      }
    }
  }
});

test("layouts stay finite from 1 to 40 documents", () => {
  for (const [key, fn] of Object.entries(LAYOUTS)) {
    for (const n of [1, 2, 3, 13, 40]) {
      for (const vars of render(fn, n)) {
        for (const value of Object.values(vars)) {
          assert.doesNotMatch(value, /NaN|Infinity|undefined/, `${key} n=${n}`);
        }
      }
    }
  }
});

test("helix places n=8 on a two-turn spiral (golden values)", () => {
  const vars = render(LAYOUTS.helix, 8);
  assert.deepEqual(vars[0], {
    "--tx": "300px",
    "--ty": "-320px",
    "--tz": "-200px",
    "--rot-x": "0deg",
    "--rot-y": "90deg",
    "--rot-z": "0deg",
  });
  assert.equal(vars[7]["--ty"], "320px");
  assert.equal(vars[7]["--tx"], "300px"); // 2 full turns → back to angle 0
});

test("default layout follows the live --stack-z scroll", () => {
  assert.deepEqual(placementToVars(defaultLayout(inputFor(3, 8))), {
    "--tx": "16px",
    "--ty": "16px",
    "--tz": "calc(-150px + var(--stack-z, 0px))",
  });
});

test("previously crashing branches now produce placements", () => {
  // lotus/tornado referenced undefined rotY/rotZ; accordion an undefined idx;
  // luminescence an undefined `tab`. Each threw inside _renderEchoes.
  assert.equal(placementToVars(LAYOUTS.lotus(inputFor(1, 8)))["--rot-y"], "0deg");
  assert.notEqual(placementToVars(LAYOUTS.tornado(inputFor(1, 8)))["--rot-y"], "0deg");
  assert.equal(placementToVars(LAYOUTS.accordion(inputFor(2, 8)))["--tx"], "80px");
  const glow = LAYOUTS.luminescence(
    layoutInput({ index: 0, count: 4, viewport: VIEWPORT, file: file(7, "a.py") }),
  );
  assert.equal(glow.vars?.["--glow-color"], "rgba(50, 205, 50, 0.8)");
});

test("seeded layouts are stable per document and differ across documents", () => {
  const at = (id) =>
    LAYOUTS.quantum(layoutInput({ index: 0, count: 8, viewport: VIEWPORT, file: file(id) }));
  assert.deepEqual(at(5), at(5));
  assert.notDeepEqual(at(5), at(6));
});

test("overlay vars cover explode + exposé for every echo", () => {
  const vars = overlayVars(inputFor(0, 4));
  assert.deepEqual(Object.keys(vars).sort(), [
    "--explode-x",
    "--explode-y",
    "--expose-tx",
    "--expose-ty",
  ]);
  assert.equal(vars["--explode-x"], "300px");
});

test("virtualization: 40 files → ≤12 cards, ≤8 colorized, rest stubs", () => {
  const plan = planEchoes(40);
  const cards = plan.filter((t) => t === "rich" || t === "card").length;
  assert.equal(ECHO_POOL_SIZE, 12);
  assert.ok(cards <= 12, `${cards} cards`);
  assert.ok(plan.filter((t) => t === "rich").length <= ECHO_RICH_COUNT);
  assert.deepEqual(plan.slice(0, 8), Array(8).fill("rich"));
  assert.equal(plan[11], "card");
  assert.equal(plan[12], "stub");
  assert.equal(plan.filter((t) => t === "stub").length, 28);
  // Stubs are capped too.
  assert.equal(planEchoes(200).filter((t) => t === "hidden").length, 200 - 12 - 48);
  assert.deepEqual(planEchoes(3), ["rich", "rich", "rich"]);
});

test("view-mode registry: unique values/names, every select option wired", () => {
  const values = VIEW_MODES.map((m) => m.value);
  const names = VIEW_MODES.map((m) => m.name);
  assert.equal(new Set(values).size, values.length);
  assert.equal(new Set(names).size, names.length);

  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const select = html.match(/<select id="view-mode-select"[\s\S]*?<\/select>/)?.[0] ?? "";
  const options = [...select.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(options.length > 70);
  for (const value of options) {
    assert.equal(typeof VIEW_MODE_TOGGLES[value], "string", `<option ${value}> unwired`);
  }
  assert.equal(VIEW_MODE_TOGGLES.cityscape, "toggleCityscapeView");
  assert.equal(VIEW_MODE_TOGGLES.quantum, "toggleQuantumSuperpositionView");
});

test("echo behavior defaults and overrides come from the registry", () => {
  assert.deepEqual(echoBehavior(""), { hover: "front", semanticGravity: true, tint: null });
  assert.deepEqual(echoBehavior("matrix-rain"), { hover: "pop", semanticGravity: false, tint: 120 });
  assert.equal(echoBehavior("orbit").hover, "orbit");
  assert.equal(getViewMode("stackdeck")?.bodyClass, "stack-deck-active");
});

test("applyViewMode prefers setViewMode and ignores unknown values", () => {
  const calls = [];
  const tm = { setViewMode: (v) => calls.push(v) };
  applyViewMode(tm, "orbit");
  applyViewMode(tm, "nope");
  applyViewMode(tm, "");
  assert.deepEqual(calls, ["orbit", "", ""]);
});

test("escapeHtml neutralizes markup in content and attributes", () => {
  const payload = `<img src=x onerror=alert(1)>"'&`;
  const escaped = escapeHtml(payload);
  assert.equal(escaped, "&lt;img src=x onerror=alert(1)&gt;&quot;&#39;&amp;");
  assert.doesNotMatch(escaped, /[<>"']/);
  assert.equal(escapeHtml(null), "");
});

test("sanitizer allowlists drop handlers, unknown attrs and foreign classes", () => {
  assert.equal(allowAttribute(MONACO_TOKENS_POLICY, "span", "onclick", "x"), null);
  assert.equal(allowAttribute(MONACO_TOKENS_POLICY, "span", "style", "x"), null);
  assert.equal(allowAttribute(MONACO_TOKENS_POLICY, "img", "src", "x"), null);
  assert.equal(allowAttribute(MONACO_TOKENS_POLICY, "span", "class", "mtk5 evil"), "mtk5");
  assert.equal(allowAttribute(MONACO_TOKENS_POLICY, "span", "class", "evil"), null);
  assert.equal(
    allowAttribute(MARKDOWN_POLICY, "div", "style", "padding-left: 32px"),
    "padding-left: 32px",
  );
  assert.equal(
    allowAttribute(MARKDOWN_POLICY, "div", "style", "background:url(javascript:x)"),
    null,
  );
  assert.equal(allowAttribute(MARKDOWN_POLICY, "input", "type", "image"), null);
  assert.equal(filterClassTokens("language-js x", MARKDOWN_POLICY.classToken), "language-js");
});
