import ServerlessHttp from "serverless-http";
import getServer from "../api/server";
import { connects } from "../db/connect";
import { Express } from "express";
import mongoose from "mongoose";


let server: Express;

export const handler = async (event, context) => {
  if(!server) server = await getServer();
  if(![1, 2].includes(mongoose.connection.readyState)) await connects();
  const handler = ServerlessHttp(server);
  const result = await handler(event, context);
  return result;
};
