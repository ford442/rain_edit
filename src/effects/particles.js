import * as app from "../appContext.js";

/**
 * Short-lived DOM particles: siphon packets, semantic sparks, and typing
 * particles. Each removes itself after its CSS animation finishes.
 */

/**
 * Data-siphon packet that flies from (startX, startY) to screen centre.
 * @param {string} text
 * @param {number} startX
 * @param {number} startY
 * @param {{ parent?: HTMLElement }} [deps]
 */
export function fireSiphonPacket(text, startX, startY, { parent = document.body } = {}) {
  const packet = document.createElement("div");
  packet.className = "siphon-packet";
  packet.textContent = text.length > 20 ? text.substring(0, 20) + "..." : text;
  packet.style.left = startX + "px";
  packet.style.top = startY + "px";

  // Centre of the screen approximates "sucked into the editor".
  packet.style.setProperty("--dx", window.innerWidth / 2 - startX + "px");
  packet.style.setProperty("--dy", window.innerHeight / 2 - startY + "px");

  parent.appendChild(packet);
  setTimeout(() => packet.remove(), 600);
}

/**
 * Spark that travels from an echo document toward the editor centre.
 * @param {number} startX
 * @param {number} startY
 * @param {{ echoLayerEl?: HTMLElement | null, editorEl?: HTMLElement | null }} [deps]
 */
export function spawnSemanticSpark(
  startX,
  startY,
  { echoLayerEl = app.echoLayerEl, editorEl = app.editorEl } = {},
) {
  if (!echoLayerEl || !editorEl) return;
  const spark = document.createElement("div");
  spark.className = "semantic-spark";
  spark.style.left = `${startX}px`;
  spark.style.top = `${startY}px`;

  const editorRect = editorEl.getBoundingClientRect();
  const endX = editorRect.left + editorRect.width / 2 + (Math.random() - 0.5) * 100;
  const endY = editorRect.top + editorRect.height / 2 + (Math.random() - 0.5) * 100;
  spark.style.setProperty("--tx", `${endX - startX}px`);
  spark.style.setProperty("--ty", `${endY - startY}px`);

  echoLayerEl.appendChild(spark);
  setTimeout(() => spark.remove(), 1000);
}

/**
 * Small particle burst emitted at the caret on each keystroke.
 * @param {number} x
 * @param {number} y
 * @param {{ echoLayerEl?: HTMLElement | null }} [deps]
 */
export function createTypingParticle(x, y, { echoLayerEl = app.echoLayerEl } = {}) {
  if (!echoLayerEl) return;
  const particle = document.createElement("div");
  particle.className = "typing-particle";
  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;
  particle.style.setProperty("--px", `${(Math.random() - 0.5) * 200}px`);
  particle.style.setProperty("--py", `${(Math.random() - 0.5) * 200}px`);

  const size = Math.random() * 4 + 2;
  particle.style.width = `${size}px`;
  particle.style.height = `${size}px`;

  echoLayerEl.appendChild(particle);
  setTimeout(() => particle.remove(), 800);
}
