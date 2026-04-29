import type { TileLayResult } from "../types";

/** Mortero adhesivo clase C tipo — orientativo kg/m² (llana aplicación habitual cerámica/porcelánico). */
export const TILE_ADHESIVE_KG_PER_M2 = 5.5;
/** Rejunte entre piezas · orientativo kg/m² según anchura junta habitual. */
export const TILE_GROUT_KG_PER_M2 = 1.35;

/** Consumos orientativos: pegado adhesivo + rejunte (sin desglose de piezas cerámicas). */
export function calcTileLay(areaM2: number): TileLayResult {
  return {
    areaM2,
    mortarKg: areaM2 * TILE_ADHESIVE_KG_PER_M2,
    groutKg: areaM2 * TILE_GROUT_KG_PER_M2,
  };
}
