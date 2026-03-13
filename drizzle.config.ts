import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  schema: ["./src/db/enums.ts", "./src/db/schema/index.ts"],
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/app",
  },
});
