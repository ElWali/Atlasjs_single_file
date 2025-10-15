import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        def handle_error(exc):
            print(f"PAGE ERROR: {exc.name}: {exc.message}")
            if exc.stack:
                print(exc.stack)

        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", handle_error)

        await page.goto("http://localhost:8000/A/demo.html")
        await page.wait_for_timeout(2000) # Give it some time to load everything
        await page.screenshot(path="jules-scratch/verification/verification.png")
        await browser.close()

asyncio.run(main())