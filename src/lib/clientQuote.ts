import type { CalculationResult } from "@/core/types";

/** Mano de obra (precio cliente) en múltiplos de 10 mil COP redondeando hacia arriba */
const LABOR_CLIENT_ROUND_STEP_COP = 10_000;

function ceilNonNegativeToMultiple(value: number, step: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.ceil(value / step) * step;
}

/**
 * Distribuye un objetivo redondeado (entero COP) proporcionalmente a las líneas base.
 */
function allocateRoundedSubtotals(
  lines: { subtotal: number }[],
  targetRounded: number
): number[] {
  if (lines.length === 0) return [];
  const sum = lines.reduce((s, l) => s + Math.max(0, l.subtotal), 0);
  if (sum <= 0) {
    return lines.map(() => Math.round(targetRounded / lines.length || 0));
  }
  const raw = lines.map((l) => (l.subtotal / sum) * targetRounded);
  const rounded = raw.map((x) => Math.round(x));
  let diff = targetRounded - rounded.reduce((a, b) => a + b, 0);
  if (diff !== 0) rounded[rounded.length - 1] = (rounded[rounded.length - 1] ?? 0) + diff;
  return rounded;
}

export function getClientQuoteTotals(totals: CalculationResult["totals"]): {
  materialsRounded: number;
  extrasRounded: number;
  laborWithMarginRounded: number;
  totalRounded: number;
} {
  const materialsRounded = Math.round(totals.materialsTotal);
  const extrasRounded = Math.round(totals.extrasTotal);
  const engineTotalRounded = Math.round(totals.total);
  const laborRaw = Math.max(0, engineTotalRounded - materialsRounded - extrasRounded);
  const laborWithMarginRounded = ceilNonNegativeToMultiple(
    laborRaw,
    LABOR_CLIENT_ROUND_STEP_COP,
  );
  const totalRounded = materialsRounded + laborWithMarginRounded + extrasRounded;
  return { materialsRounded, extrasRounded, laborWithMarginRounded, totalRounded };
}

export function materialRowsClientPesos(
  materials: CalculationResult["materials"],
  materialsTargetRounded: number
): { name: string; quantity: number; unit: string; unitCost: number; subtotal: number }[] {
  const alloc = allocateRoundedSubtotals(materials, materialsTargetRounded);
  return materials.map((m, i) => ({
    ...m,
    subtotal: alloc[i] ?? Math.round(m.subtotal),
  }));
}

export function laborRowsClientPesos(
  labor: CalculationResult["labor"],
  laborTargetRounded: number
): { name: string; quantity: number; unit: string; unitCost: number; subtotal: number }[] {
  if (labor.length === 0 && laborTargetRounded > 0) {
    return [
      {
        name: "Mano de obra y cargos del servicio (precio cotizado)",
        quantity: 1,
        unit: "global",
        unitCost: laborTargetRounded,
        subtotal: laborTargetRounded,
      },
    ];
  }
  const alloc = allocateRoundedSubtotals(labor, laborTargetRounded);
  return labor.map((l, i) => ({
    ...l,
    subtotal: alloc[i] ?? Math.round(l.subtotal),
  }));
}

export function extrasRowsClientPesos(
  extras: CalculationResult["extras"],
  extrasTargetRounded: number
): { name: string; subtotal: number }[] {
  if (extras.length === 0) return [];
  const alloc = allocateRoundedSubtotals(
    extras.map((e) => ({ subtotal: e.subtotal })),
    extrasTargetRounded
  );
  return extras.map((e, i) => ({
    ...e,
    subtotal: alloc[i] ?? Math.round(e.subtotal),
  }));
}
