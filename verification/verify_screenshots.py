from playwright.sync_api import sync_playwright
import time
import os

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173")

    # Wait for editor
    page.wait_for_selector(".monaco-editor", state="visible")
    time.sleep(2) # Stabilize

    # Disable animations for stability
    page.add_style_tag(content="""
        .note-card.floating { animation: none !important; }
        * { transition: none !important; }
    """)

    # 1. Default View
    page.screenshot(path="verification/1_default.png")

    # 2. Peek View (Alt)
    page.keyboard.down("Alt")
    time.sleep(0.5)
    page.screenshot(path="verification/2_peek.png")
    page.keyboard.up("Alt")
    time.sleep(0.5)

    # 3. Focus Depth 0.5 (Alt + Scroll)
    page.keyboard.down("Alt")
    # Scroll down -> Increase depth (0 -> 1)
    # 500 * 0.001 = 0.5
    page.mouse.wheel(0, 500)
    time.sleep(0.5)
    page.screenshot(path="verification/3_depth_0_5.png")

    # 4. Reference View (Depth 1.0)
    page.mouse.wheel(0, 500)
    time.sleep(0.5)
    page.screenshot(path="verification/4_depth_1_0.png")
    page.keyboard.up("Alt") # Should stick

    # 5. Collapsed Note Card
    # Locate a header in a note card
    header = page.locator(".note-card h1").first
    header.click(force=True) # Force just in case
    time.sleep(0.5)
    page.screenshot(path="verification/5_collapsed.png")

    browser.close()

with sync_playwright() as p:
    run(p)
