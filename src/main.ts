import { startServer } from "./api/server.js";
import { connects } from "./db/connect.js";


async function main() : Promise<void> {
  await connects();
  await startServer();
}

main();
