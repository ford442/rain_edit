import { LENSES, lensCssVars } from "./lenses/catalog.js";

/**
 * Registers every row of the lens catalog (`lenses/catalog.js`) as a hold
 * binding in the mutually exclusive "lens" group. While held, <body> carries
 * `data-lens="<id>"`, `data-lens-kind="<kind>"`, and the effect's CSS
 * variables; `src/styles/lenses.css` implements each kind.
 *
 * Do not register lenses anywhere else — add a catalog row instead.
 */
export function registerLensBindings(manager, { doc = document, lenses = LENSES } = {}) {
  const body = doc.body;

  for (const lens of lenses) {
    const vars = lensCssVars(lens.effect);
    manager.register({
      id: `lens:${lens.id}`, // namespaced: catalog ids never clash with gesture ids
      category: "lens",
      description: lens.description,
      combo: lens.combo,
      type: "hold",
      group: "lens",
      onDown: () => {
        body.dataset.lens = lens.id;
        body.dataset.lensKind = lens.effect.kind;
        for (const [k, v] of Object.entries(vars)) body.style?.setProperty(k, v);
        body.classList.add("loupe-active");
        const echoLayer = doc.getElementById?.("echo-layer");
        echoLayer?.querySelectorAll(".echo-document").forEach((el, idx) => {
          el.style.setProperty("--item-index", idx);
        });
      },
      onUp: () => {
        // Only clear if a newer lens hasn't already taken over.
        if (body.dataset.lens !== lens.id) return;
        delete body.dataset.lens;
        delete body.dataset.lensKind;
        for (const k of Object.keys(vars)) body.style?.removeProperty(k);
        body.classList.remove("loupe-active");
      },
    });
  }

  // Pointer tracking for cursor-centred kinds.
  if (typeof doc.addEventListener === "function") {
    doc.addEventListener("mousemove", (e) => {
      if (!body.dataset.lens) return;
      body.style.setProperty("--lens-x", `${e.clientX}px`);
      body.style.setProperty("--lens-y", `${e.clientY}px`);
    });
  }
}
