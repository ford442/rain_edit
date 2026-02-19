import sys
from playwright.sync_api import sync_playwright

def run_verification():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:5173")
            page.wait_for_selector("#editor", timeout=5000)

            # Check for main elements
            assert page.is_visible("#rain-back")
            assert page.is_visible("#reference-layer")

            print("Basic UI elements verified.")

        except Exception as e:
            print(f"Verification failed: {e}")
            sys.exit(1)
        finally:
            browser.close()

if __name__ == "__main__":
    run_verification()
