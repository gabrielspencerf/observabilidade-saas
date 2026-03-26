/**
 * Cria o banco de dados do app se não existir.
 * Conecta ao banco "postgres" (padrão) e executa CREATE DATABASE.
 * Uso: tsx scripts/create-db.ts
 * Requer: DATABASE_URL no .env (ex.: postgresql://postgres:postgres@localhost:5432/vysen)
 */
import "dotenv/config";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida em .env");
  process.exit(1);
}

// Conecta ao banco padrão "postgres" para criar o DB do app
const match = url.match(/^(postgres(?:ql)?:\/\/[^/]+)\/([^/?]+)/);
const baseUrl = match ? `${match[1]}/postgres` : url.replace(/\/[^/]+(\?|$)/, "/postgres$1");
const dbName = match ? match[2] : "vysen";

if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dbName)) {
  console.error("Nome do banco inválido:", dbName);
  process.exit(1);
}

const sql = postgres(baseUrl, { max: 1 });

async function main() {
  try {
    await sql.unsafe(`CREATE DATABASE ${dbName}`);
    console.log(`Banco "${dbName}" criado.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : (err && typeof err === "object" && "message" in err ? String((err as Error).message) : String(err));
    if (msg.includes("already exists")) {
      console.log(`Banco "${dbName}" já existe.`);
    } else {
      console.error("Erro ao criar banco:", msg || err);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

main();
