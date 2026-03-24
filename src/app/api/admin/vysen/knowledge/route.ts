import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import {
  getKnowledgeHealth,
  ingestKnowledgeDocument,
  searchKnowledge,
  type KnowledgeScope,
} from "@/server/vysen/knowledge";

function parseScope(input: string | null): KnowledgeScope {
  return input === "tenant" ? "tenant" : "global";
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.status === 403 ? "Sem permissão" : "Não autenticado" },
      { status: e.status ?? 401 }
    );
  }

  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    const health = await getKnowledgeHealth().catch(() => []);
    return NextResponse.json({ health });
  }

  const scope = parseScope(request.nextUrl.searchParams.get("scope"));
  const tenantId = request.nextUrl.searchParams.get("tenantId");
  if (scope === "tenant" && !tenantId) {
    return NextResponse.json(
      { error: "tenantId é obrigatório quando scope=tenant." },
      { status: 400 }
    );
  }
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 6);
  const results = await searchKnowledge({
    query,
    scope,
    tenantId,
    limit,
  }).catch(() => []);
  return NextResponse.json({ results });
}

export async function POST(request: NextRequest) {
  let session;
  try {
    session = await requireAdmin(request);
  } catch (err) {
    const e = err as Error & { status?: number };
    return NextResponse.json(
      { error: e.status === 403 ? "Sem permissão" : "Não autenticado" },
      { status: e.status ?? 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corpo inválido" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const sourceType = typeof body.sourceType === "string" ? body.sourceType.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!title || !sourceType || !content) {
    return NextResponse.json(
      { error: "Campos obrigatórios: title, sourceType e content." },
      { status: 400 }
    );
  }

  const scope = parseScope(typeof body.scope === "string" ? body.scope : null);
  const tenantId =
    scope === "tenant" && typeof body.tenantId === "string" ? body.tenantId : null;

  const result = await ingestKnowledgeDocument({
    scope,
    tenantId,
    title,
    sourceType,
    content,
    sourceUri: typeof body.sourceUri === "string" ? body.sourceUri : null,
    metadata:
      body.metadata && typeof body.metadata === "object"
        ? (body.metadata as Record<string, unknown>)
        : null,
    createdBy: session.user.id,
  }).catch((err) => {
    const message =
      err instanceof Error ? err.message : "Falha ao processar documento de conhecimento.";
    return { error: message } as const;
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, ...result });
}

