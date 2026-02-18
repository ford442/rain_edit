from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.set_viewport_size({"width": 1280, "height": 720})

    try:
        page.goto("http://localhost:5173")
    except Exception as e:
        print(f"Failed to load page: {e}")
        return

    page.wait_for_selector("#editor")
    # Wait for rain/canvas to init
    time.sleep(2)

    # 1. Screenshot of Dock (Bottom Right)
    dock = page.locator("#dock")
    dock.hover() # Expand it
    time.sleep(0.5)
    page.screenshot(path="verification/screenshot_dock_expanded.png")
    print("Screenshot taken: Dock Expanded")

    # 2. Screenshot of Note Cards
    # Make sure reference layer is visible (Alt toggle not needed usually, visible by default?)
    # Reference text is populated.
    time.sleep(1)
    page.screenshot(path="verification/screenshot_notes.png")
    print("Screenshot taken: Notes")

    # 3. Screenshot of Sonar
    # Trigger Sonar: Shift double tap
    page.keyboard.press("Shift")
    page.keyboard.up("Shift")
    time.sleep(0.1)
    page.keyboard.press("Shift")
    page.keyboard.up("Shift")

    # Wait for animation to start (it's 1.5s total)
    time.sleep(0.5)
    page.screenshot(path="verification/screenshot_sonar.png")
    print("Screenshot taken: Sonar")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
