from playwright.sync_api import Page, expect, sync_playwright
import time
import re

def test_ghost_tabs(page: Page):
    page.goto("http://localhost:3000")

    # Wait for the editor to load
    page.wait_for_selector("#editor")
    time.sleep(2)

    # Instead of clicking the cabinet which might be unpredictable, let's inject a new file via the exposed tabManager
    page.evaluate('''() => {
        window.tabManager.addFile('ghost.js', '// background code running in the shadows\\n\\nfunction hidden() {\\n  return "secrets";\\n}', 'javascript');
        window.tabManager.setActive(2);
    }''')
    time.sleep(1)

    # Ensure we have multiple tabs
    tabs = page.locator(".tab-item")
    expect(tabs).to_have_count(2)

    # Hover over the inactive tab (the first one) to trigger the X-Ray Peek
    inactive_tab = tabs.first
    inactive_tab.hover()
    time.sleep(1) # Allow CSS transitions to apply

    # Verify the echo document has the peek class
    echo_doc = page.locator(".echo-document").first
    expect(echo_doc).to_have_class(re.compile(r"peek"))

    # Take a screenshot showing the peek effect
    page.screenshot(path="verification/ghost_tabs_peek.png")

    # Move mouse away to remove peek
    page.mouse.move(0, 0)
    time.sleep(1)

    # Verify normal state
    expect(echo_doc).not_to_have_class(re.compile(r"peek"))

    # Take another screenshot showing normal stack
    page.screenshot(path="verification/ghost_tabs_normal.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Use 720p resolution
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()
        try:
            test_ghost_tabs(page)
            print("Successfully ran ghost tabs verification script.")
        finally:
            browser.close()
