/** Pesos y volúmenes de empaque para pasar de precio por saco/cuñete a COP por kg o por L. */

export const STUCCO_SACO_KG = 25;
export const MASTIC_SACO_KG = 27;
export const PAINT_CUNETE_L = 19.25;

/** Adhesivo / cola ceramic-porcelain (saco habitual 25 kg) */
export const TILE_MORTAR_SAC_KG = 25;
/** Rejunte (saco típico 5 kg / se usa para prorrateo COP/kg) */
export const TILE_GROUT_SAC_KG = 5;

/**
 * Arena / gravilla (balastro): en Colombia suelen venderse por m³ o medios m³.
 * Las cantidades de compra se redondean al alza a este paso (p. ej. 1,2 m³ → 1,5 m³).
 */
export const AGGREGATE_M3_PURCHASE_STEP = 0.5;

/**
 * Graniplast / texturizado: referencia de saco típico cuando el precio del perfil es por kg;
 * compra como sacos enteros para no cotizar fracciones de bolsa.
 */
export const GRANIPLAST_SAC_REF_KG = 25;
