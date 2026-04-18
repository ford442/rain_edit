from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:4173")
        time.sleep(2) # Wait for load

        # Test default view Parallax effect
        # Move mouse to trigger parallax
        page.mouse.move(100, 100)
        time.sleep(1)

        page.screenshot(path="/home/jules/verification/post_parallax.png")

        # Enable Galaxy View
        page.select_option("#view-mode-select", value="galaxy")
        time.sleep(2)

        # Move mouse again to ensure parallax doesn't override Galaxy
        page.mouse.move(500, 500)
        time.sleep(1)

        page.screenshot(path="/home/jules/verification/post_galaxy_parallax.png")

        browser.close()

if __name__ == "__main__":
    run()
