import { createApp } from "../app.js";
import { loadEnv } from "../config/env.js";

export async function createTestApp() {
  return createApp({
    config: loadEnv({
      NODE_ENV: "test",
    }),
  });
}
