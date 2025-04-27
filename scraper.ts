// node --experimental-strip-types scraper.ts

import playwright, { type Response } from "playwright";
import cookies from "./cookies.json" with { type: "json" };
import path from "path";
import fs from "fs/promises";
import GenAI, { type Part } from "@google/genai";
const { GoogleGenAI } = GenAI;

type ImageV2Candidate = {
  width: number;
  height: number;
  url: string;
};
type EdgeNode = {
  id: string;
  items: {
    accessibility_caption: string;
    image_versions2: {
      candidates: ImageV2Candidate[];
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
type TimelinePostNode = {
  media: {
    owner: {
      username: string;
    };
    carousel_media:
      | {
          accessibility_caption: string;
          image_versions2: {
            candidates: ImageV2Candidate[];
          };
        }[]
      | null;
    user: {
      // same as owner??
      username: string;
    };
    // probably just the first slide
    image_versions2: {
      candidates: ImageV2Candidate[];
    };
    caption: {
      text: string;
    };
  };
};
type GraphQlResponse = {
  data: {
    xdt_api__v1__feed__reels_media__connection?: {
      edges: { node: EdgeNode }[];
    };
    xdt_api__v1__feed__timeline__connection?: {
      edges: { node: TimelinePostNode }[];
    };
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
type TimelinePost = {
  username: string;
  caption: string;
  imageUrls: string[];
};

function selectBest(
  candidates: ImageV2Candidate[],
  excludeSquare = false
): string {
  return candidates.reduce<ImageV2Candidate>(
    (cum, curr) => {
      if (excludeSquare && curr.width === curr.height) {
        return cum;
      }
      return curr.width > cum.width ? curr : cum;
    },
    { width: 0, height: 0, url: "" }
  ).url;
}

async function fetchImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}

const apiKey = (await fs.readFile("api_key.txt", "utf-8")).trim();
const ai = new GoogleGenAI({ apiKey });

type GeminiResult = {
  freeFood: string[];
  location: string;
  date: { year: number; month: number; date: number };
  start: { hour: number; minute: number };
  end?: { hour: number; minute: number };
};

const schemaPrompt = `output only a JSON object without any explanation or formatting according to the following schema.

{
  "freeFood": string[], // List only free consumable items, using the original phrasing from the post (e.g. "Dirty Birds", "Tapex", "boba", "refreshments", "snacks", "food"). Empty if no free consumables.
  "location": string,
  "date": { "year": number; "month": number; "date": number }, // Month is between 1 and 12
  "start": { "hour": number; "minute": number }, // 24-hour format
  "end": { "hour": number; "minute": number } // 24-hour format, omitted if no end time specified
}

If no event is described, output \`null\`.`;

async function readImages(
  imageUrls: string[],
  caption?: string
): Promise<GeminiResult | null> {
  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: [
      ...(await Promise.all(
        imageUrls.map((url) =>
          fetchImageAsBase64(url).then(
            (dataUrl): Part => ({
              inlineData: { data: dataUrl, mimeType: "image/jpeg" },
            })
          )
        )
      )),
      {
        text:
          `Using the following flyer${imageUrls.length !== 1 ? "s" : ""}${caption ? " and caption" : ""}, ${schemaPrompt}` +
          (caption ? "\n\n" + caption : ""),
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });
  return JSON.parse(result.text ?? "{}");
}

// https://oxylabs.io/blog/playwright-web-scraping
// Firefox: https://www.reddit.com/r/webscraping/comments/149czf4/how_i_can_bypass_antibot_in_playwright_or_seleium/jo5xhw2/
const browser = await playwright.firefox.launch({
  // see the browser
  // headless: false,
});
const context = await browser.newContext();
await context.addCookies(cookies);
const page = await context.newPage();
const allUserStories: UserStories[] = [];
const allTimelinePosts: TimelinePost[] = [];
let id = 0;
async function handleResponse(response: Response): Promise<void> {
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
      data: {
        xdt_api__v1__feed__reels_media__connection: storyData,
        xdt_api__v1__feed__timeline__connection: timelineData,
      },
    }: GraphQlResponse = JSON.parse(buffer.toString("utf-8"));
    if (storyData) {
      const userStories = storyData.edges.map(
        ({ node: user }): UserStories => ({
          username: user.user.username,
          stories: user.items.map((item): Story => {
            return {
              imageUrl: selectBest(item.image_versions2.candidates, true),
              postId: item.story_feed_media?.[0].media_code ?? null,
            };
          }),
        })
      );
      allUserStories.push(...userStories);
      // for (const { username, stories } of userStories) {
      //   console.log(`[${username}]`);
      //   for (const story of stories) {
      //     console.log(story.imageUrl);
      //     if (story.postId) {
      //       console.log(`=> https://www.instagram.com/p/${story.postId}/`);
      //     }
      //   }
      //   console.log();
      // }
      return;
    }
    if (timelineData) {
      const timelinePosts = timelineData.edges.map(
        ({ node: { media } }): TimelinePost => {
          const images: {
            image_versions2: { candidates: ImageV2Candidate[] };
          }[] = media.carousel_media ?? [media];
          return {
            username: media.owner.username,
            caption: media.caption.text,
            imageUrls: images.map(({ image_versions2 }) =>
              selectBest(image_versions2.candidates)
            ),
          };
        }
      );
      allTimelinePosts.push(...timelinePosts);
      return;
    }
    console.log("| this one has no stories");
  }
  // if (buffer.slice(0, prefix.length).equals(prefix)) {
  //   await fs.writeFile(filePath + ".json", buffer.slice(prefix.length));
  // } else {
  //   await fs.writeFile(filePath, buffer);
  // }
}
const promises: Promise<void>[] = [];
page.on("response", (response) => {
  promises.push(handleResponse(response));
});
await page.goto("https://instagram.com/");
console.log("i am instagramming now");
await page.keyboard.press("End"); // scroll to bottom
await page.waitForTimeout(1000);
await page.screenshot({ path: "bruh.png", fullPage: true });
const story = await page.waitForSelector('[aria-label^="Story by"]');
console.log("i see the stories are ready for me to CLICK");
await story.click();
console.log("story hath been click");
await page.waitForTimeout(1000);
console.log("waited..screensotoing");
await browser.close();

await Promise.all(promises);
console.log("allUserStories", allUserStories);
console.log("allTimelinePosts", allTimelinePosts);
console.log(await readImages([allUserStories[0].stories[0].imageUrl]));
