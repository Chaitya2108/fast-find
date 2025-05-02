import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import fs from "fs/promises";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

const client = new MongoClient(process.env.MONGO_URI || `mongodb+srv://${(await fs.readFile("mongo_userpass.txt", "utf-8")).trim()}@bruh.duskolx.mongodb.net/?retryWrites=true&w=majority&appName=Bruh`);

await client.connect();
const db = client.db("events_db"); // replace with your actual db name
const events = db.collection("events_collection");   // replace with your actual collection name

app.get("/api/events", async (req, res) => {
  const allEvents = await events.find({ result: true }).sort({ date: 1 }).toArray(); // sort chronologically
  console.log(allEvents);
  res.json(allEvents);
  
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}/`);
});