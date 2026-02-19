from playwright.sync_api import sync_playwright
import time

def verify_visuals():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()

        # Navigate
        page.goto("http://localhost:5173")
        page.wait_for_timeout(5000) # Wait for initial animations and rain

        # Screenshot 1: Basic UI with Cards and Connections
        # We need to make sure there are multiple cards for connections to appear
        # The default text has sections, so ReferenceManager should create cards.
        page.screenshot(path="verification/ui_overview.png")
        print("Captured ui_overview.png")

        # Screenshot 2: Portal Effect
        # Type a portal comment into the editor
        # Monaco editor content is editable via keyboard or JS
        # We'll use JS to set value to ensure it's fast and reliable
        # But we need to keep existing content to have some context?
        # Let's just append it.

        # Wait for editor to be ready (it's initialized in main.js)
        # We can try to type.
        page.click("#editor")
        page.keyboard.press("Control+End")
        page.keyboard.type("\n\n// @portal\n// Look here!")

        page.wait_for_timeout(2000) # Wait for updatePortals to fire

        page.screenshot(path="verification/portal_effect.png")
        print("Captured portal_effect.png")

        # Screenshot 3: Note Card Hover
        # Find a note card
        card = page.locator(".note-card").first
        if card.count() > 0:
            # Move mouse to trigger hover style and maybe connections update
            card.hover()
            page.wait_for_timeout(1000)
            page.screenshot(path="verification/card_hover.png")
            print("Captured card_hover.png")
        else:
            print("No note cards found!")

        browser.close()

if __name__ == "__main__":
    verify_visuals()
