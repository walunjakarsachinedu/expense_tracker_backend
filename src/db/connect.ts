import { clear } from "console";
import mongoose from "mongoose";
import config from 'config';
import configPath from "../config-path.js";

export async function connects(): Promise<void>{
  try {
    clear();
    console.log("connecting to database...");
    const dbName = config.get(configPath.mongodb.dbName);
    const username = config.get(configPath.mongodb.username);
    const password = config.get(configPath.mongodb.password);
    clear(); 
    const dbUrl = `mongodb+srv://${username}:${password}@clusters0.zasrmm9.mongodb.net/${dbName}?retryWrites=true&w=majority`;
    await mongoose.connect(dbUrl).then(() => console.log("mongodb connected successfully"));
  } catch(error) {
    console.error("Error connecting to MongoDB:", error);
  }
}