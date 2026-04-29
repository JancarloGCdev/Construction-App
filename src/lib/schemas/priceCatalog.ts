import { z } from "zod";
import { defaultPrices } from "@/core/pricing/defaultPrices";
import type { PriceCatalog } from "@/core/types";

export const priceCatalogSchema: z.ZodType<PriceCatalog> = z.object({
  cementBag: z.coerce.number().min(0),
  sandM3: z.coerce.number().min(0),
  gravelM3: z.coerce.number().min(0),
  balastoM3: z.coerce.number().min(0),
  block: z.coerce.number().min(0),
  steelKg: z.coerce.number().min(0),
  laborM2Concrete: z.coerce.number().min(0),
  laborM2BlockWall: z.coerce.number().min(0),
  stuccoSaco25kg: z.coerce.number().min(0),
  masticSaco27kg: z.coerce.number().min(0),
  paintCunete19_25L: z.coerce.number().min(0),
  laborM2Stucco: z.coerce.number().min(0),
  graniplastKg: z.coerce.number().min(0),
  laborM2Graniplast: z.coerce.number().min(0),
  tileMortarSac25kg: z.coerce.number().min(0),
  tileGroutSac5kg: z.coerce.number().min(0),
  laborM2TileLay: z.coerce.number().min(0),
  wastePercent: z.coerce.number().min(0).max(100),
  profitMargin: z.coerce.number().min(0).max(200),
});

export const priceCatalogExportSchema = priceCatalogSchema;

function mergeWithDefaults(data: unknown): unknown {
  if (data == null || typeof data !== "object" || Array.isArray(data)) {
    return { ...defaultPrices };
  }
  const d = data as Record<string, unknown>;
  const out: Record<string, unknown> = { ...defaultPrices, ...d };
  return out;
}

export function parsePriceCatalogJson(data: unknown): PriceCatalog {
  return priceCatalogSchema.parse(mergeWithDefaults(data));
}
