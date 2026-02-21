import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.set_viewport_size({"width": 1280, "height": 720})

    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

    print("Navigating to app...")
    page.goto("http://localhost:5173")

    # Wait for editor to load
    page.wait_for_selector(".monaco-editor")

    # Simulate mouse movement to clear fog
    print("Clearing fog...")
    for i in range(20):
        page.mouse.move(100 + i*50, 100 + i*20)
        time.sleep(0.05)

    # Wait for reference layer to populate
    page.wait_for_selector(".note-card")
    print("Note cards loaded.")

    # Click in editor to focus
    page.mouse.click(200, 100) # Click somewhere in the editor

    # Type 'layer'
    print("Typing keyword...")
    page.keyboard.type("layer")

    time.sleep(2) # Wait for draw

    # Take screenshot
    screenshot_path = "verification/focus_link_3.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
