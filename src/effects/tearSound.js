/**
 * Soft "fabric tear" sweep via Web Audio, played when the Alt+T fabric-tear
 * reveal starts. The AudioContext is created lazily on first use (always from
 * a key gesture), so boot no longer constructs a suspended context.
 */

/** @type {AudioContext | null} */
let audioCtx = null;

function getAudioContext() {
  if (audioCtx) return audioCtx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  audioCtx = new Ctor();
  return audioCtx;
}

export function playTearSound() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();

  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "square";
  osc.frequency.setValueAtTime(100, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(5000, ctx.currentTime);
  filter.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.3);

  osc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.3);
}
