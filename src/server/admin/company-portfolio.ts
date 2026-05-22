import {
  getAgencyPortfolioData,
  type AgencyPortfolioData,
  type AgencyPortfolioSummary,
  type AgencyPortfolioTenantRow,
} from "./agency-dashboard";

export type CompanyPortfolioSummary = AgencyPortfolioSummary;
export type CompanyPortfolioTenantRow = AgencyPortfolioTenantRow;
export type CompanyPortfolioData = AgencyPortfolioData;

export async function getCompanyPortfolioData(): Promise<CompanyPortfolioData> {
  return getAgencyPortfolioData();
}
