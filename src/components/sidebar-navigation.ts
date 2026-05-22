import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Box,
  BriefcaseBusiness,
  Building2,
  Eye,
  Filter,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  Settings,
  Smartphone,
  Sparkles,
  TrendingUp,
  UserCircle,
  Users,
  UsersRound,
  Waypoints,
} from "lucide-react";
import type { ProviderBrand } from "@/components/provider-brand-icon";

/**
 * Governanca da navegacao:
 * - Secoes com `label` agrupam itens sem poluir a lista principal.
 * - Dashboard, admin da empresa e superadmin tecnico possuem mapas distintos.
 */
export interface SidebarNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  providerBrand?: ProviderBrand;
  exactMatch?: boolean;
}

export interface SidebarNavSection {
  id: string;
  label: string;
  icon?: LucideIcon;
  collapsible?: boolean;
  items: SidebarNavItem[];
}

export const dashboardNavSections: SidebarNavSection[] = [
  {
    id: "dashboard-main",
    label: "",
    items: [{ href: "/dashboard/home", label: "Inicio", icon: LayoutDashboard }],
  },
  {
    id: "comercial",
    label: "Comercial",
    icon: Users,
    collapsible: true,
    items: [
      { href: "/dashboard/leads", label: "Leads", icon: Users },
      { href: "/dashboard/opportunities", label: "Oportunidades", icon: TrendingUp },
      { href: "/dashboard/conversations", label: "Conversas", icon: MessageSquare },
    ],
  },
  {
    id: "canais",
    label: "Canais",
    icon: Megaphone,
    collapsible: true,
    items: [
      {
        href: "/dashboard/google-ads",
        label: "Google Ads",
        icon: BarChart3,
        providerBrand: "googleAds",
      },
      { href: "/dashboard/meta-ads", label: "Meta Ads", icon: Megaphone, providerBrand: "metaAds" },
      { href: "/dashboard/clarity", label: "Clarity", icon: Eye, providerBrand: "clarity" },
      {
        href: "/dashboard/settings/whatsapp",
        label: "WhatsApp",
        icon: Smartphone,
        providerBrand: "whatsapp",
      },
    ],
  },
  {
    id: "dashboard-more",
    label: "",
    items: [
      { href: "/dashboard/contacts", label: "Contatos", icon: UserCircle },
      { href: "/dashboard/funnel", label: "Funil", icon: Filter },
      { href: "/dashboard/products", label: "Produtos", icon: Package },
      { href: "/dashboard/settings", label: "Configuracoes", icon: Settings },
    ],
  },
];

export const companyAdminNavSections: SidebarNavSection[] = [
  {
    id: "company-overview",
    label: "Painel",
    items: [
      { href: "/admin", label: "Inicio", icon: LayoutDashboard, exactMatch: true },
      { href: "/admin/clients", label: "Clientes", icon: BriefcaseBusiness },
    ],
  },
  {
    id: "company-operation",
    label: "Operacao",
    items: [{ href: "/admin/clients", label: "Carteira resumida", icon: UsersRound }],
  },
];

export const superadminNavSections: SidebarNavSection[] = [
  {
    id: "superadmin-overview",
    label: "Painel tecnico",
    items: [
      { href: "/superadmin", label: "Inicio", icon: LayoutDashboard, exactMatch: true },
      { href: "/superadmin/tenants", label: "Tenants", icon: Building2 },
      { href: "/superadmin/users", label: "Usuarios", icon: Users },
    ],
  },
  {
    id: "superadmin-platform",
    label: "Plataforma",
    items: [
      { href: "/superadmin/integrations", label: "Integracoes", icon: Box },
      { href: "/superadmin/agent", label: "Vysen", icon: Sparkles },
      { href: "/superadmin/worker-pipeline", label: "Worker & dados", icon: Waypoints },
      { href: "/superadmin/observability", label: "Observabilidade", icon: Activity },
    ],
  },
];

export const adminNavSections = superadminNavSections;

export function isNavItemActive(pathname: string, item: SidebarNavItem): boolean {
  if (item.exactMatch) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
