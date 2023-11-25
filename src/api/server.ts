import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import express from 'express';
import http from 'http';
import cors from 'cors';
import mongoose from 'mongoose';
import typeDefs from './schema/type.js';
import queryResolvers from './schema/resolver.js';
import { makeExecutableSchema } from '@graphql-tools/schema';
import authDirective from './schema/auth-directive.js';
import verifyToken from './verifyToken.js';
import { Express } from 'express';
import config from 'config';
import {configPath, getConfig} from '../config-path.js';


// applying auth directive to schema
let authDir = authDirective("auth");
let schema = makeExecutableSchema({
  typeDefs : [
    typeDefs,
    authDir.authDirectiveTypeDefs,
  ],
  resolvers: queryResolvers
});

schema = authDir.authDirectiveTransformerFunction(schema);

interface MyContext {
  user?: {[key: string]: any, 'sub': string};
  userId?: String; 
}

const app = express();
const httpServer = http.createServer(app);
const server = new ApolloServer<MyContext>({
  schema,
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  // introspection: getConfig(configPath.graphql.introspection)
});



async function setupServer(): Promise<void> {
  await server.start();
  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    verifyToken,
    expressMiddleware(
      server, 
      { 
        context: async ({ req }) => ({
          user: (<any>req).auth, 
          userId: (<any>req).auth?.sub, 
          tokenError: (<any>req).tokenError
        }) 
      }
    ),
  );
}

async function getServer(): Promise<Express> {
  await setupServer();
  return app;
}


export default getServer;

