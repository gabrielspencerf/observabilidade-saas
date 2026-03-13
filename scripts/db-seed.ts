/**
 * Executa o seed Base 1 (roles, permissions, role_permissions, tenant, user, membership).
 * Uso: npm run db:seed
 * Requer: DATABASE_URL em .env.local
 */
import "dotenv/config";
import { run as runBase1Seed } from "../src/db/seeds/base1";

runBase1Seed()
  .then(() => {
    console.log("Seed concluído.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Erro no seed:", err);
    process.exit(1);
  });
