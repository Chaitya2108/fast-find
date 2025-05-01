// node --experimental-strip-types fix-year.ts

import fs from "fs/promises";
import { MongoClient, Collection } from "mongodb";

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

const client = new MongoClient(
  `mongodb+srv://${(await fs.readFile("mongo_userpass.txt", "utf-8")).trim()}@bruh.duskolx.mongodb.net/?retryWrites=true&w=majority&appName=Bruh`
);
await client.connect();
const db = client.db("events_db");
const collection: Collection<ScrapedEvent> = db.collection("events_collection");

console.log("ok");
console.log(
  await collection.updateMany(
    { "date.year": 2024 },
    { $set: { "date.year": 2025 } }
  )
);
