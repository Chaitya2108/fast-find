// node --experimental-strip-types scraper.ts

import playwright from "playwright";
import cookies from "./cookies.json" with { type: "json" };
import path from "path";
import fs from "fs/promises";

// https://oxylabs.io/blog/playwright-web-scraping
// Firefox: https://www.reddit.com/r/webscraping/comments/149czf4/how_i_can_bypass_antibot_in_playwright_or_seleium/jo5xhw2/
const browser = await playwright.firefox.launch({
  // see the browser
  // headless: false,
});
const context = await browser.newContext();
await context.addCookies(cookies);
const page = await context.newPage();
await page.goto("https://instagram.com/");
console.log("i am instagramming now");
const story = await page.waitForSelector('[aria-label^="Story by"]');
console.log("i see the stories are ready for me to CLICK");
const prefix = Buffer.from("for (;;);");
let id = 0;
page.on("response", async (response) => {
  // thanks chatgpt
  const buffer = await response.body();
  const filePath = path.join("scraped", "d" + id.toString().padStart(3, "0"));
  id++;
  if (buffer.slice(0, prefix.length).equals(prefix)) {
    await fs.writeFile(filePath + ".json", buffer.slice(prefix.length));
  } else {
    await fs.writeFile(filePath, buffer);
  }
});
await story.click();
console.log("story hath been click");
await page.screenshot({ path: "bruh.png", fullPage: true });
// await page.waitForTimeout(1000);
await browser.close();
