import getServer from "./api/server.js";
import { connects } from "./db/connect.js";

async function main(): Promise<void> {
  await connects();
  const app = await getServer();
  app.listen({ port: 4000 }, () =>
    console.log(`🚀 Server ready at http://localhost:4000/v1/graphql`)
  );
}

// main();
