import sys
import os
import time
from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    try:
        page.goto("http://localhost:5173")
    except Exception as e:
        print(f"Error loading page: {e}")
        sys.exit(1)

    # Wait for the editor to load
    try:
        page.wait_for_selector(".monaco-editor", timeout=15000)
    except Exception as e:
        print(f"Error waiting for editor: {e}")
        page.screenshot(path="verification/error_load.png")
        sys.exit(1)

    print("Checking Dock Style...")
    # Verify Dock Style (border-radius)
    dock_style = page.eval_on_selector("#dock", "el => getComputedStyle(el).borderRadius")
    if dock_style != "24px":
        print(f"ERROR: Dock border-radius mismatch! Expected '24px', got: {dock_style}")
        sys.exit(1)
    print("Dock Style Verification Passed.")

    print("Checking Note Card Transform...")
    # Verify Note Card Transform (rotateX/rotateY)
    # First, ensure there are note cards
    try:
        page.wait_for_selector(".note-card", timeout=5000)
    except:
        print("No note cards found!")
        sys.exit(1)

    # Move mouse to center
    page.mouse.move(500, 500)
    time.sleep(0.5)

    # Get transform of first card
    transform = page.eval_on_selector(".note-card", "el => el.style.transform")
    print(f"Note Card Transform at center: {transform}")

    if "rotateX" not in transform or "rotateY" not in transform:
        print("ERROR: Note card transform does not contain rotateX/rotateY!")
        sys.exit(1)

    print("Note Card 3D Tilt Verification Passed.")

    print("Checking Typing Storm Logic...")
    # Simulate furious typing
    print("Simulating furious typing...")
    page.click(".monaco-editor")
    for _ in range(10):
        page.keyboard.type("The storm is coming! ")
        time.sleep(0.05)

    time.sleep(1)

    # Take screenshot of the storm
    page.screenshot(path="verification/innovations_storm.png")
    print("Storm verification screenshot saved.")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
