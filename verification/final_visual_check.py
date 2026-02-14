from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.set_viewport_size({"width": 1280, "height": 800})
    page.goto("http://localhost:5173")

    # Wait for app
    page.wait_for_selector("#app")

    # Set content with tasks and code
    text = """# New Features
- [ ] Incomplete Task
- [x] Completed Task

## Code Example
```javascript
const rain = new Rain();
rain.start();
```

## Spotlight
Double click this card to spotlight it.
"""
    # Pass text as argument to avoid template literal issues
    page.evaluate("""
        ([text]) => {
            const el = document.getElementById('reference-input');
            if (el) {
                el.value = text;
                el.dispatchEvent(new Event('input'));
            }
        }
    """, [text])

    # Show reference layer
    page.keyboard.down("Alt")
    time.sleep(2) # Wait for animation

    # Screenshot 1: Normal View with Tasks
    page.screenshot(path="verification/visual_1_tasks.png")

    # Trigger Spotlight on the first card
    # We need to find the card that contains "New Features" or just the first one.
    page.evaluate("""
        const cards = document.querySelectorAll('.note-card');
        const card = cards[0]; // Assuming first card
        if (card) {
            const event = new MouseEvent('dblclick', {
                'view': window,
                'bubbles': true,
                'cancelable': true
            });
            card.dispatchEvent(event);
        }
    """)
    time.sleep(2) # Wait for spotlight transition

    # Screenshot 2: Spotlight View
    page.screenshot(path="verification/visual_2_spotlight.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
