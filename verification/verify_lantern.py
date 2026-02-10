import sys
import os
import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    try:
        page.goto("http://localhost:5173")
    except Exception as e:
        print(f"Error loading page: {e}")
        sys.exit(1)

    # Wait for the editor to load
    try:
        page.wait_for_selector(".monaco-editor", timeout=10000)
    except Exception as e:
        print(f"Error waiting for editor: {e}")
        page.screenshot(path="verification/error_screenshot.png")
        sys.exit(1)

    print("Editor loaded.")

    # Check for Reference Overlay
    overlay = page.query_selector("#reference-overlay")
    if overlay:
        print("Reference Overlay found.")
    else:
        print("ERROR: Reference Overlay NOT found!")
        sys.exit(1)

    # Check for Lantern Toggle
    lantern_toggle = page.query_selector("#lantern-mode")
    if lantern_toggle:
        print("Lantern Toggle found.")
    else:
        print("ERROR: Lantern Toggle NOT found!")
        sys.exit(1)

    # Check for Ghost Mode Toggle
    ghost_toggle = page.query_selector("#ghost-mode")
    if ghost_toggle:
        print("Ghost Mode Toggle found.")
    else:
        print("ERROR: Ghost Mode Toggle NOT found!")
        sys.exit(1)

    # Take screenshot of default state (Lantern Active)
    time.sleep(1)
    page.screenshot(path="verification/lantern_active.png")

    # Toggle Lantern Mode OFF
    lantern_toggle.check() # It is checked by default, so uncheck? No, check() ensures it is checked. uncheck() ensures unchecked.
    # It is checked by default. So verify that.
    is_checked = page.is_checked("#lantern-mode")
    if not is_checked:
        print("ERROR: Lantern Mode should be checked by default.")
        # sys.exit(1) # soft fail

    # Uncheck to disable lantern
    lantern_toggle.uncheck()
    time.sleep(0.5)
    page.screenshot(path="verification/lantern_inactive.png")

    # Check if overlay class changed (implementation detail: we add/remove classes or just change logic)
    # ReferenceManager.js uses classList.add('lantern-inactive')
    overlay_class = overlay.get_attribute("class")
    if "lantern-inactive" in overlay_class:
        print("Lantern Inactive class applied successfully.")
    else:
        print(f"ERROR: Expected 'lantern-inactive' class on overlay, got: {overlay_class}")

    # Test Alt Key (Reference Mode)
    page.keyboard.down("Alt")
    time.sleep(2)
    # Overlay should be hidden (opacity 0)
    opacity = overlay.evaluate("el => getComputedStyle(el).opacity")
    if float(opacity) < 0.05:
        print(f"Reference Overlay hidden correctly in Reference Mode. (Opacity: {opacity})")
    else:
        print(f"ERROR: Reference Overlay opacity should be 0, got {opacity}")

    page.screenshot(path="verification/reference_mode.png")
    page.keyboard.up("Alt")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
