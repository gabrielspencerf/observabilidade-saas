import "dotenv/config";

/** Config Drizzle CLI (generate/migrate). Sem `defineConfig` para compatibilidade com drizzle-kit instalado. */
const drizzleConfig = {
  schema: ["./src/db/enums.ts", "./src/db/schema/index.ts"],
  out: "./src/db/migrations",
  dialect: "postgresql" as const,
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/vysen",
  },
};

export default drizzleConfig;
