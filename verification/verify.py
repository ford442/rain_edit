from playwright.sync_api import sync_playwright
import time

def verify_expose_mode():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to app
        page.goto("http://localhost:3000/")

        # Wait for initialization
        page.wait_for_timeout(2000)

        # Hide atmospheric layers as per memory instructions
        page.evaluate("""
            document.getElementById('fog-layer').style.display = 'none';
            document.getElementById('rain-front').style.display = 'none';
            document.getElementById('vignette-layer').style.display = 'none';
            document.getElementById('matrix-layer').style.display = 'none';
        """)

        # Add a few files to create echo documents
        page.evaluate("""
            tabManager.addFile('file1.js', 'console.log("1");', 'javascript');
            tabManager.addFile('file2.js', 'console.log("2");', 'javascript');
            tabManager.addFile('file3.js', 'console.log("3");', 'javascript');
            tabManager.addFile('file4.js', 'console.log("4");', 'javascript');
            tabManager.addFile('file5.js', 'console.log("5");', 'javascript');
            tabManager.addFile('file6.js', 'console.log("6");', 'javascript');
            tabManager.setActive(1); // Set main.js as active, making others echoes
        """)

        page.wait_for_timeout(1000)

        # Take a screenshot before Expose mode
        page.screenshot(path="/home/jules/verification/before_expose.png")

        # Click the Expose Mode toggle in the dock
        page.evaluate("""
            document.getElementById('expose-mode').click();
        """)

        # Wait for animation
        page.wait_for_timeout(1000)

        # Take a screenshot after Expose mode
        page.screenshot(path="/home/jules/verification/after_expose.png")

        # Hover over one of the echoes to show peek effect
        page.evaluate("""
            const echoes = document.querySelectorAll('.echo-document');
            if (echoes.length > 0) {
                const rect = echoes[0].getBoundingClientRect();
                const x = rect.left + rect.width / 2;
                const y = rect.top + rect.height / 2;

                // Simulate mouse enter for hover effect
                const event = new MouseEvent('mouseenter', {
                    view: window,
                    bubbles: true,
                    cancelable: true,
                    clientX: x,
                    clientY: y
                });
                echoes[0].dispatchEvent(event);
            }
        """)

        page.wait_for_timeout(500)

        # Take a screenshot of hover state
        page.screenshot(path="/home/jules/verification/expose_hover.png")

        browser.close()

if __name__ == "__main__":
    verify_expose_mode()
