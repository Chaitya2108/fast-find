import { MongoClient, ServerApiVersion } from 'mongodb';
const uri = "mongodb+srv://chjodhavat:DHEqc26RONHD9Ovc@cluster0.pebqni7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


export async function connectToDB() {
    await client.connect();
    
    return client.db("flyerDB");
}

export async function insertFlyers(flyers: any[]) {
    const db = await connectToDB();
    const collection = db.collection("flyers");
    const result = await collection.insertMany(flyers);
    console.log(`Inserted ${result.insertedCount} flyers into MongoDB!`);
}

export async function closeDB() {
    await client.close();
}