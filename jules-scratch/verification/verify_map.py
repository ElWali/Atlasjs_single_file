from playwright.sync_api import sync_playwright
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Get the absolute path to Index.html
        html_file_path = os.path.abspath('Index.html')

        # Navigate to the local HTML file
        page.goto(f'file://{html_file_path}')

        # Wait for the map to load
        page.wait_for_selector('.atlas-tile-loaded')

        # Wait for the marker to appear
        page.wait_for_selector('.atlas-marker-icon')

        # Take a screenshot
        page.screenshot(path='jules-scratch/verification/verification.png')

        browser.close()

if __name__ == '__main__':
    run()