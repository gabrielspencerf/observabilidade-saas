/**
 * Textos para o usuário final nas telas de WhatsApp (Evolution / UAZAPI).
 * Não expor detalhes técnicos retornados pelos provedores.
 */

export type MessagingProviderKind = "evolution" | "uazapi";

function technicalHints(technicalError: string | null | undefined): {
  timeout: boolean;
  network: boolean;
} {
  const t = (technicalError ?? "").toLowerCase();
  return {
    timeout: /abort|timeout|timed out|etimedout/.test(t),
    network: /fetch failed|econnrefused|enotfound|network|socket|failed to connect|getaddrinfo/i.test(t),
  };
}

export function messagingStatusUserMessage(input: {
  ok: boolean;
  statusCode: number;
  technicalError?: string | null;
  provider: MessagingProviderKind;
  hasCredentials: boolean;
}): string | undefined {
  if (input.ok) return undefined;

  if (!input.hasCredentials) {
    return input.provider === "evolution"
      ? "Esta instância ainda não tem chave de API configurada. Peça ao administrador para concluir o cadastro em Integrações."
      : "As credenciais desta instância estão incompletas. Peça ao administrador para revisar o cadastro em Integrações.";
  }

  const { timeout, network } = technicalHints(input.technicalError);
  const sc = input.statusCode;

  if (timeout || sc === 408) {
    return "O servidor de mensagens demorou demais para responder. Tente atualizar daqui a pouco.";
  }
  if (network) {
    return "Não foi possível alcançar o servidor do WhatsApp. Confira a internet ou peça ao administrador para validar a URL da instância.";
  }
  if (sc === 401 || sc === 403) {
    return "O provedor recusou o acesso. Peça ao administrador para revisar API key, token ou permissões.";
  }
  if (sc === 404) {
    return "O endereço da API não foi encontrado. O administrador pode precisar corrigir a URL base da instância.";
  }
  if (sc >= 500) {
    return "O serviço do provedor está temporariamente indisponível. Tente novamente mais tarde.";
  }
  if (sc === 0) {
    return "Não foi possível verificar o status agora. Tente de novo em instantes.";
  }

  return "Não foi possível verificar o status neste momento. Se persistir, entre em contato com o suporte.";
}

export function messagingConnectUserMessage(input: {
  ok: boolean;
  statusCode: number;
  technicalError?: string | null;
  provider: MessagingProviderKind;
  hasCredentials: boolean;
}): string {
  if (input.ok) return "";

  if (!input.hasCredentials) {
    return input.provider === "evolution"
      ? "Não é possível gerar o QR sem a chave de API. Peça ao administrador para configurar a instância."
      : "Não é possível gerar o QR sem as credenciais corretas. Peça ao administrador para revisar a instância.";
  }

  const { timeout, network } = technicalHints(input.technicalError);
  const sc = input.statusCode;

  if (timeout || sc === 408) {
    return "O provedor demorou demais para gerar o QR. Tente de novo em alguns segundos.";
  }
  if (network) {
    return "Não conseguimos falar com o servidor do WhatsApp. Verifique a rede ou peça ao administrador para conferir a URL.";
  }
  if (sc === 401 || sc === 403) {
    return "O provedor não autorizou gerar o QR. Peça ao administrador para revisar credenciais.";
  }
  if (sc === 404) {
    return "Este tipo de reconexão não está disponível nesse endereço de API. O administrador pode precisar atualizar a integração.";
  }
  if (sc >= 500) {
    return "O provedor está com instabilidade. Tente gerar o QR novamente mais tarde.";
  }
  if (sc === 0) {
    return "Não foi possível obter o QR agora. Tente novamente.";
  }

  return "Não foi possível obter o QR. Tente de novo ou peça ajuda ao suporte.";
}
