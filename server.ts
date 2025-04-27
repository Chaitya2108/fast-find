import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

const app = express();
const PORT = 3000;

const client = new MongoClient(`mongodb+srv://${(await fs.readFile("mongo_userpass.txt", "utf-8")).trim()}@bruh.duskolx.mongodb.net/?retryWrites=true&w=majority`);

await client.connect();
const db = client.db("events_db"); // replace with your actual db name
const events = db.collection("events_collection");   // replace with your actual collection name

app.get("/api/events", async (req, res) => {
  const allEvents = await events.find({}).sort({ date: 1 }).toArray(); // sort chronologically
  console.log(allEvents);
  res.json(allEvents);
  
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});