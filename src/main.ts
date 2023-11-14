import { startServer } from "./config/api/server.js";


async function main() : Promise<void> {
  await startServer();
}

main();
