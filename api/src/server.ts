import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const config = loadEnv();
const app = await createApp({ config });

try {
  await app.listen({
    host: config.host,
    port: config.port,
  });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
