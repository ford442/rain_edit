from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:3000")

    # Wait for the IDE to load
    page.wait_for_selector("#editor")
    time.sleep(2)

    # Create a couple of tabs if they don't exist

    # Hide atmospheric layers to clearly see the UI
    page.evaluate("""
        const hideLayers = ['#fog-layer', '#rain-front', '#vignette-layer', '#matrix-layer'];
        hideLayers.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.style.display = 'none';
        });
    """)

    time.sleep(1)
    page.screenshot(path="verification/my_ide_screenshot.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
