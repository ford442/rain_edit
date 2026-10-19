with open("src/styles_echo/view-modes-dynamic.css", "a") as f:
    f.write("""

/* =========================================================
   ZENITH SPIRAL VIEW
   ========================================================= */
body.zenith-spiral-active #editor {
  transform: translateZ(-50px) scale(0.9);
  box-shadow: 0 0 50px rgba(128, 0, 255, 0.3), inset 0 0 20px rgba(128, 0, 255, 0.15);
  border-color: rgba(128, 0, 255, 0.4);
  transition: all 0.8s cubic-bezier(0.25, 1, 0.5, 1);
}

body.zenith-spiral-active #echo-layer {
  perspective: 2500px;
  transform-style: preserve-3d;
}

body.zenith-spiral-active .echo-document {
  transition: transform 1.2s cubic-bezier(0.19, 1, 0.22, 1),
              opacity 1.2s ease, filter 1.2s ease, box-shadow 0.6s ease;
  transform: translate3d(
      calc(var(--tx, 0px) + var(--part-tx, 0px) + var(--repel-tx, 0px) + var(--repulse-tx, 0px)),
      calc(var(--ty, 0px) + var(--part-ty, 0px) + var(--repel-ty, 0px) + var(--repulse-ty, 0px)),
      var(--tz, 0px)
    )
    rotateX(var(--rot-x, 0deg)) rotateY(var(--rot-y, 0deg)) rotateZ(var(--rot-z, 0deg));
  border: 1px solid rgba(128, 0, 255, 0.3);
  box-shadow: 0 0 25px rgba(128, 0, 255, 0.2);
  backdrop-filter: blur(calc(8px + (var(--item-index) * 2px))) saturate(120%);
  border-radius: var(--ui-radius-lg);
  opacity: calc(1 - (var(--item-index) * 0.08));
  filter: hue-rotate(calc(var(--item-index) * 20deg));
}

body.zenith-spiral-active .echo-document:hover {
  opacity: 1 !important;
  filter: hue-rotate(calc(var(--item-index) * 20deg)) brightness(1.3) !important;
  box-shadow: 0 0 50px rgba(128, 0, 255, 0.6), inset 0 0 20px rgba(128, 0, 255, 0.4);
  border-color: rgba(128, 0, 255, 0.9);
  transform: translate3d(
      calc(var(--tx, 0px) + var(--part-tx, 0px) + var(--repel-tx, 0px) + var(--repulse-tx, 0px)),
      calc(var(--ty, 0px) + var(--part-ty, 0px) + var(--repel-ty, 0px) + var(--repulse-ty, 0px)),
      calc(var(--tz, 0px) + 150px)
    )
    rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1.15) !important;
  z-index: 100 !important;
}
""")
