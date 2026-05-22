import { notFound } from "next/navigation";
import Link from "next/link";
import { UserCircle } from "lucide-react";
import {
  getDashboardTenantContext,
  getContactByIdForTenant,
} from "@/server/dashboard";
import { PageSection, DashboardPageHeader } from "@/components/layout";
import { ResourceDeleteButton } from "@/components/dashboard/resource-delete-button";
import { ContactEditForm } from "./contact-edit-form";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenantId } = await getDashboardTenantContext();
  const { id } = await params;
  const contact = await getContactByIdForTenant(tenantId, id);
  if (!contact) notFound();

  return (
    <PageSection variant="plain" className="px-1 py-0 sm:px-2 md:px-2 md:pt-0 md:pb-0">
      <DashboardPageHeader
        title={contact.name ?? contact.email ?? contact.phone ?? "Contato"}
        description="Editar dados do contato. Origem permanece preservada."
        icon={UserCircle}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/contacts"
          className="text-sm text-brand-muted hover:text-brand-text transition-colors"
        >
          ← Voltar para Contatos
        </Link>
        <span className="ml-auto">
          <ResourceDeleteButton
            endpoint={`/api/dashboard/contacts/${contact.id}`}
            redirectTo="/dashboard/contacts"
            label="Excluir contato"
          />
        </span>
      </div>
      <ContactEditForm
        contactId={contact.id}
        defaultValues={{
          name: contact.name ?? "",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
        }}
      />
    </PageSection>
  );
}
