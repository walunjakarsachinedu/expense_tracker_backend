import { clear } from "console";
import mongoose from "mongoose";
import config from 'config';
import {configPath, getConfig} from "../config-path.js";

export async function connects(): Promise<void>{
  try {
    clear();
    console.log("connecting to database...");
    const dbName = getConfig(configPath.mongodb.dbName);
    const username = getConfig(configPath.mongodb.username);
    const password = getConfig(configPath.mongodb.password);
    clear(); 
    const dbUrl = `mongodb+srv://${username}:${password}@clusters0.zasrmm9.mongodb.net/${dbName}?retryWrites=true&w=majority`;
    await mongoose.connect(dbUrl).then(() => console.log("mongodb connected successfully"));
  } catch(error) {
    console.error("Error connecting to MongoDB:", error);
  }
}