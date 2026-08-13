import re

with open("src/styles_views.css", "r") as f:
    content = f.read()

# Enhance #z-slicer-ui
content = re.sub(
    r'(#z-slicer-ui \{.*?background: linear-gradient\().*?(\);)',
    r'\g<1>180deg, rgba(20, 30, 50, 0.75), rgba(5, 10, 20, 0.65)\g<2>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'(#z-slicer-ui \{.*?box-shadow:)\s*0 25px 60px rgba\(0, 0, 0, 0\.9\),\s*inset 0 0 25px rgba\(0, 255, 255, 0\.35\),\s*inset 0 1px 1px rgba\(255, 255, 255, 0\.1\);',
    r'\g<1>0 25px 60px rgba(0, 0, 0, 0.9), inset 0 0 35px rgba(0, 255, 255, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.2), 0 0 15px rgba(0, 255, 255, 0.2);',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'(#z-slicer-range::-webkit-slider-thumb \{.*?background: ).*?(;)',
    r'\g<1>linear-gradient(135deg, #00ffff, #0088ff)\g<2>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'(#z-slicer-range::-webkit-slider-thumb \{.*?box-shadow: ).*?(;)',
    r'\g<1>0 0 15px rgba(0, 255, 255, 0.9), 0 0 25px rgba(0, 136, 255, 0.6), inset 0 0 8px #fff\g<2>',
    content,
    flags=re.DOTALL
)

# Enhance .vps-action-btn
content = re.sub(
    r'(\.vps-action-btn \{.*?background: linear-gradient\().*?(\);)',
    r'\g<1>135deg, rgba(30, 40, 80, 0.9), rgba(15, 20, 45, 0.85)\g<2>',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'(\.vps-action-btn \{.*?box-shadow:)\s*0 8px 25px rgba\(0, 0, 0, 0\.6\),\s*inset 0 0 20px rgba\(0, 255, 255, 0\.15\);',
    r'\g<1>0 10px 30px rgba(0, 0, 0, 0.7), inset 0 0 25px rgba(0, 255, 255, 0.3), 0 0 12px rgba(0, 255, 255, 0.2);',
    content,
    flags=re.DOTALL
)
content = re.sub(
    r'(\.vps-action-btn:hover \{.*?background: linear-gradient\().*?(\);)',
    r'\g<1>135deg, rgba(40, 60, 100, 0.95), rgba(20, 30, 60, 0.9)\g<2>',
    content,
    flags=re.DOTALL
)

# Append new lens styles
new_styles = """
/* Neon Matrix Wireframe Lens */
.neon-matrix-wireframe-active #editor {
  -webkit-mask-image: linear-gradient(135deg, transparent 40%, black 45%, black 55%, transparent 60%);
  mask-image: linear-gradient(135deg, transparent 40%, black 45%, black 55%, transparent 60%);
  -webkit-mask-size: 20px 20px;
  mask-size: 20px 20px;
  opacity: 0.2;
}
body.neon-matrix-wireframe-active {
  background-color: #050505;
}
.neon-matrix-wireframe-active .echo-document {
  opacity: 0.9 !important;
  filter: none !important;
  background: transparent !important;
  border: 1px solid rgba(0, 255, 0, 0.8) !important;
  color: rgba(0, 255, 0, 0.8);
  box-shadow: 0 0 15px rgba(0, 255, 0, 0.4), inset 0 0 10px rgba(0, 255, 0, 0.2);
  transform: translate3d(
      calc(var(--tx, 0px) * 1.5),
      calc(var(--ty, 0px) * 1.5),
      calc(var(--tz, 0px) - var(--item-index, 0) * 100px)
    )
    rotateX(calc(var(--item-index, 0) * 5deg)) rotateY(calc(var(--item-index, 0) * -5deg)) !important;
}
.neon-matrix-wireframe-active .echo-document pre,
.neon-matrix-wireframe-active .echo-document .echo-header {
  color: rgba(0, 255, 0, 0.8) !important;
  text-shadow: 0 0 5px rgba(0, 255, 0, 0.5);
}

/* Fractal Dimension Lens */
.fractal-dimension-active #editor {
  -webkit-mask-image: conic-gradient(from 0deg at var(--lens-x, 50%) var(--lens-y, 50%), transparent 0deg, black 90deg, transparent 180deg, black 270deg, transparent 360deg);
  mask-image: conic-gradient(from 0deg at var(--lens-x, 50%) var(--lens-y, 50%), transparent 0deg, black 90deg, transparent 180deg, black 270deg, transparent 360deg);
  opacity: 0.15;
}
.fractal-dimension-active .echo-document {
  opacity: 0.85 !important;
  filter: hue-rotate(calc(var(--item-index, 0) * 45deg)) contrast(1.5) !important;
  transform: translate3d(
      calc(var(--tx, 0px) * (1 + var(--item-index, 0) * 0.1)),
      calc(var(--ty, 0px) * (1 + var(--item-index, 0) * 0.1)),
      calc(var(--tz, 0px) + calc(var(--item-index, 0) * 20px))
    )
    rotateZ(calc(var(--item-index, 0) * 15deg)) scale(calc(1 - var(--item-index, 0) * 0.05)) !important;
  box-shadow: 0 0 30px rgba(255, 0, 255, 0.3);
  border: 1px solid rgba(255, 0, 255, 0.4);
}

/* Astral Projection Lens */
.astral-projection-active #editor {
  -webkit-mask-image: radial-gradient(ellipse at var(--lens-x, 50%) var(--lens-y, 50%), transparent 20%, black 80%);
  mask-image: radial-gradient(ellipse at var(--lens-x, 50%) var(--lens-y, 50%), transparent 20%, black 80%);
  opacity: 0.3;
}
.astral-projection-active .echo-document {
  opacity: 0.8 !important;
  filter: drop-shadow(0 0 20px rgba(138, 43, 226, 0.8)) drop-shadow(0 0 40px rgba(255, 20, 147, 0.6)) brightness(1.2) !important;
  mix-blend-mode: screen;
  transform: translate3d(
      calc(var(--tx, 0px)),
      calc(var(--ty, 0px)),
      calc(var(--tz, 0px) + var(--item-index, 0) * 50px)
    )
    rotateX(10deg) scale(1.05) !important;
  background: rgba(20, 0, 40, 0.4) !important;
  border: 1px solid rgba(255, 20, 147, 0.5) !important;
}
@keyframes astral-float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-15px); }
}
.astral-projection-active .echo-document {
  animation: astral-float 4s ease-in-out infinite alternate;
}
"""

with open("src/styles_views.css", "w") as f:
    f.write(content + "\n" + new_styles)
