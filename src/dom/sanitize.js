// @ts-check
/**
 * HTML safety helpers. Untrusted strings (file names, remote file content,
 * StorageAPI notes, cabinet previews) must never reach `innerHTML` as markup.
 *
 * - Plain text: use `el.textContent = …` (default), or `escapeHtml()` when a
 *   string really has to be embedded in HTML.
 * - Markup we generate from untrusted input (Monaco `colorize()` output, the
 *   ReferenceManager markdown subset): parse it inertly with DOMParser and
 *   rebuild only allowlisted elements/attributes via `setSanitizedHtml()`.
 *
 * No dependency: the two markup shapes we render are tiny and fixed, so a
 * strict allowlist is smaller and stricter than a general sanitizer.
 */

/** @type {Readonly<Record<string, string>>} */
const ESCAPES = Object.freeze({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
});

/**
 * Escape text for HTML element content *and* quoted attribute values.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

/**
 * @typedef {object} SanitizePolicy
 * @property {Readonly<Record<string, readonly string[]>>} tags
 *   allowed tag → allowed attribute names
 * @property {RegExp} [classToken]  allowed tokens in `class`; others dropped
 * @property {(tag: string, name: string, value: string) => boolean} [attr]
 *   extra per-attribute check (after the allowlist)
 */

/** Elements whose *content* is dropped too (not just unwrapped). */
const DROP_WITH_CONTENT = new Set([
  "script", "style", "template", "iframe", "object", "embed", "noscript",
  "textarea", "title", "svg", "math", "frame", "frameset", "noembed",
]);

/** Monaco `editor.colorize()` output: tokenized spans + line breaks only. */
/** @type {SanitizePolicy} */
export const MONACO_TOKENS_POLICY = Object.freeze({
  tags: Object.freeze({ div: ["class"], span: ["class"], br: [] }),
  classToken: /^(?:mtk\d+|mtk[biuts]|monaco-tokenized-source)$/,
});

/** ReferenceManager's markdown subset (see ReferenceManager.parseMarkdown). */
/** @type {SanitizePolicy} */
export const MARKDOWN_POLICY = Object.freeze({
  tags: Object.freeze({
    h1: [], h2: [], h3: [], b: [], br: [], pre: [], blockquote: [],
    code: ["class"],
    div: ["class", "style"],
    table: ["class"], thead: [], tbody: [], tr: [], th: [], td: [],
    input: ["type", "checked", "disabled"],
    // Monaco tokens inside highlighted code blocks
    span: ["class"],
  }),
  classToken:
    /^(?:md-table|md-list-item|checked|callout|note|warn|info|language-[\w-]+|mtk\d+|mtk[biuts]|monaco-tokenized-source)$/,
  attr: (tag, name, value) => {
    if (name === "style") return /^padding-left: ?\d{1,4}px;?$/.test(value);
    if (tag === "input" && name === "type") return value === "checkbox";
    return true;
  },
});

/**
 * Keep only allowed class tokens.
 * @param {string} value
 * @param {RegExp | undefined} token
 * @returns {string}
 */
export function filterClassTokens(value, token) {
  if (!token) return "";
  return value
    .split(/\s+/)
    .filter((t) => t && token.test(t))
    .join(" ");
}

/**
 * Decide whether one attribute survives. Pure (Node-testable).
 * @param {SanitizePolicy} policy
 * @param {string} tag   lower-case tag name
 * @param {string} name  lower-case attribute name
 * @param {string} value
 * @returns {string | null} the value to write, or null to drop
 */
export function allowAttribute(policy, tag, name, value) {
  const allowed = policy.tags[tag];
  if (!allowed || !allowed.includes(name)) return null;
  if (name.startsWith("on")) return null;
  let out = value;
  if (name === "class") {
    out = filterClassTokens(value, policy.classToken);
    if (!out) return null;
  }
  if (policy.attr && !policy.attr(tag, name, out)) return null;
  return out;
}

/**
 * Parse `html` inertly and rebuild it from allowlisted nodes only.
 * Disallowed elements are unwrapped (their text survives as text); script-like
 * containers are dropped with their content. Attributes are re-created, never
 * copied wholesale, so event handlers / `href` / `src` cannot survive.
 *
 * @param {string} html
 * @param {SanitizePolicy} policy
 * @param {Document} [doc]  target document for the new nodes
 * @returns {DocumentFragment}
 */
export function sanitizeToFragment(html, policy, doc = document) {
  const parsed = new DOMParser().parseFromString(
    `<!doctype html><body>${html}`,
    "text/html",
  );
  const frag = doc.createDocumentFragment();
  copyAllowed(parsed.body, frag, policy, doc);
  return frag;
}

/**
 * @param {Node} from
 * @param {Node} to
 * @param {SanitizePolicy} policy
 * @param {Document} doc
 */
function copyAllowed(from, to, policy, doc) {
  for (const node of Array.from(from.childNodes)) {
    if (node.nodeType === 3) {
      to.appendChild(doc.createTextNode(node.nodeValue ?? ""));
      continue;
    }
    if (node.nodeType !== 1) continue; // comments, PIs
    const el = /** @type {Element} */ (node);
    const tag = el.localName;
    if (DROP_WITH_CONTENT.has(tag)) continue;
    if (!policy.tags[tag]) {
      copyAllowed(el, to, policy, doc); // unwrap
      continue;
    }
    const clean = doc.createElement(tag);
    for (const attr of Array.from(el.attributes)) {
      const value = allowAttribute(policy, tag, attr.name.toLowerCase(), attr.value);
      if (value !== null) clean.setAttribute(attr.name.toLowerCase(), value);
    }
    copyAllowed(el, clean, policy, doc);
    to.appendChild(clean);
  }
}

/**
 * Replace `el`'s children with a sanitized rendering of `html`.
 * @param {Element} el
 * @param {string} html
 * @param {SanitizePolicy} policy
 */
export function setSanitizedHtml(el, html, policy) {
  el.replaceChildren(sanitizeToFragment(html, policy, el.ownerDocument));
}

/**
 * Render Monaco `colorize()` output into `el` as DOM tokens (no innerHTML).
 * @param {Element} el
 * @param {string} html
 */
export function setColorizedHtml(el, html) {
  setSanitizedHtml(el, html, MONACO_TOKENS_POLICY);
}
