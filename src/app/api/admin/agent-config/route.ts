import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import {
  getGlobalOpenAIAgentConfig,
  setGlobalOpenAIAgentConfig,
  type FollowupRule,
} from "@/server/config/openai-agent";

function normalizeFollowupRules(input: unknown): FollowupRule[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const data = item as Record<string, unknown>;
      if (typeof data.profileId !== "string" || !data.profileId.trim()) return null;
      const maxFollowups = Number(data.maxFollowups);
      const intervalHours = Number(data.intervalHours);
      const createConsultingAgendaAfterMissed = Number(
        data.createConsultingAgendaAfterMissed
      );
      if (
        !Number.isFinite(maxFollowups) ||
        !Number.isFinite(intervalHours) ||
        !Number.isFinite(createConsultingAgendaAfterMissed)
      ) {
        return null;
      }
      return {
        profileId: data.profileId.trim(),
        maxFollowups: Math.max(1, Math.floor(maxFollowups)),
        intervalHours: Math.max(1, Math.floor(intervalHours)),
        createConsultingAgendaAfterMissed: Math.max(
          1,
          Math.floor(createConsultingAgendaAfterMissed)
        ),
      } satisfies FollowupRule;
    })
    .filter((item): item is FollowupRule => item !== null);
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
  const config = await getGlobalOpenAIAgentConfig();
  return NextResponse.json(config);
}

export async function PATCH(request: NextRequest) {
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

  const enabled = body.enabled === undefined ? true : Boolean(body.enabled);
  const model =
    typeof body.model === "string" && body.model.trim() ? body.model.trim() : "gpt-4o-mini";
  const systemPrompt =
    typeof body.systemPrompt === "string" && body.systemPrompt.trim()
      ? body.systemPrompt.trim()
      : "";
  const followupRules = normalizeFollowupRules(body.followupRules);
  const apiKey = typeof body.apiKey === "string" ? body.apiKey : undefined;

  await setGlobalOpenAIAgentConfig(
    {
      enabled,
      model,
      systemPrompt,
      followupRules,
      apiKey,
    },
    { updatedBy: session.user.id }
  );

  return NextResponse.json({ ok: true });
}
