import type { StuccoFinishResult } from "../types";

/** kg de estuco por m² y por mano (promedio obra) */
const STUCCO_KG_PER_M2_PER_COAT = 2.2;
/** Masilla / mastic de preparación (kg/m² por mano) */
const MASTIC_KG_PER_M2_PER_COAT = 0.45;
/** Pintura (L/m² por mano) */
const PAINT_L_PER_M2_PER_COAT = 0.12;

/**
 * Acabado tipo estuco + masilla + pintura sobre muro (metraje horizontal o vertical en m²).
 */
export function calcStuccoFinish(
  areaM2: number,
  stuccoCoats: number,
  masticCoats: number,
  paintCoats: number
): StuccoFinishResult {
  const stuccoKg = areaM2 * stuccoCoats * STUCCO_KG_PER_M2_PER_COAT;
  const masticKg = areaM2 * masticCoats * MASTIC_KG_PER_M2_PER_COAT;
  const paintLiters = areaM2 * paintCoats * PAINT_L_PER_M2_PER_COAT;

  return {
    areaM2,
    stuccoKg,
    masticKg,
    paintLiters,
  };
}
