from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Assuming the server is running on localhost:5173
    # If not, we might need to start it.
    try:
        page.goto("http://localhost:5173")
    except Exception as e:
        print(f"Failed to load page: {e}")
        return

    # Wait for editor to load
    page.wait_for_selector("#editor")

    page.on("console", lambda msg: print(f"BROWSER: {msg.text}"))

    print("Page loaded.")

    # 1. Verify X-Ray Mode
    print("Testing X-Ray Mode...")
    page.keyboard.down("Control")
    # Check if class is added
    is_active = page.eval_on_selector("#editor", "el => el.classList.contains('x-ray-active')")
    if is_active:
        print("PASS: X-Ray class added on Control down.")
    else:
        print("FAIL: X-Ray class NOT added.")

    page.keyboard.up("Control")
    is_active = page.eval_on_selector("#editor", "el => el.classList.contains('x-ray-active')")
    if not is_active:
        print("PASS: X-Ray class removed on Control up.")
    else:
        print("FAIL: X-Ray class NOT removed.")

    # 2. Verify Focus Depth (Alt Key)
    print("Testing Focus Depth...")
    initial_opacity = page.eval_on_selector("#editor", "el => getComputedStyle(el).opacity")
    print(f"Initial Opacity: {initial_opacity}")

    page.keyboard.down("Alt")
    # Wait a bit for transition? Logic is immediate set style, but CSS transition applies.
    # We check the style attribute or computed style.
    # The logic sets style.opacity directly.

    # We need to wait for JS to execute and transition to start/finish.
    page.wait_for_timeout(600)

    alt_opacity = page.eval_on_selector("#editor", "el => getComputedStyle(el).opacity")
    print(f"Alt Opacity: {alt_opacity}")

    if float(alt_opacity) < float(initial_opacity):
        print("PASS: Editor opacity decreased on Alt down.")
    else:
        print("FAIL: Editor opacity did not decrease.")

    # Test Scroll Adjustment
    print("Testing Focus Depth Scroll...")
    # Scroll up (negative deltaY) to decrease depth (increase opacity)?
    # Logic: userPreferredDepth += delta. deltaY > 0 is scroll down.
    # Scroll down -> increase depth -> decrease opacity.

    page.mouse.wheel(0, 100) # Scroll down
    page.wait_for_timeout(600)
    scrolled_opacity = page.eval_on_selector("#editor", "el => getComputedStyle(el).opacity")
    print(f"Scrolled Opacity: {scrolled_opacity}")

    if float(scrolled_opacity) < float(alt_opacity):
         print("PASS: Opacity decreased further on scroll down.")
    else:
         print(f"FAIL: Opacity did not decrease on scroll down (Old: {alt_opacity}, New: {scrolled_opacity})")

    page.keyboard.up("Alt")
    page.wait_for_timeout(600)
    final_opacity = page.eval_on_selector("#editor", "el => getComputedStyle(el).opacity")
    if float(final_opacity) > 0.9:
        print("PASS: Opacity restored on Alt up.")
    else:
        print(f"FAIL: Opacity not restored (Current: {final_opacity})")

    # 3. Verify List Parsing
    print("Testing List Parsing...")
    # Update text via reference input
    # Find reference input in dock
    # Dock might be collapsed? It starts expanded.

    # Note: reference-input ID exists.
    test_md = """# Test List
- Item 1
  - Indented Item
"""
    # JS update
    page.evaluate(f"document.getElementById('reference-input').value = `{test_md}`")
    page.evaluate("document.getElementById('reference-input').dispatchEvent(new Event('input'))")

    page.wait_for_timeout(500)

    # Check for .md-list-item
    items = page.locator(".md-list-item")
    count = items.count()
    print(f"Found {count} list items.")

    if count >= 1:
        print("PASS: List items rendered.")
        # Check indentation style
        first_padding = items.first.evaluate("el => el.style.paddingLeft")
        print(f"First item padding: {first_padding}")
        if "20px" in first_padding:
             print("PASS: Base indentation correct.")
    else:
        print("FAIL: No list items found.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
