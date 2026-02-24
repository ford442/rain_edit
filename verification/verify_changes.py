from playwright.sync_api import sync_playwright
import time

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # Navigate to the app
        print("Navigating to app...")
        try:
            page.goto("http://localhost:5173/", timeout=60000)
            page.wait_for_load_state("networkidle")
        except Exception as e:
            print(f"Failed to load page: {e}")
            return

        # Wait for editor to be visible
        try:
            page.wait_for_selector(".monaco-editor", timeout=30000)
            print("Editor loaded.")
        except Exception as e:
            print(f"Editor did not load: {e}")
            page.screenshot(path="verification/error.png")
            return

        # 1. Verify Holo Comments
        print("Injecting code...")
        try:
            # Click editor to focus
            page.click(".monaco-editor")
            # Clear editor content
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")

            # Type code with various holo comments
            code = """
function test() {
  // BUG: This is a bug
  // WARN: This is a warning
  // INFO: This is info
  // HACK: This is a hack
  // TODO: Old todo
}
"""
            page.keyboard.type(code) # using type instead of insert_text to simulate user input
            print("Code injected.")
        except Exception as e:
            print(f"Failed to inject code: {e}")

        # Wait for HoloManager to update (debounced 500ms)
        page.wait_for_timeout(2000)

        # 2. Verify Reference Markdown
        print("Injecting markdown...")
        try:
            # Find the input area for markdown reference
            # Assuming there is an input with id 'reference-input' or similar based on previous context
            # If not, we might need to find where to type.
            # Let's try to find a textarea or input in the dock.

            # Based on memory, there might be a textarea for inputting notes.
            # If not, we might need to rely on the existing notes or check how to add a note.
            # Let's assume there is a textarea for adding a new note or modifying existing.
            # If `reference-input` exists, use it.
            if page.is_visible("#reference-input"):
                page.fill("#reference-input", "")
                markdown = """
# Test Table
| Col 1 | Col 2 |
| --- | --- |
| Val 1 | Val 2 |
| Val 3 | Val 4 |

> [!NOTE]
> This is a note callout.

> This is a normal blockquote.
"""
                page.fill("#reference-input", markdown)
                # Dispatch input event to trigger update if needed
                page.evaluate("document.getElementById('reference-input').dispatchEvent(new Event('input', { bubbles: true }))")
                print("Markdown injected.")
            else:
                print("Warning: #reference-input not found. Skipping markdown injection.")

        except Exception as e:
            print(f"Failed to inject markdown: {e}")

        # Wait for ReferenceManager to update
        page.wait_for_timeout(2000)

        # 3. Verify Splash (Click)
        print("Clicking for splash...")
        page.mouse.click(600, 400)

        # Wait a tiny bit for splash particles to spawn
        page.wait_for_timeout(100)

        # 4. Hide Fog and Rain for clear screenshot
        print("Hiding fog and rain layers...")
        page.evaluate("""
            const fog = document.getElementById('fog-layer');
            if (fog) fog.style.display = 'none';

            const rainFront = document.getElementById('rain-front');
            if (rainFront) rainFront.style.display = 'none';

            const vignette = document.getElementById('vignette-layer');
            if (vignette) vignette.style.display = 'none';
        """)

        # Take screenshot
        output_path = "verification/ui_verification.png"
        page.screenshot(path=output_path)
        print(f"Screenshot taken: {output_path}")

        browser.close()

if __name__ == "__main__":
    verify_ui()
