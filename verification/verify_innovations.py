from playwright.sync_api import sync_playwright

def verify_innovations():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("Navigating to app...")
        try:
            page.goto("http://localhost:5173/", timeout=60000)
            page.wait_for_load_state("networkidle")
            # Wait for reference input to be available
            page.wait_for_selector("#reference-input", timeout=30000)
        except Exception as e:
            print(f"Failed to load: {e}")
            return

        # 1. Verify Editor Grid
        print("Verifying Editor Grid...")
        # Check computed style for background-image
        bg_image = page.evaluate("window.getComputedStyle(document.getElementById('editor')).backgroundImage")
        if "radial-gradient" in bg_image:
            print("PASS: Editor has radial-gradient background.")
        else:
            print(f"FAIL: Editor background is {bg_image}")

        # 2. Verify Semantic Layers
        print("Verifying Semantic Layers...")
        # Inject markdown with tags on separate cards
        page.evaluate("""
            const rm = document.querySelector('#reference-input');
            if (rm) {
                rm.value = "# Bug Note\\n#bug This is a bug note.\\n---\\n# Todo Note\\n#todo This is a todo note.";
                rm.dispatchEvent(new Event('input'));
            }
        """)
        page.wait_for_timeout(2000) # Wait for update

        # Check for cards with tags
        # We need to find the specific card that has the tag, not just any card if multiple exist (which they do)
        bug_cards = page.locator(".note-card[data-tags*='#bug']")
        todo_cards = page.locator(".note-card[data-tags*='#todo']")

        if bug_cards.count() > 0:
            print(f"Found {bug_cards.count()} bug cards.")
            # Check style of the first bug card found
            bug_card = bug_cards.first
            border_color = bug_card.evaluate("el => window.getComputedStyle(el).borderColor")
            print(f"Bug card border color: {border_color}")
            # rgba(255, 50, 50, 0.4) is roughly rgb(255, 50, 50)
            if "255, 50, 50" in border_color:
                 print("PASS: Bug card has red border.")
            else:
                 print("FAIL: Bug card border color incorrect.")
        else:
            print("FAIL: No note card with #bug tag found.")

        if todo_cards.count() > 0:
            print(f"Found {todo_cards.count()} todo cards.")
            todo_card = todo_cards.first
            border_color = todo_card.evaluate("el => window.getComputedStyle(el).borderColor")
            print(f"Todo card border color: {border_color}")
            if "255, 200, 50" in border_color:
                print("PASS: Todo card has yellow border.")
            else:
                print("FAIL: Todo card border color incorrect.")

        else:
            print("FAIL: No note card with #todo tag found.")

        # 3. Verify Lantern Beam
        print("Verifying Lantern Beam...")
        # Check computed style of pseudo-element
        content = page.evaluate("window.getComputedStyle(document.getElementById('reference-overlay'), '::before').content")
        if content != 'none':
             print("PASS: #reference-overlay::before exists.")
        else:
             print("FAIL: #reference-overlay::before content is none.")

        page.screenshot(path="verification/innovations_storm.png")
        print("Screenshot saved.")

        browser.close()

if __name__ == "__main__":
    verify_innovations()
