from playwright.sync_api import sync_playwright

def get_errors():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("pageerror", lambda err: print(f"Page error: {err}"))
        page.on("console", lambda msg: print(f"Console: {msg.text}"))

        page.goto("http://localhost:3000")
        page.wait_for_timeout(3000)

        browser.close()

if __name__ == "__main__":
    get_errors()
