import { startServer } from "./config/api/server.js";
import { connects } from "./config/db/connect.js";


async function main() : Promise<void> {
  await connects();
  await startServer();
}

main();
