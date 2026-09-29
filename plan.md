1. **Explore the current setup of lenses and interaction bindings**:
   - I will add a new lens feature called **Aurora Mirage Lens**, mapping to a free key combo `Alt + U` (verified it is untaken).
   - It will manipulate obscured `.echo-document` layers using CSS 3D transforms (`rotate3d`, `translateZ`), custom masking, and native CSS math (`sin`/`cos`) driven by `--item-index`.
2. **Update `src/interactions/lensBindings/groupC.js`**:
   - Register the new lens, assigning it to `Alt + U`.
   - Add `.loupe-active` and `.aurora-mirage-active` classes on `body`.
   - Update `--item-index` for `.echo-document` elements when active.
3. **Update CSS**:
   - Add the styling for `.aurora-mirage-active` in a new file `src/styles_14/extra-lenses-i.css`.
   - Define radial masks over the editor and advanced 3D transforms / blurs for `.echo-document` layers using `sin`/`cos` with `--item-index`.
   - Update `src/styles_ui.css` to `@import "./styles_14/extra-lenses-i.css";`.
4. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
5. **Submit changes**:
   - Submit code via the default submit command.
