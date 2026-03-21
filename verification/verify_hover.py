from playwright.sync_api import sync_playwright

def verify_hover():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/video",
            viewport={"width": 1280, "height": 720}
        )
        page = context.new_page()

        print("Navigating to local server...")
        page.goto("http://localhost:3001")
        page.wait_for_timeout(2000)

        # Let's interact with the UI to spawn files if JS evaluation isn't creating them correctly.
        print("Creating documents via API and UI interaction...")
        page.evaluate("""
            window.tabManager.addFile('sys_config.json', '{\\n  "status": "online"\\n}');
            window.tabManager.addFile('main_loop.js', 'while(true) {\\n  run();\\n}');
            window.tabManager.addFile('styles.css', 'body {\\n  color: red;\\n}');
        """)
        page.wait_for_timeout(1000)

        # Find the tabs to click
        tabs = page.locator(".tab-item")
        print(f"Found {tabs.count()} tabs")

        # Click the first tab to make it active, putting others in echo layer
        if tabs.count() > 0:
            tabs.nth(0).click()
            page.wait_for_timeout(1000)

        # Ensure we have echo documents
        echo_docs = page.locator(".echo-document")
        count = echo_docs.count()
        print(f"Found {count} echo documents")

        if count > 0:
            # Hide the weather/atmosphere layers to see clearly
            page.evaluate("""
                document.getElementById('fog-layer').style.display = 'none';
                document.getElementById('rain-front').style.display = 'none';
                document.getElementById('vignette-layer').style.display = 'none';
                document.getElementById('matrix-layer').style.display = 'none';
            """)
            page.wait_for_timeout(500)

            print("Hovering over the first echo document...")

            # Use mouse movement instead of Playwright hover, just to be sure we hit the CSS
            box = echo_docs.nth(0).bounding_box()
            if box:
                page.mouse.move(box["x"] + box["width"]/2, box["y"] + box["height"]/2)
                page.wait_for_timeout(1000)

            page.screenshot(path="/home/jules/verification/verification.png")
            print("Screenshot saved to /home/jules/verification/verification.png")

            # Move mouse away to show un-hovered state
            page.mouse.move(0, 0)
            page.wait_for_timeout(1000)

            # Hover over another echo doc
            if count > 1:
                box2 = echo_docs.nth(1).bounding_box()
                if box2:
                    page.mouse.move(box2["x"] + box2["width"]/2, box2["y"] + box2["height"]/2)
                    page.wait_for_timeout(1000)

        else:
            print("No echo documents found!")

        context.close()
        browser.close()

if __name__ == "__main__":
    verify_hover()
