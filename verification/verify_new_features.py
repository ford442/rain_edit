from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173")

    # Wait for editor
    page.wait_for_selector(".monaco-editor", timeout=10000)

    # 1. Verify Task List Parsing
    reference_input = page.locator("#reference-input")
    # Make sure dock is visible/interactable. Dock has z-index 20, should be fine.

    test_md = """# Test
- [ ] Todo item
- [x] Done item
"""
    # Fill input. This might be tricky if editor is capturing focus,
    # but the dock is fixed on top.
    reference_input.fill(test_md)
    reference_input.dispatch_event("input") # Ensure event fires

    time.sleep(1)

    # Check for checkboxes
    checkboxes = page.locator(".md-list-item input[type='checkbox']")
    count = checkboxes.count()
    print(f"Found {count} checkboxes")

    if count != 2:
        print("ERROR: Expected 2 checkboxes, found", count)
    else:
        print("Checkbox parsing verified.")

    # 2. Verify Spotlight
    # We need to access the reference layer.
    # Hold Alt to bring reference layer to front/disable editor pointer events
    page.keyboard.down("Alt")
    time.sleep(0.5) # Wait for transition

    card = page.locator(".note-card").first
    # Force click because the element might be moving (floating animation)
    # But dblclick should work.
    try:
        card.dblclick(force=True)
        print("Double clicked card.")
    except Exception as e:
        print(f"Double click failed: {e}")

    page.keyboard.up("Alt")
    time.sleep(0.5)

    # Check if it has 'spotlight' class
    # Spotlight class should persist even after releasing Alt?
    # The code adds the class to the element. It doesn't remove it on Alt up.

    classes = card.get_attribute("class")
    print(f"Card classes after dblclick: {classes}")

    if "spotlight" in classes:
        print("Spotlight class added successfully.")
    else:
        print("ERROR: Spotlight class NOT added.")

    # Take screenshot of spotlight
    # We need to hold Alt again to see it clearly or if spotlight brings it to front?
    # Spotlight makes z-index 100 !important. So it should be visible above editor?
    # Editor is z-index 2. So yes.
    page.screenshot(path="verification/spotlight_check.png")

    # 3. Rain Shield
    # Just verify no crash
    page.mouse.move(300, 300)

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
