1. **Analyze the Request**:
   The prompt specifically says:
   "wire the existing cascading-depth and holographic-cylinder layouts in echoLayouts.js (~L285, ~L1990) via viewModes.js toggles, TabManager flags, _deactivateAllViews cleanup, main_init_2.js and sessionSchema.js VIEW_MODE_TOGGLES. Make sure the quantum-superposition-active cleanup PR is its own PR."

   Okay, let's fix the duplicates in `_deactivateAllViews()` in `src/tabManager/viewModes.js`.
   There are duplicated lines:
   ```javascript
   this.isCascadingDepthView = false;
   this.isHolographicCylinderView = false;
   ```
   and in the `classList.remove`:
   ```javascript
   "cascading-depth-active",
   "holographic-cylinder-active",
   ```

   Let's also add `cascading-depth` and `holographic-cylinder` to `VIEW_MODE_BODY_CLASS` in `src/workspace/sessionSchema.js`.

   Then, we need to create a separate branch for the `quantum-superposition-active` cleanup.
   For `quantum-superposition-active`, in `toggleQuantumSuperpositionView()`, the `!document.body.classList.contains` logic should be replaced with `const wasActive = this.isQuantumSuperpositionView;`. Also, `"quantum-superposition-active"` is MISSING from `classList.remove` in `_deactivateAllViews()`, so it never gets removed when switching to another view! That's the bug.

   Let's first create the `fix/wire-cascading-holographic` branch, make the changes, run tests, and submit it.
   Then we'll switch back to `main`, create `fix/quantum-superposition-cleanup`, fix the bug, run tests, and submit.
