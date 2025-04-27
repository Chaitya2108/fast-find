//File: example/example-node.ts

import fs from "fs/promises";

import { z } from "zod";
import axios from "axios";
import { Collection, MongoClient } from "mongodb";

import { defineDAINService, ToolConfig } from "@dainprotocol/service-sdk";

import {
  BaseUIElement,
  CardUIBuilder,
  MapUIBuilder,
  TableProps,
  TableUIBuilder,
} from "@dainprotocol/utils";

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

async function connectDb(): Promise<Collection<ScrapedEvent>> {
  const client = new MongoClient(
    `mongodb+srv://${(await fs.readFile("../mongo_userpass.txt", "utf-8")).trim()}@bruh.duskolx.mongodb.net/?retryWrites=true&w=majority&appName=Bruh`
  );
  await client.connect();
  const db = client.db("events_db");
  return db.collection("events_collection");
}

const dbPromise = connectDb();

const port = Number(process.env.PORT) || 2022;

const fmt = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "UTC",
});

function buildTable(events: ScrapedEvent[]): BaseUIElement<TableProps> {
  return new TableUIBuilder()
    .addColumns([
      // https://github.com/dain-protocol/dain-STONKS-service/blob/8315dd87a47f86b969af3462e9f8298a706b1358/stonks/src/index.ts#L109-L110
      { key: "when", header: "When", type: "text" },
      { key: "what", header: "What", type: "text" },
      { key: "where", header: "Where", type: "text" },
      { key: "source", header: "Source", type: "text" },
    ])
    .rows(
      events.map((event) => {
        if (!event.result) {
          throw new Error("what");
        }
        const start = new Date(
          Date.UTC(
            event.date.year,
            event.date.month - 1,
            event.date.date,
            event.start.hour,
            event.start.minute
          )
        );
        return {
          when: event.end
            ? // @ts-ignore they're using an outdated typescript lib version and idk how to change that
              fmt.formatRange(
                start,
                new Date(
                  Date.UTC(
                    event.date.year,
                    event.date.month - 1,
                    event.date.date,
                    event.end.hour,
                    event.end.minute
                  )
                )
              )
            : fmt.format(start),
          what: `free ${event.freeFood.join(", ")}`,
          where: event.location,
          source: event.url ?? "Instagram story",
        };
      })
    )
    .build();
}

const getAllFreeFoodConfig: ToolConfig = {
  id: "get-all-free-food",
  name: "Get All Free Food",
  description:
    "Returns all past and future free food events. Decent fallback if other tools are too limiting because there aren't that many free food events in the database right now",
  input: z.object({}).describe("does not take input"),
  output: z
    .array(
      z.object({
        freeFood: z
          .array(z.string())
          .describe(
            "non-empty list of consumable items or specific vendor names that are offered for free, e.g. Dirty Birds, boba, snacks, food"
          ),
        location: z.string().describe("name of location on UCSD campus"),
        date: z
          .object({
            year: z.number(),
            month: z.number().describe("month between 1 and 12"),
            date: z.number(),
          })
          .describe("when the event takes place"),
        start: z
          .object({ hour: z.number(), minute: z.number() })
          .describe("start time of event"),
        end: z
          .object({ hour: z.number(), minute: z.number() })
          .optional()
          .describe("end time of event, if specified"),
      })
    )
    .describe("list of events with free food"),
  pricing: { pricePerUse: 0, currency: "USD" },
  handler: async (_, agentInfo, context) => {
    console.log(`User / Agent ${agentInfo.id} requested ALL free food events`);

    const collection = await dbPromise;

    const events = await collection.find({ result: true }).toArray();

    return {
      text: `We have ${events.length} event${events.length !== 1 ? "s" : ""} with free food in our database, though some of them may have happened already.`,
      data: events,
      ui: buildTable(events),
    };
  },
};

const getFreeFoodDateConfig: ToolConfig = {
  id: "get-free-food-date",
  name: "Get Free Food on Date",
  description: "Returns free food events on a given date.",
  input: z
    .object({
      year: z.number(),
      month: z.number().describe("month between 1 and 12"),
      date: z.number(),
    })
    .describe("date"),
  output: z
    .array(
      z.object({
        freeFood: z
          .array(z.string())
          .describe(
            "non-empty list of consumable items or specific vendor names that are offered for free, e.g. Dirty Birds, boba, snacks, food"
          ),
        location: z.string().describe("name of location on UCSD campus"),
        date: z
          .object({
            year: z.number(),
            month: z.number().describe("month between 1 and 12"),
            date: z.number(),
          })
          .describe("when the event takes place"),
        start: z
          .object({ hour: z.number(), minute: z.number() })
          .describe("start time of event"),
        end: z
          .object({ hour: z.number(), minute: z.number() })
          .optional()
          .describe("end time of event, if specified"),
      })
    )
    .describe("list of events with free food on given date"),
  pricing: { pricePerUse: 0, currency: "USD" },
  handler: async (date, agentInfo, context) => {
    console.log(
      `User / Agent ${agentInfo.id} requested free food events for ${date.year}-${date.month}-${date.date}`
    );

    const collection = await dbPromise;

    const events = await collection
      .find({
        result: true,
        "date.year": date.year,
        "date.month": date.month,
        "date.date": date.date,
      })
      .toArray();

    return {
      text: `There are ${events.length} event${events.length !== 1 ? "s" : ""} on ${new Date(
        Date.UTC(date.year, date.month - 1, date.date)
      ).toLocaleDateString("en-US", {
        dateStyle: "long",
        timeZone: "UTC",
      })}.`,
      data: events,
      ui: buildTable(events),
    };
  },
};

const dainService = defineDAINService({
  metadata: {
    title: "UCSD free food events",
    description: "Get upcoming free food events",
    version: "1.0.0",
    author: "Chaitya and Sean",
    tags: ["ucsd", "events", "food", "food insecurity", "free food"],
    logo: "https://cdn-icons-png.flaticon.com/512/252/252035.png",
  },
  exampleQueries: [
    {
      category: "UCSD",
      queries: [
        "What free food events are coming up?",
        "Are there any free food events today?",
      ],
    },
  ],
  identity: {
    apiKey: process.env.DAIN_API_KEY,
  },
  tools: [getAllFreeFoodConfig, getFreeFoodDateConfig],
});

dainService.startNode({ port: port }).then(({ address }) => {
  console.log("Weather DAIN Service is running at :" + address().port);
});
