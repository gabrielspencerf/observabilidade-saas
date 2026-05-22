import { MousePointerClick } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui";

/**
 * Estado inicial sem conversa selecionada: sem segundo título (evita duplicar o cabeçalho da lista).
 */
export default function DashboardConversationsPage() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col justify-center px-2 py-6 sm:px-4">
      <EmptyState
        title="Selecione uma conversa"
        description="Escolha um contato na lista ao lado para ver mensagens, mídias e o resumo por IA. Em telas pequenas, a lista fica acima — role até o histórico abaixo."
        icon={<MousePointerClick className="h-10 w-10 opacity-80" />}
        action={
          <LinkButton
            href="/dashboard/leads"
            variant="outline"
            size="sm"
          >
            Ver leads
          </LinkButton>
        }
      />
    </div>
  );
}
