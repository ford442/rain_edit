import sys
import os
import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173")

    # Wait for the editor to load
    try:
        page.wait_for_selector(".monaco-editor", timeout=10000)
    except Exception as e:
        print(f"Error waiting for editor: {e}")
        # Take a screenshot for debugging
        page.screenshot(path="verification/error_screenshot.png")
        sys.exit(1)

    # Verify title
    try:
        title = page.inner_text(".dock-title")
        print(f"Dock Title: {title}")
        if "RAIN CONTROL" not in title:
            print("ERROR: Dock title mismatch! Expected 'RAIN CONTROL', got: ", title)
            sys.exit(1)
    except Exception as e:
        print(f"Error checking title: {e}")
        sys.exit(1)

    print("Title verification successful.")

    # Screenshot initial state
    page.screenshot(path="verification/final_check_initial.png")

    # Test reference toggle (Alt key)
    page.keyboard.down("Alt")
    time.sleep(1) # Wait for transition
    page.screenshot(path="verification/final_check_reference.png")
    page.keyboard.up("Alt")

    # Verify wiper effect logic (can't easily verify visually via script without image comparison,
    # but we can ensure no errors are thrown in console)
    page.on("console", lambda msg: print(f"Browser Console: {msg.text}"))

    # Type 'Enter' to trigger wiper
    page.keyboard.press("Enter")
    time.sleep(1)
    page.screenshot(path="verification/final_check_wiper.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
