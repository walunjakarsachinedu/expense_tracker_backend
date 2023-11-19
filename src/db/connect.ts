import { clear } from "console";
import mongoose from "mongoose";
import config from 'config';

export async function connects(): Promise<void>{
  clear();
  console.log("connecting to database...");
  const dbName = config.get("mongodb.dbName");
  const username = config.get("mongodb.username");
  const password = config.get("mongodb.password");
  const dbUrl = `mongodb+srv://${username}:${password}@clusters0.zasrmm9.mongodb.net/${dbName}?retryWrites=true&w=majority`;
  await mongoose.connect(dbUrl).then(() => console.log("mongodb connected successfully"));
  clear(); 
}