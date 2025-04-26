// node --experimental-strip-types scraper.ts

import playwright from "playwright";
import cookies from "./cookies.json" with { type: "json" };
import path from "path";
import fs from "fs/promises";

type EdgeNode = {
  id: string;
  items: {
    accessibility_caption: string;
    image_versions2: {
      candidates: {
        width: number;
        height: number;
        url: string;
      }[];
    };
    /** an XML string */
    video_dash_manifest: string | null;
    video_versions:
      | {
          type: number;
          url: string;
        }[]
      | null;
    story_hashtags:
      | {
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          hashtag: { name: string; id: string };
        }[]
      | null;
    story_feed_media:
      | {
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
          /** instagram post ID: https://www.instagram.com/p/___/ */
          media_code: string;
        }[]
      | null;
    story_bloks_stickers: {
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      bloks_sticker: {
        sticker_data: {
          ig_mention: { full_name: string; username: string };
        };
      };
    }[];
  }[];
  user: {
    username: string;
    profile_pic_url: string;
  };
};

type Story = {
  imageUrl: string;
  /** instagram post ID: https://www.instagram.com/p/___/ */
  postId: string | null;
};
type UserStories = {
  username: string;
  stories: Story[];
};

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
  const url = response.url();
  if (new URL(url).pathname === "/graphql/query") {
    const buffer = await response.body();
    const filePath = path.join(
      "scraped",
      `d${id.toString().padStart(3, "0")}.json`
    );
    console.log(filePath, url);
    id++;
    await fs.writeFile(filePath, buffer);
    const {
      data: { xdt_api__v1__feed__reels_media__connection: storyData },
    } = JSON.parse(buffer.toString("utf-8"));
    if (!storyData) {
      console.log("| this one has no stories");
      return;
    }
    const rawStories: { node: EdgeNode }[] = storyData.edges;
    const userStories = rawStories.map(
      ({ node: user }): UserStories => ({
        username: user.user.username,
        stories: user.items.map((item): Story => {
          const bestCandidate = item.image_versions2.candidates.reduce<{
            width: number;
            height: number;
            url: string;
          }>(
            (cum, curr) => {
              if (curr.width === curr.height) {
                return cum;
              }
              return curr.width > cum.width ? curr : cum;
            },
            { width: 0, height: 0, url: "" }
          );
          return {
            imageUrl: bestCandidate.url,
            postId: item.story_feed_media?.[0].media_code ?? null,
          };
        }),
      })
    );
    for (const { username, stories } of userStories) {
      console.log(`[${username}]`);
      for (const story of stories) {
        console.log(story.imageUrl);
        if (story.postId) {
          console.log(`=> https://www.instagram.com/p/${story.postId}/`);
        }
      }
      console.log();
    }
  }
  // if (buffer.slice(0, prefix.length).equals(prefix)) {
  //   await fs.writeFile(filePath + ".json", buffer.slice(prefix.length));
  // } else {
  //   await fs.writeFile(filePath, buffer);
  // }
});
await story.click();
console.log("story hath been click");
await page.waitForTimeout(1000);
console.log("waited..screensotoing");
await page.screenshot({ path: "bruh.png", fullPage: true });
await browser.close();
