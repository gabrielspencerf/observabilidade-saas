/**
 * Verifica readiness do worker (heartbeat no Redis).
 * Uso: REDIS_URL=<url> tsx scripts/worker-readiness.ts
 * Exit 0 = pronto; 1 = não pronto.
 */
import "dotenv/config";
import { checkReadiness } from "../src/workers/readiness";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error("REDIS_URL não definida.");
  process.exit(1);
}

checkReadiness(redisUrl).then((r) => {
  if (r.ready) {
    console.log("Worker ready.");
    process.exit(0);
  } else {
    console.error("Worker not ready:", r.reason);
    process.exit(1);
  }
});
