// node --experimental-strip-types scraper.ts

import playwright, { type Response } from "playwright";
// import cookies from "./cookies.json" with { type: "json" };
import path from "path";
import fs from "fs/promises";
import GenAI, { type Part } from "@google/genai";
import { Collection, MongoClient } from "mongodb";
const { GoogleGenAI } = GenAI;

const client = new MongoClient(
  `mongodb+srv://${(await fs.readFile("mongo_userpass.txt", "utf-8")).trim()}@bruh.duskolx.mongodb.net/?retryWrites=true&w=majority&appName=Bruh`
);
await client.connect();
const db = client.db("events_db");
const collection: Collection<ScrapedEvent> = db.collection("events_collection");

type ImageV2Candidate = {
  width: number;
  height: number;
  url: string;
};
type EdgeNode = {
  /** seems to be user iD */
  id: string;
  items: {
    /** ID of story shown in URL */
    pk: string;
    /** {pk}_{userId} I think */
    id: string;
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
    code: string;
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
  } | null;
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
  storyId: string;
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
  postId: string;
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
  const response = await fetch(url).catch((error) => {
    console.error(error);
    return Promise.reject(new Error(`Fetch error: ${url}`));
  });
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
type ScrapedEvent = ((GeminiResult & { result: true }) | { result: false }) & {
  sourceId: string;
  url: string | null;
};

const schemaPrompt = `output only a JSON array of event objects without any explanation or formatting, whose contents each conform to the following schema.

{
  "freeFood": string[], // List only consumable items provided at the event, using the original phrasing from the post (e.g. "Dirty Birds", "Tapex", "boba", "refreshments", "snacks", "food"). Empty if no consumables. Exclude items that must be purchased.
  "location": string,
  "date": { "year": number; "month": number; "date": number }, // Month is between 1 and 12
  "start": { "hour": number; "minute": number }, // 24-hour format
  "end": { "hour": number; "minute": number } // 24-hour format, optional and omitted if no end time specified
}`;

let geminiCalls = 0;
let starting = 0;
let geminiReady = Promise.resolve();
async function readImages(
  imageUrls: string[],
  caption?: string,
  retried = false
): Promise<GeminiResult[]> {
  // ensure gemini calls are performed in series
  const { promise, resolve } = Promise.withResolvers<void>();
  const oldPromise = geminiReady;
  geminiReady = geminiReady.then(() => promise);
  await oldPromise;

  if (geminiCalls >= 15) {
    // max 15 RPM on free plan. 5 seconds just in case
    const ready = starting + (60 + 5) * 1000;
    const delay = ready - Date.now();
    console.log("taking a", delay / 1000, "sec break to cool off on gemini");
    await new Promise((resolve) => setTimeout(resolve, delay));
    geminiCalls = 0;
  }
  if (geminiCalls === 0) {
    starting = Date.now();
  }
  geminiCalls++;
  try {
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
  } catch (error) {
    // ServerError: got status: 503 Service Unavailable. {"error":{"code":503,"message":"The model is overloaded. Please try again later.","status":"UNAVAILABLE"}}
    // ServerError: got status: 500 Internal Server Error. {"error":{"code":500,"message":"Internal error encountered.","status":"INTERNAL"}}
    if (
      !retried &&
      error instanceof Error &&
      (error.message.includes("503 Service Unavailable") ||
        error.message.includes("500 Internal Server Error"))
    ) {
      console.error("[gemini error]", error);
      console.log("cooling off for 15 secs then retrying");
      await new Promise((resolve) => setTimeout(resolve, 15 * 1000));
      resolve();
      return readImages(imageUrls, caption, true);
    } else {
      throw error;
    }
  } finally {
    resolve();
  }
}

// https://oxylabs.io/blog/playwright-web-scraping
// Firefox: https://www.reddit.com/r/webscraping/comments/149czf4/how_i_can_bypass_antibot_in_playwright_or_seleium/jo5xhw2/
const browser = await playwright.firefox.launch({
  // see the browser
  // headless: false,
});
// const storageStateExists = await fs
//   .stat("auth.json")
//   .then(() => true)
//   .catch(() => false);
const context = await browser.newContext({
  // storageState: storageStateExists ? "auth.json" : undefined,
});
// if (!storageStateExists) {
await context.addCookies(
  JSON.parse(await fs.readFile("cookies.json", "utf-8"))
);
// }
const page = await context.newPage();
const allUserStories: UserStories[] = [];
const allTimelinePosts: TimelinePost[] = [];
let id = 0;
async function handleGraphQlResponse(response: GraphQlResponse): Promise<void> {
  const {
    data: {
      xdt_api__v1__feed__reels_media__connection: storyData,
      xdt_api__v1__feed__timeline__connection: timelineData,
    },
  } = response;
  if (storyData) {
    const userStories = storyData.edges.map(
      ({ node: user }): UserStories => ({
        username: user.user.username,
        stories: user.items.map((item): Story => {
          return {
            imageUrl: selectBest(item.image_versions2.candidates, true),
            postId: item.story_feed_media?.[0].media_code ?? null,
            storyId: item.pk,
          };
        }),
      })
    );
    allUserStories.push(...userStories);
    for (const { username, stories } of userStories) {
      for (const { storyId, postId, imageUrl } of stories) {
        const sourceId = `story/${username}/${storyId}`;
        const url = postId ? `https://www.instagram.com/p/${postId}/` : null;
        const added = await insertIfNew(sourceId, url, [imageUrl]);
        console.log(sourceId, added);
      }
    }
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
    const timelinePosts = timelineData.edges.flatMap(
      ({ node: { media } }): TimelinePost[] => {
        if (!media) {
          return [];
        }
        const images: {
          image_versions2: { candidates: ImageV2Candidate[] };
        }[] = media.carousel_media ?? [media];
        return [
          {
            username: media.owner.username,
            caption: media.caption.text,
            imageUrls: images.map(({ image_versions2 }) =>
              selectBest(image_versions2.candidates)
            ),
            postId: media.code,
          },
        ];
      }
    );
    allTimelinePosts.push(...timelinePosts);
    for (const { username, postId, caption, imageUrls } of timelinePosts) {
      const sourceId = `post/${username}/${postId}`;
      const url = `https://www.instagram.com/p/${postId}/`;
      const added = await insertIfNew(sourceId, url, imageUrls, caption);
      console.log(sourceId, added);
    }
    return;
  }
  console.log("| this one has no stories");
}
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
    await handleGraphQlResponse(JSON.parse(buffer.toString("utf-8")));
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
function* analyze(x: any): Generator<GraphQlResponse> {
  for (const req of x.require ?? []) {
    const args = req.at(-1);
    for (const arg of args) {
      if (arg?.__bbox) {
        if (arg.__bbox.complete) yield arg.__bbox.result;
        else yield* analyze(arg.__bbox);
      }
    }
  }
}
for (const script of await page
  .locator('css=script[type="application/json"]')
  .all()) {
  const json = await script
    .textContent()
    .then((json) => json && JSON.parse(json))
    .catch(() => {});
  const results = Array.from(analyze(json));
  for (const result of results) {
    await handleGraphQlResponse(result);
  }
}
console.log("i am instagramming now");
for (let i = 0; i < 5; i++) {
  await page.keyboard.press("End"); // scroll to bottom
  await page
    .waitForRequest(
      (request) => new URL(request.url()).pathname === "/graphql/query",
      { timeout: 1000 }
    )
    .catch(() => console.log("no graphql query from pressing end key"));
  await page.waitForTimeout(500); // give time for page to update so i can press end key again
  console.log("end key", i + 1);
}
await page.keyboard.press("Home");
// const storyScroller = page.locator(
//   'css=[data-pagelet="story_tray"] [role=presentation]'
// );
// await storyScroller.hover();
// for (let i = 0; i < 10; i++) await page.mouse.wheel(1000, 0);
const story = await page.waitForSelector('[aria-label^="Story by"]');
console.log("i see the stories are ready for me to CLICK");
await story.click();
// await page.locator('css=[aria-label^="Story by"]').last().click();
console.log("story hath been click");
await page.waitForRequest(
  (request) => new URL(request.url()).pathname === "/graphql/query"
);
console.log("a request was made");
await page.waitForTimeout(1000);
for (let i = 0; i < 3; i++) {
  // click last visible story
  await page
    .locator('css=section > div > div > div > a[role="link"]')
    .last()
    .click();
  await page
    .waitForRequest(
      (request) => new URL(request.url()).pathname === "/graphql/query",
      { timeout: 1000 }
    )
    .catch(() =>
      console.log("no graphql query from paging down story, oh well")
    );
  await page.waitForTimeout(500); // give time for page to update so i can press end key again
  console.log("story pagination", i + 1);
}
console.log("screenshot time!");
await page.screenshot({ path: "bruh.png", fullPage: true });
await page.context().storageState({ path: "auth.json" });
await browser.close();

await Promise.all(promises);

async function insertIfNew(
  sourceId: string,
  url: string | null,
  ...args: Parameters<typeof readImages>
): Promise<boolean> {
  const existingDoc = await collection.findOne({ sourceId });
  if (existingDoc) {
    return false;
  }
  const events = (await readImages(...args)).filter(
    (event) => event.freeFood.length > 0
  );
  if (events.length > 0) {
    await collection.insertMany(
      events.map((event) => ({ ...event, sourceId, url, result: true }))
    );
  } else {
    await collection.insertOne({
      sourceId,
      url,
      result: false,
    });
  }
  return true;
}

// console.log("allUserStories", allUserStories);
// console.log("allTimelinePosts", allTimelinePosts);
console.log(
  "ok gamers we done. it is safe to ctrl+C if the program does not exit on its own"
);
