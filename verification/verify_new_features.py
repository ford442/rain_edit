from playwright.sync_api import sync_playwright

def verify_features():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:5173/", timeout=60000)
        page.wait_for_load_state("networkidle")

        # Wait for editor to load
        page.wait_for_selector(".monaco-editor", timeout=30000)

        # 1. Inject code with keywords to trigger ConnectionManager
        print("Injecting code...")
        page.click(".monaco-editor")
        page.keyboard.press("Control+A")
        page.keyboard.press("Backspace")

        # Let's type something that matches words in the default reference notes
        # "confetti" and "sky" are in the default note
        code = """
function test() {
  console.log("confetti sky");
}
"""
        page.keyboard.type(code)

        # 2. Trigger Semantic Magnifier (Lens Mode)
        print("Triggering Lens Mode...")
        # Press Shift+Alt
        page.keyboard.down("Shift")
        page.keyboard.down("Alt")

        # Move mouse near the center where the reference notes are
        page.mouse.move(640, 400)
        page.wait_for_timeout(1000) # Wait for animation/lens to settle

        # 3. Take screenshot
        print("Taking screenshot...")
        # Hide fog/rain layers for better visibility
        page.evaluate("""
            const fog = document.getElementById('fog-layer');
            if (fog) fog.style.display = 'none';

            const rainFront = document.getElementById('rain-front');
            if (rainFront) rainFront.style.display = 'none';

            const vignette = document.getElementById('vignette-layer');
            if (vignette) vignette.style.display = 'none';
        """)

        page.screenshot(path="verification/semantic_magnifier.png")
        print("Screenshot taken: verification/semantic_magnifier.png")

        # Release keys
        page.keyboard.up("Alt")
        page.keyboard.up("Shift")

        browser.close()

if __name__ == "__main__":
    verify_features()
