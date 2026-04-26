import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        page.goto("http://localhost:4173")

        # Wait for the app to load
        page.wait_for_selector("#app")

        # Add files so they become background echoes
        page.evaluate("""
            window.tabManager.addFile('test1.js', 'console.log("hello");');
            window.tabManager.addFile('test2.md', '# test 2\\nhello 2');
            window.tabManager.addFile('test3.css', 'body { color: red; }');
            window.tabManager.setActive(1); // Set main.js back to active so others are echoes
        """)

        time.sleep(1) # wait for echoes to render

        # Take base screenshot
        page.screenshot(path="/home/jules/verification/base.png")

        # Simulate holding Meta+Shift to trigger magnifier mode
        page.keyboard.down('Meta')
        page.keyboard.down('Shift')

        # Find a background echo document
        # Instead of locator hover, let's dispatch mouse events to trigger main.js logic

        page.mouse.move(600, 400) # Move to center-ish where an echo might be

        time.sleep(1) # Wait for animation
        page.screenshot(path="/home/jules/verification/verification.png")

        # Let's see if loupe-active was added
        has_loupe = page.evaluate("document.querySelectorAll('.loupe-active').length > 0")
        print(f"Loupe Active applied: {has_loupe}")

        page.keyboard.up('Shift')
        page.keyboard.up('Meta')

        browser.close()

if __name__ == "__main__":
    import os
    os.makedirs("/home/jules/verification", exist_ok=True)
    run()
