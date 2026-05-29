import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Explicitly parse environment variables from your local environment file
dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },s
});
