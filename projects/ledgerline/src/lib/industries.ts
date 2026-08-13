/**
 * Daftar industri + label (Gap #2 — template COA per industri).
 * Sumber tunggal untuk dropdown klien, label, dan validasi.
 */
import type { Industry } from "@prisma/client";

export const INDUSTRY_LIST: Industry[] = [
  "RETAIL",
  "SERVICES",
  "FNB",
  "MANUFACTURING",
  "CONSTRUCTION",
  "PROPERTY",
  "HOSPITALITY",
  "HEALTHCARE",
  "EDUCATION",
  "COOPERATIVE",
  "NONPROFIT",
  "AGRICULTURE",
  "TRANSPORT",
  "TECHNOLOGY",
  "FINANCE",
  "EVENT",
  "OTHER",
];

export const INDUSTRY_LABELS: Record<Industry, string> = {
  RETAIL: "Perdagangan / Retail",
  SERVICES: "Jasa",
  FNB: "F&B (Restoran, Kafe, Katering)",
  MANUFACTURING: "Manufaktur / Pabrik",
  CONSTRUCTION: "Konstruksi & Developer",
  PROPERTY: "Properti & Sewa",
  HOSPITALITY: "Hotel & Pariwisata",
  HEALTHCARE: "Kesehatan (Klinik, Lab)",
  EDUCATION: "Pendidikan",
  COOPERATIVE: "Koperasi",
  NONPROFIT: "Yayasan / Nirlaba",
  AGRICULTURE: "Agrikultur & Perkebunan",
  TRANSPORT: "Transportasi & Logistik",
  TECHNOLOGY: "Teknologi / IT",
  FINANCE: "Fintech & Pembiayaan",
  EVENT: "Event Management & Agency",
  OTHER: "Lainnya",
};

/** File template COA per industri (src/ai/knowledge/coa-<slug>.csv). */
export const INDUSTRY_COA_FILE: Record<Industry, string> = {
  RETAIL: "coa-retail.csv",
  SERVICES: "coa-services.csv",
  FNB: "coa-fnb.csv",
  MANUFACTURING: "coa-manufacturing.csv",
  CONSTRUCTION: "coa-construction.csv",
  PROPERTY: "coa-property.csv",
  HOSPITALITY: "coa-hospitality.csv",
  HEALTHCARE: "coa-healthcare.csv",
  EDUCATION: "coa-education.csv",
  COOPERATIVE: "coa-cooperative.csv",
  NONPROFIT: "coa-nonprofit.csv",
  AGRICULTURE: "coa-agriculture.csv",
  TRANSPORT: "coa-transport.csv",
  TECHNOLOGY: "coa-technology.csv",
  FINANCE: "coa-finance.csv",
  EVENT: "coa-event.csv",
  OTHER: "coa-other.csv",
};

export function isIndustry(v: string): v is Industry {
  return (INDUSTRY_LIST as string[]).includes(v);
}
