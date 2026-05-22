import type { Metadata } from "next";
import { SuperadminWorkerPipelinePage } from "@/features/superadmin/worker-pipeline-page";

export const metadata: Metadata = {
  title: "Worker e fluxo de dados",
  description: "Mapa relacional, filas Redis, workers e tabelas do Postgres.",
};

export default async function SuperadminWorkerPipelineRoute() {
  return <SuperadminWorkerPipelinePage />;
}
