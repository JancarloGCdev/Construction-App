import type { PriceCatalog } from "../types";
import { MASTIC_SACO_KG, PAINT_CUNETE_L, STUCCO_SACO_KG, TILE_GROUT_SAC_KG, TILE_MORTAR_SAC_KG } from "./packaging";

export type { PriceCatalog } from "../types";


/** Valores referencia aproximados en COP (Colombia); precios por saco/cuñete; editables en Configurar precios. */
export const defaultPrices: PriceCatalog = {
  cementBag: 36_000,
  sandM3: 95_000,
  gravelM3: 110_000,
  balastoM3: 103_000,
  block: 1_200,
  steelKg: 4_200,
  laborM2Concrete: 45_000,
  laborM2BlockWall: 38_000,
  stuccoSaco25kg: 32_000,
  masticSaco27kg: 60_000,
  paintCunete19_25L: 120_000,
  laborM2Stucco: 42_000,
  graniplastKg: 18_000,
  laborM2Graniplast: 45_000,
  tileMortarSac25kg: 48_000,
  tileGroutSac5kg: 28_000,
  laborM2TileLay: 55_000,
  wastePercent: 8,
  profitMargin: 15,
};

export function stuccoPricePerKg(c: Pick<PriceCatalog, "stuccoSaco25kg">): number {
  return c.stuccoSaco25kg / STUCCO_SACO_KG;
}

export function masticPricePerKg(c: Pick<PriceCatalog, "masticSaco27kg">): number {
  return c.masticSaco27kg / MASTIC_SACO_KG;
}

export function paintPricePerLiter(c: Pick<PriceCatalog, "paintCunete19_25L">): number {
  return c.paintCunete19_25L / PAINT_CUNETE_L;
}

export function tileMortarPricePerKg(c: Pick<PriceCatalog, "tileMortarSac25kg">): number {
  return c.tileMortarSac25kg / TILE_MORTAR_SAC_KG;
}

export function tileGroutPricePerKg(c: Pick<PriceCatalog, "tileGroutSac5kg">): number {
  return c.tileGroutSac5kg / TILE_GROUT_SAC_KG;
}
