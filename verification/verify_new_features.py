import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        # Ensure the viewport is large enough
        await page.set_viewport_size({"width": 1280, "height": 720})

        # Load the app
        await page.goto("http://localhost:5173")

        # Wait for the app to load
        await page.wait_for_selector("#app")

        # Directly set the value using JS
        text = """# Note 1
This is the first note.

# Note 2
This is the second note.
It should be somewhere else.

# Note 3
And a third note here.
"""
        await page.evaluate(f"""
            const el = document.getElementById('reference-input');
            el.value = `{text}`;
            el.dispatchEvent(new Event('input'));
        """)

        # Show the reference layer (hold Alt)
        await page.keyboard.down("Alt")
        await page.wait_for_timeout(1000) # Wait for fade in/transition
        await page.screenshot(path="verification/6_multiple_notes.png")
        await page.keyboard.up("Alt")

        print("Verification complete. Check verification/6_multiple_notes.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
