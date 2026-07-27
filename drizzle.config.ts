import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Check for Postgres credentials
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("PostgreSQL connection string missing. Please set DATABASE_URL in .env file");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
