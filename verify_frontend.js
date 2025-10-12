const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to the local HTML file
    await page.goto('file://' + __dirname + '/Index.html', { waitUntil: 'networkidle' });

    // Wait for a specific element that indicates the map has loaded with tiles
    // We'll wait for a tile to be loaded. Tiles have the class 'atlas-tile-loaded'.
    await page.waitForSelector('.atlas-tile-loaded', { timeout: 30000 });

    // Give it an extra moment for rendering
    await page.waitForTimeout(2000);

    // Take a screenshot
    await page.screenshot({ path: 'screenshot.png' });

    console.log('Screenshot taken successfully.');

  } catch (error) {
    console.error('Error during frontend verification:', error);
    process.exit(1); // Exit with an error code
  } finally {
    await browser.close();
  }
})();