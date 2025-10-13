from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto('file:///app/Index.html')
    page.wait_for_timeout(15000) # wait for 15 seconds
    print(page.content())
    expect(page.locator("#map")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/verification.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)