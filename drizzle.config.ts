import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Check for MySQL credentials
const mysqlHost = process.env.MYSQL_HOST;
const mysqlPort = process.env.MYSQL_PORT;
const mysqlUsername = process.env.MYSQL_USERNAME;
const mysqlPassword = process.env.MYSQL_PASSWORD;
const mysqlDatabase = process.env.MYSQL_DATABASE;

if (!mysqlHost || !mysqlPort || !mysqlUsername || !mysqlPassword || !mysqlDatabase) {
  throw new Error("MySQL credentials missing. Please set MYSQL_HOST, MYSQL_PORT, MYSQL_USERNAME, MYSQL_PASSWORD, and MYSQL_DATABASE in .env file");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: mysqlHost,
    port: parseInt(mysqlPort),
    user: mysqlUsername,
    password: mysqlPassword,
    database: mysqlDatabase,
  },
});
