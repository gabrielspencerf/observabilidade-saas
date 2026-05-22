import { readFileSync } from "node:fs";
import path from "node:path";

function readRequired(relativePath: string): string {
  const absolute = path.join(process.cwd(), relativePath);
  return readFileSync(absolute, "utf8");
}

function assertIncludes(content: string, needle: string, message: string): void {
  if (!content.includes(needle)) {
    throw new Error(message);
  }
}

function assertNotIncludes(content: string, needle: string, message: string): void {
  if (content.includes(needle)) {
    throw new Error(message);
  }
}

function main(): void {
  const middleware = readRequired("src/middleware.ts");
  assertIncludes(
    middleware,
    'pathname.startsWith("/dashboard")',
    "middleware deve proteger /dashboard"
  );
  assertIncludes(
    middleware,
    'pathname.startsWith("/admin")',
    "middleware deve proteger /admin"
  );
  assertIncludes(
    middleware,
    'pathname.startsWith("/superadmin")',
    "middleware deve proteger /superadmin"
  );

  const dashboardLayout = readRequired("src/app/(dashboard)/dashboard/layout.tsx");
  assertIncludes(
    dashboardLayout,
    "getDashboardTenantContext",
    "layout de dashboard deve resolver contexto server-side"
  );

  const legacySuperadminLayout = readRequired("src/app/(admin)/layout.tsx");
  assertIncludes(
    legacySuperadminLayout,
    "variant=\"superadmin\"",
    "layout legado tecnico deve operar como superadmin"
  );

  const companyAdminLayout = readRequired("src/app/(company-admin)/admin/layout.tsx");
  assertIncludes(
    companyAdminLayout,
    "variant=\"admin\"",
    "layout do admin da empresa deve usar shell dedicada"
  );
  assertIncludes(
    companyAdminLayout,
    "showVysen={false}",
    "admin da empresa deve iniciar sem o painel pesado da Vysen"
  );
  assertIncludes(
    companyAdminLayout,
    "PERMISSION_SLUGS.ADMIN_ACCESS",
    "layout do admin da empresa deve validar permissao admin:access"
  );

  const companyClientsPage = readRequired("src/app/(admin)/admin/agency/page.tsx");
  assertIncludes(
    companyClientsPage,
    "getCompanyPortfolioData",
    "admin da empresa deve carregar agregacao global por tenant"
  );

  const companyHomePage = readRequired("src/app/(company-admin)/admin/page.tsx");
  assertIncludes(
    companyHomePage,
    'href="/admin/clients"',
    "home do admin da empresa deve apontar para a carteira de clientes"
  );

  const superadminHomePage = readRequired("src/app/(superadmin)/superadmin/page.tsx");
  assertIncludes(
    superadminHomePage,
    "/superadmin/integrations",
    "superadmin deve expor a camada tecnica da plataforma"
  );

  const adminNav = readRequired("src/components/sidebar-navigation.ts");
  assertIncludes(
    adminNav,
    'href: "/admin/clients"',
    "navegacao do admin da empresa deve expor a carteira de clientes"
  );
  assertIncludes(
    adminNav,
    'href: "/superadmin/integrations"',
    "navegacao do superadmin deve expor a camada tecnica"
  );

  const sidebar = readRequired("src/components/dashboard-sidebar.tsx");
  assertNotIncludes(
    sidebar,
    'href="/admin"',
    "sidebar de dashboard nao deve exibir link para /admin"
  );

  const chatwootWebhook = readRequired(
    "src/app/api/webhooks/chatwoot/[accountId]/route.ts"
  );
  assertIncludes(
    chatwootWebhook,
    'validateWebhookRequest(\n      "chatwoot"',
    "webhook Chatwoot deve validar assinatura antes de ingerir via contrato central"
  );
  assertIncludes(
    chatwootWebhook,
    "ingestChatwootWebhook",
    "webhook Chatwoot deve persistir raw event e enfileirar"
  );

  const waCloudWebhook = readRequired(
    "src/app/api/webhooks/whatsapp-cloud/[numberId]/route.ts"
  );
  assertIncludes(
    waCloudWebhook,
    "verifyWhatsappCloudHub",
    "webhook WhatsApp Cloud deve expor verificacao GET do hub Meta"
  );
  assertIncludes(
    waCloudWebhook,
    "env.metaAppSecret",
    "webhook WhatsApp Cloud deve usar env.metaAppSecret (META_APP_SECRET) para validacao de assinatura"
  );
  assertIncludes(
    waCloudWebhook,
    "ingestWhatsappCloudWebhook",
    "webhook WhatsApp Cloud deve persistir raw event e enfileirar"
  );

  const dashboardConversations = readRequired("src/server/dashboard/conversations.ts");
  assertIncludes(
    dashboardConversations,
    "chatwootAccounts",
    "listagem de conversas deve resolver recurso Chatwoot"
  );
  assertIncludes(
    dashboardConversations,
    "whatsappCloudNumbers",
    "listagem de conversas deve resolver recurso WhatsApp Cloud"
  );

  console.log("[smoke:web] ok");
}

main();
