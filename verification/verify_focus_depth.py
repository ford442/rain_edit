from playwright.sync_api import sync_playwright
import time

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    page.goto("http://localhost:5173")

    # Wait for editor
    page.wait_for_selector(".monaco-editor", state="visible")
    time.sleep(2) # Wait for initial fade in

    # 1. Initial State: Editor Opacity should be high
    # Note: Opacity might be set by slider. Default is 1.
    editor_opacity = page.evaluate("document.getElementById('editor').style.opacity")
    print(f"Initial Opacity: {editor_opacity}")
    # If not set, it might be empty string which defaults to 1 in CSS computed style, but style.opacity is what we set.
    # updateFocusVisuals sets it immediately.
    if editor_opacity == "":
        editor_opacity = "1"

    assert float(editor_opacity) > 0.5, f"Editor should be visible initially, got {editor_opacity}"

    # 2. Trigger Alt Key (Peek Mode)
    page.keyboard.down("Alt")
    time.sleep(0.5)

    # Opacity should drop
    editor_opacity_peek = page.evaluate("document.getElementById('editor').style.opacity")
    print(f"Peek Opacity (Alt Down): {editor_opacity_peek}")
    assert float(editor_opacity_peek) < 0.2, f"Editor should fade out in Peek Mode, got {editor_opacity_peek}"

    # 3. Release Alt
    page.keyboard.up("Alt")
    time.sleep(0.5)

    editor_opacity_restored = page.evaluate("document.getElementById('editor').style.opacity")
    print(f"Restored Opacity: {editor_opacity_restored}")
    assert float(editor_opacity_restored) > 0.5, f"Editor should restore opacity, got {editor_opacity_restored}"

    # 4. Alt + Scroll (Manual Depth)
    page.keyboard.down("Alt")
    # Initial Alt Down sets depth to 1. Opacity ~0.02.
    # Scroll UP (negative deltaY) -> decrease depth -> increase opacity.
    # Playwright wheel(x, y). y is deltaY.
    page.mouse.wheel(0, -1000)
    time.sleep(1.0) # Give it time to animate/update

    editor_opacity_scroll = page.evaluate("document.getElementById('editor').style.opacity")
    print(f"Scrolled Opacity (Alt Down + Scroll Up): {editor_opacity_scroll}")

    # Should be higher than Peek Opacity
    # Peek Opacity is approx 0.02.
    # If we scroll back towards 0, opacity should rise.
    assert float(editor_opacity_scroll) > 0.1, f"Scrolling up should increase opacity, got {editor_opacity_scroll}"

    print("Verification Passed!")
    browser.close()

with sync_playwright() as p:
    run(p)
