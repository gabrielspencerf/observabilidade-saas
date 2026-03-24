import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { leads } from "@/db/schema";

export const GOOGLE_OFFLINE_HEADERS = [
  "Google Click ID",
  "GBRAID",
  "WBRAID",
  "Conversion Name",
  "Conversion Time",
  "Conversion Value",
  "Conversion Currency",
  "Email",
  "Phone Number",
  "First Name",
  "Last Name",
  "Country",
  "Zip Code",
  "Lead ID",
] as const;

interface OfflineLeadRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  lastSeenAt: Date;
  metadata: Record<string, unknown> | null;
}

export interface GoogleOfflineExportOptions {
  limit?: number;
  conversionName?: string;
  currencyCode?: string;
  defaultConversionValue?: number;
}

export interface GoogleOfflinePreviewResult {
  headers: readonly string[];
  rows: string[][];
  totalQualifiedLeads: number;
  missingTrackingIdentifiers: number;
}

const DEFAULT_CONVERSION_NAME = "Lead qualificado";
const DEFAULT_CURRENCY_CODE = "BRL";
const DEFAULT_CONVERSION_VALUE = 0;

function normalizeCurrencyCode(value?: string): string {
  const normalized = value?.trim().toUpperCase();
  if (!normalized || normalized.length !== 3) return DEFAULT_CURRENCY_CODE;
  return normalized;
}

function normalizeConversionName(value?: string): string {
  const normalized = value?.trim();
  if (!normalized) return DEFAULT_CONVERSION_NAME;
  return normalized;
}

function formatGoogleConversionTime(date: Date): string {
  const iso = new Date(date).toISOString();
  const [d, t] = iso.split("T");
  return `${d} ${t.slice(0, 8)}+00:00`;
}

function normalizePhone(value: string | null): string {
  if (!value) return "";
  const digits = value.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : digits.replace(/[^\d]/g, "");
}

function splitName(fullName: string | null): { firstName: string; lastName: string } {
  if (!fullName) return { firstName: "", lastName: "" };
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function readMetadataString(metadata: Record<string, unknown> | null, ...keys: string[]): string {
  if (!metadata) return "";
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function readMetadataNumber(
  metadata: Record<string, unknown> | null,
  fallback: number,
  ...keys: string[]
): number {
  if (!metadata) return fallback;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = Number(value.replace(",", "."));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return fallback;
}

function toGoogleOfflineRow(
  lead: OfflineLeadRow,
  options: Required<GoogleOfflineExportOptions>
): string[] {
  const metadata = lead.metadata ?? null;
  const gclid = readMetadataString(metadata, "gclid", "googleClickId");
  const gbraid = readMetadataString(metadata, "gbraid");
  const wbraid = readMetadataString(metadata, "wbraid");
  const country = readMetadataString(metadata, "country", "countryCode");
  const zipCode = readMetadataString(metadata, "zipCode", "zip", "postalCode");
  const conversionValue = readMetadataNumber(
    metadata,
    options.defaultConversionValue,
    "conversionValue",
    "leadValue",
    "value"
  );
  const { firstName, lastName } = splitName(lead.name);

  return [
    gclid,
    gbraid,
    wbraid,
    options.conversionName,
    formatGoogleConversionTime(lead.lastSeenAt),
    conversionValue.toString(),
    options.currencyCode,
    lead.email ?? "",
    normalizePhone(lead.phone),
    firstName,
    lastName,
    country,
    zipCode,
    lead.id,
  ];
}

async function listQualifiedLeads(tenantId: string, limit: number): Promise<OfflineLeadRow[]> {
  const db = getDb();
  return db
    .select({
      id: leads.id,
      name: leads.name,
      email: leads.email,
      phone: leads.phone,
      lastSeenAt: leads.lastSeenAt,
      metadata: leads.metadata,
    })
    .from(leads)
    .where(and(eq(leads.tenantId, tenantId), eq(leads.status, "qualified")))
    .orderBy(desc(leads.lastSeenAt))
    .limit(limit);
}

export async function buildGoogleOfflinePreviewForTenant(
  tenantId: string,
  options: GoogleOfflineExportOptions = {}
): Promise<GoogleOfflinePreviewResult> {
  const finalOptions: Required<GoogleOfflineExportOptions> = {
    limit: options.limit ?? 20,
    conversionName: normalizeConversionName(options.conversionName),
    currencyCode: normalizeCurrencyCode(options.currencyCode),
    defaultConversionValue: options.defaultConversionValue ?? DEFAULT_CONVERSION_VALUE,
  };

  const rows = await listQualifiedLeads(tenantId, finalOptions.limit);
  const csvRows = rows.map((lead) => toGoogleOfflineRow(lead, finalOptions));
  const missingTrackingIdentifiers = csvRows.filter(
    (row) => !row[0] && !row[1] && !row[2]
  ).length;

  return {
    headers: GOOGLE_OFFLINE_HEADERS,
    rows: csvRows,
    totalQualifiedLeads: rows.length,
    missingTrackingIdentifiers,
  };
}

export async function buildGoogleOfflineExportForTenant(
  tenantId: string,
  options: GoogleOfflineExportOptions = {}
): Promise<{ headers: readonly string[]; rows: string[][] }> {
  const preview = await buildGoogleOfflinePreviewForTenant(tenantId, {
    ...options,
    limit: options.limit ?? 5000,
  });
  return {
    headers: preview.headers,
    rows: preview.rows,
  };
}
