from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        print("Navigating to app...")
        page.goto("http://localhost:3000")

        # Wait for editor to load
        page.wait_for_selector("#editor")

        # Verify Dock exists
        print("Verifying Dock...")
        dock = page.locator("#dock")
        expect(dock).to_be_visible()
        expect(dock).to_contain_text("RAIN EDIT")

        # Verify Fog Layer exists
        print("Verifying Fog Layer...")
        fog = page.locator("#fog-layer")
        # It might be visible but transparent, or just in DOM.
        # Since it has pointer-events: none and no content, just check attached.
        expect(fog).to_be_attached()

        # Verify Lightning Layer exists
        print("Verifying Lightning Layer...")
        lightning = page.locator("#lightning-layer")
        expect(lightning).to_be_attached()

        # Wait a bit for rain to initialize and things to settle
        time.sleep(2)

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/rain_ui_screenshot.png")

        browser.close()
        print("Done.")

if __name__ == "__main__":
    run()
