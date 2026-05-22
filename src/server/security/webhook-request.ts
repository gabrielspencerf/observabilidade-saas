import type { ChatwootWebhookContext } from "@/server/integrations/chatwoot/validate";
import { validateChatwootWebhook } from "@/server/integrations/chatwoot/validate";
import type { EvolutionWebhookContext } from "@/server/integrations/evolution/validate";
import { validateEvolutionWebhook } from "@/server/integrations/evolution/validate";
import type { TypebotWebhookContext } from "@/server/integrations/typebot/validate";
import { validateTypebotWebhook } from "@/server/integrations/typebot/validate";
import type { UazapiWebhookContext } from "@/server/integrations/uazapi/validate";
import { validateUazapiWebhook } from "@/server/integrations/uazapi/validate";
import type { WhatsappCloudWebhookContext } from "@/server/integrations/whatsapp-cloud/validate";
import { validateWhatsappCloudWebhook } from "@/server/integrations/whatsapp-cloud/validate";

export type WebhookProvider =
  | "uazapi"
  | "evolution"
  | "typebot"
  | "chatwoot"
  | "whatsapp_cloud";

type Err = { error: string; status: number };

export async function validateWebhookRequest(
  provider: "uazapi",
  request: Request,
  rawBody: string,
  resourceId: string
): Promise<UazapiWebhookContext | Err>;

export async function validateWebhookRequest(
  provider: "evolution",
  request: Request,
  rawBody: string,
  resourceId: string
): Promise<EvolutionWebhookContext | Err>;

export async function validateWebhookRequest(
  provider: "typebot",
  request: Request,
  rawBody: string,
  resourceId: string
): Promise<TypebotWebhookContext | Err>;

export async function validateWebhookRequest(
  provider: "chatwoot",
  request: Request,
  rawBody: string,
  resourceId: string
): Promise<ChatwootWebhookContext | Err>;

export async function validateWebhookRequest(
  provider: "whatsapp_cloud",
  request: Request,
  rawBody: string,
  resourceId: string,
  options?: { metaAppSecret?: string }
): Promise<WhatsappCloudWebhookContext | Err>;

/**
 * Ponto único de entrada para validação criptográfica + resolução de recurso.
 * Deve ser chamado dentro de `withWebhookRlsTransaction` (DB com bypass até fixar tenant).
 */
export async function validateWebhookRequest(
  provider: WebhookProvider,
  request: Request,
  rawBody: string,
  resourceId: string,
  options?: { metaAppSecret?: string }
): Promise<
  | UazapiWebhookContext
  | EvolutionWebhookContext
  | TypebotWebhookContext
  | ChatwootWebhookContext
  | WhatsappCloudWebhookContext
  | Err
> {
  switch (provider) {
    case "uazapi":
      return validateUazapiWebhook(request, resourceId, rawBody);
    case "evolution":
      return validateEvolutionWebhook(request, resourceId, rawBody);
    case "typebot":
      return validateTypebotWebhook(request, resourceId, rawBody);
    case "chatwoot":
      return validateChatwootWebhook(request, resourceId, rawBody);
    case "whatsapp_cloud":
      return validateWhatsappCloudWebhook(
        request,
        resourceId,
        rawBody,
        options?.metaAppSecret
      );
    default: {
      const _exhaustive: never = provider;
      return { error: `Provider desconhecido: ${_exhaustive}`, status: 500 };
    }
  }
}
