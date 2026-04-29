import type { GraniplastResult } from "../types";

/** Consumo orientativo kg/m²/mano (texturizado tipo graniplast) */
const KG_PER_M2_PER_COAT = 2.8;

export function calcGraniplast(areaM2: number, coats: number): GraniplastResult {
  const graniplastKg = areaM2 * coats * KG_PER_M2_PER_COAT;
  return { areaM2, graniplastKg };
}
