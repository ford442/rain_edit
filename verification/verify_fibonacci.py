from playwright.sync_api import sync_playwright
import os
import glob

def run_cuj(page):
    print("Navigating to http://localhost:3000")
    page.goto("http://localhost:3000")
    page.wait_for_timeout(4000)

    print("Adding some documents to the view via double click")

    for i in range(5):
        page.mouse.dblclick(500, 500)
        page.wait_for_timeout(500)

    print("Selecting Fibonacci Spiral View")
    page.locator("#view-mode-select").select_option(value="fibonacci-spiral")
    page.wait_for_timeout(2000)

    print("Triggering Ripple Wave Reveal")
    page.keyboard.down("Alt")
    page.keyboard.press("r")
    page.keyboard.up("Alt")
    page.wait_for_timeout(500)

    page.mouse.move(300, 300)
    page.wait_for_timeout(500)
    page.mouse.move(500, 500)
    page.wait_for_timeout(500)
    page.mouse.move(800, 600)
    page.wait_for_timeout(500)

    os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
    page.screenshot(path="/home/jules/verification/screenshots/verification_fibonacci.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    os.makedirs("/home/jules/verification/videos", exist_ok=True)
    for f in glob.glob("/home/jules/verification/videos/*"):
        os.remove(f)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos",
            record_video_size={"width": 1280, "height": 720}
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
