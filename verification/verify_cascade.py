from playwright.sync_api import sync_playwright
import time

def verify_cascade():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        print("Navigating to app...")
        page.goto("http://localhost:3000")

        # Wait for the editor to load
        print("Waiting for editor...")
        page.wait_for_selector("#editor")
        time.sleep(2) # Allow animations to settle

        # Wait for tabManager to be available
        page.wait_for_function("window.tabManager !== undefined")

        print("Taking initial screenshot...")
        page.screenshot(path="verification/cascade_view_initial.png")

        print("Clicking Cascade View button...")
        page.click("#btn-cascade-view")
        time.sleep(1) # Allow transition

        print("Taking cascade view screenshot...")
        page.screenshot(path="verification/cascade_view_active.png")

        # Check for CSS class
        is_cascade_active = page.evaluate("document.body.classList.contains('cascade-active')")
        if is_cascade_active:
             print("✅ Cascade View active")
        else:
             print("❌ Cascade View failed")

        # Create a new file so the previous one goes into echo
        print("Creating a new file...")
        page.evaluate("window.tabManager.addFile('second.js', '// Second file content\\nconst test = 123;');")
        page.evaluate("window.tabManager.setActive(2);")
        time.sleep(1)

        # Click editor and type to trigger Semantic Resonance
        print("Typing in editor to trigger Semantic Resonance...")
        page.click(".monaco-editor")
        page.keyboard.type("console")
        time.sleep(1) # Allow resonance to trigger

        print("Taking semantic resonance screenshot...")
        page.screenshot(path="verification/cascade_view_resonance.png")

        # Check if resonance hit class exists
        echo_docs = page.locator(".echo-document")
        hit_count = page.locator(".echo-document.resonance-hit").count()
        print(f"Found {hit_count} resonance hits out of {echo_docs.count()} echo documents.")

        if hit_count > 0:
             print("✅ Semantic Resonance verified")
        else:
             print("❌ Semantic Resonance verification failed")

        browser.close()

if __name__ == "__main__":
    verify_cascade()
