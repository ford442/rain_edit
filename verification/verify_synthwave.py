from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:5173")

        # Wait for the main editor to be visible
        page.wait_for_selector("#editor", state="visible")

        # Enable neon synthwave lens mode using the keyboard shortcut
        page.keyboard.down("Alt")
        page.keyboard.down("Shift")
        page.keyboard.down("=")
        page.wait_for_timeout(1000)

        # Take a screenshot to inspect the updated layout, border-radius and shadows
        page.screenshot(path="verification/verification_synthwave.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
