import { createApp } from "../app.js";
import type { AppOptions } from "../app.js";
import { loadEnv } from "../config/env.js";

export async function createTestApp(options: Omit<AppOptions, "config"> = {}) {
  return createApp({
    config: loadEnv({
      NODE_ENV: "test",
    }),
    ...options,
  });
}
