import { AGGREGATE_M3_PURCHASE_STEP, PAINT_CUNETE_L } from "./packaging";

/** Bultos de cemento · sacos: solo valores enteros hacia arriba. */
export function ceilWholeBagsOrSacks(quantity: number): number {
  if (quantity <= 0) return 0;
  return Math.ceil(quantity);
}

/** Arena y gravilla: alza al siguiente múltiplo de AGGREGATE_M3_PURCHASE_STEP (p. ej. 0,5 m³). */
export function ceilCommercialAggregateM3(volume: number): number {
  if (volume <= 0) return 0;
  const step = AGGREGATE_M3_PURCHASE_STEP;
  return Math.ceil(volume / step) * step;
}

export function ceilSacksByKg(kg: number, kgPerSack: number): number {
  if (kg <= 0 || kgPerSack <= 0) return 0;
  return Math.ceil(kg / kgPerSack);
}

/** Pintura: cuñetes enteros típicos (~19,25 L). */
export function ceilPaintCunetes(liters: number, litersPerCunete: number = PAINT_CUNETE_L): number {
  if (liters <= 0 || litersPerCunete <= 0) return 0;
  return Math.ceil(liters / litersPerCunete);
}
