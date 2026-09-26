1. **Improve IDE look and feel**:
   - Refine `src/styles_base.css` to enhance the premium glassmorphism vibe across the UI (e.g. deeper blurs, enhanced shadows, modernized scrollbars).
   - Update `src/styles_base/shell-and-editor.css`, `src/styles_base/tabs-container.css`, and `src/styles_base/dock-ui.css` as necessary to create a cohesive premium aesthetic.
2. **Innovate new features taking advantage of obscured documents**:
   - Implement three new interactive lenses targeting partially obscured `.echo-document` layers, specifically requested by the memory guidelines:
     - "Aura Resonance Lens" (Ctrl+Alt+Shift+H)
     - "Prismatic Spiral Lens" (Ctrl+Alt+Shift+J)
     - "Ethereal Drift Lens" (Ctrl+Alt+Shift+K)
   - Register these lenses in `src/interactions/lensBindings/groupC.js`.
   - Add styles for these lenses in a new file `src/styles_14/extra-lenses-h.css` utilizing custom CSS properties and native CSS math functions like `sin()` and `cos()`.
   - Import the new CSS file into `src/styles_ui.css`.
3. **Complete pre commit steps to ensure proper testing, verification, review, and reflection are done.**
4. **Submit changes** with a descriptive commit.
