import { drizzle } from "drizzle-orm/node-postgres";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is missing!");
}

// Drizzle handles the underlying connection configurations automatically
export const db = drizzle({ 
  connection: {
    connectionString: process.env.DATABASE_URL 
  }
});
