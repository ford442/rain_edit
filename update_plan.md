1. **Refactor Tesseract View (Tone Down)**
   - Stop continuous rotation by removing `animation: tesseract-spin 20s linear infinite;` in `src/styles.css`.
   - Update `tesseract-active` styles to present a gentle isometric angle (`rotateX(30deg) rotateY(-45deg)`) as default instead of full spin.
   - Add mouse drag rotation functionality specifically for Tesseract mode in `src/main.js` (using `--tesseract-rot-x` and `--tesseract-rot-y` CSS vars).
   - Dim the main editor when Tesseract mode is active.
2. **Interactive Tesseract Overview Mode**
   - Add click handlers on `.echo-document` layers in `src/main.js` to bring a document forward when Tesseract mode is active (exiting the mode and activating that document).
   - Ensure 'Esc' exits Tesseract mode in `src/main.js`.
3. **Verify and Playwright Screenshot**
   - Take a screenshot of the updated Tesseract mode for verification.
4. **Pre-commit Steps & Submit**
   - Request code review, commit the changes and submit.
