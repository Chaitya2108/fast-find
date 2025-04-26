// node --experimental-strip-types scraper.ts

import playwright from "playwright";

// https://oxylabs.io/blog/playwright-web-scraping
// Firefox: https://www.reddit.com/r/webscraping/comments/149czf4/how_i_can_bypass_antibot_in_playwright_or_seleium/jo5xhw2/
const browser = await playwright.firefox.launch({
  // see the browser
  // headless: false,
});
const context = await browser.newContext();
const page = await context.newPage();
await page.goto("https://instagram.com/");
await page.screenshot({ path: "bruh.png", fullPage: true });
await page.waitForTimeout(1000);
await browser.close();
