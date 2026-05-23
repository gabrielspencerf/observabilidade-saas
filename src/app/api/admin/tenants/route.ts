/**
 * GET /api/admin/tenants — listar tenants (super_admin).
 * POST /api/admin/tenants — criar tenant (super_admin).
 */
import { NextRequest } from "next/server";
import { requireAdmin } from "@/server/admin/require-admin";
import { listTenants, createTenant } from "@/server/admin/tenants";
import { adminApiAuthErrorResponse } from "@/server/admin/api-route-errors";
import { apiError, apiOk } from "@/server/http/api-contract";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }
  const tenants = await listTenants();
  return apiOk({
    tenants: tenants.map((t) => ({ id: t.id, name: t.name, slug: t.slug })),
  });
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (err) {
    return adminApiAuthErrorResponse(err);
  }

  let body: {
    name?: string;
    slug?: string;
    settings?: Record<string, unknown> | null;
  };
  try {
    body = await request.json();
  } catch {
    return apiError("invalid_body", "Corpo inválido", { status: 400 });
  }

  const result = await createTenant({
    name: body.name ?? "",
    slug: body.slug ?? "",
    settings: body.settings,
  });

  if ("error" in result) {
    const isValidation =
      result.error.includes("obrigatório") || result.error.includes("longo");
    return apiError(
      isValidation ? "invalid_payload" : "duplicate_resource",
      result.error,
      { status: isValidation ? 400 : 409 }
    );
  }
  return apiOk({ id: result.id }, { status: 201 });
}
