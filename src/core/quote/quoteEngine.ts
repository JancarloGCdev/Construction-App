import type {
  BlockWallResult,
  CalculationResult,
  ConcreteSlabResult,
  GraniplastResult,
  PriceCatalog,
  StuccoFinishResult,
  TileLayResult,
} from "../types";
import {
  GRANIPLAST_SAC_REF_KG,
  MASTIC_SACO_KG,
  TILE_GROUT_SAC_KG,
  TILE_MORTAR_SAC_KG,
  STUCCO_SACO_KG,
} from "../pricing/packaging";
import {
  ceilCommercialAggregateM3,
  ceilPaintCunetes,
  ceilSacksByKg,
  ceilWholeBagsOrSacks,
} from "../pricing/purchaseRounding";
import {
  STEEL_KG_PER_M3_BEAM_ESTIMATE,
  STEEL_KG_PER_M3_COLUMN_ESTIMATE,
} from "../calculators/concreteSlab";

function wasteFactor(wastePercent: number): number {
  return 1 + wastePercent / 100;
}

function roundMoney(n: number): number {
  return Math.round(n);
}

function finalizeTotals(
  materials: CalculationResult["materials"],
  labor: CalculationResult["labor"],
  profitMargin: number
): CalculationResult {
  const extras: CalculationResult["extras"] = [];
  const materialsTotal = materials.reduce((s, m) => s + m.subtotal, 0);
  const laborTotal = labor.reduce((s, l) => s + l.subtotal, 0);
  const extrasTotal = 0;
  const subtotal = materialsTotal + laborTotal + extrasTotal;
  const profit = roundMoney(subtotal * (profitMargin / 100));
  const total = subtotal + profit;

  return {
    materials,
    labor,
    extras,
    totals: {
      materialsTotal,
      laborTotal,
      extrasTotal,
      subtotal,
      profit,
      total,
    },
  };
}

export function buildQuoteFromConcrete(
  profile: PriceCatalog,
  wastePercent: number,
  slab: ConcreteSlabResult,
  areaM2: number
): CalculationResult {
  const w = wasteFactor(wastePercent);
  const cementQty = slab.cementBags * w;
  const sandQty = slab.sandM3 * w;
  const gravelQty = slab.gravelM3 * w;

  /** Compra al alza: bultos enteros; arena y gravilla en medios m³ (incremento comercial). */
  const cementBagsPurchase = ceilWholeBagsOrSacks(cementQty);
  const mode = slab.aggregateMode ?? "separate";

  const materialsBase = [
    {
      name: "Cemento (bulto 50kg)",
      unit: "bulto",
      quantity: cementBagsPurchase,
      unitCost: profile.cementBag,
      subtotal: 0,
    },
  ];

  const aggregateLines =
    mode === "balasto"
      ? [
          {
            name: "Balasto (arena + piedra, agregado mixto)",
            unit: "m³",
            quantity: ceilCommercialAggregateM3(sandQty + gravelQty),
            unitCost: profile.balastoM3,
            subtotal: 0,
          },
        ]
      : [
          {
            name: "Arena",
            unit: "m³",
            quantity: ceilCommercialAggregateM3(sandQty),
            unitCost: profile.sandM3,
            subtotal: 0,
          },
          {
            name: "Grava",
            unit: "m³",
            quantity: ceilCommercialAggregateM3(gravelQty),
            unitCost: profile.gravelM3,
            subtotal: 0,
          },
        ];

  const steelLines: CalculationResult["materials"] = [];
  if (slab.columnsVolumeM3 > 1e-9) {
    const rawKg = slab.columnsVolumeM3 * STEEL_KG_PER_M3_COLUMN_ESTIMATE * w;
    const qty = Math.ceil(rawKg);
    if (qty >= 1) {
      steelLines.push({
        name: "Acero / hierro — columnas (ref. ~120 kg/m³ hormigón, presupuesto obra)",
        unit: "kg",
        quantity: qty,
        unitCost: profile.steelKg,
        subtotal: 0,
      });
    }
  }
  if (slab.beamsVolumeM3 > 1e-9) {
    const rawKg = slab.beamsVolumeM3 * STEEL_KG_PER_M3_BEAM_ESTIMATE * w;
    const qty = Math.ceil(rawKg);
    if (qty >= 1) {
      steelLines.push({
        name: "Acero / hierro — vigas (ref. ~100 kg/m³ hormigón, presupuesto obra)",
        unit: "kg",
        quantity: qty,
        unitCost: profile.steelKg,
        subtotal: 0,
      });
    }
  }

  const materials = [...materialsBase, ...aggregateLines, ...steelLines].map((m) => ({
    ...m,
    subtotal: roundMoney(m.quantity * m.unitCost),
  }));

  const structExtra = slab.columnsVolumeM3 + slab.beamsVolumeM3;
  const labor = [
    {
      name:
        structExtra > 0.0001
          ? "Mano de obra (concreto en placa / m² — columnas y vigas solo en materiales)"
          : "Mano de obra (concreto / m²)",
      unit: "m²",
      quantity: Math.round(areaM2 * 100) / 100,
      unitCost: profile.laborM2Concrete,
      subtotal: roundMoney(areaM2 * profile.laborM2Concrete),
    },
  ];

  return finalizeTotals(materials, labor, profile.profitMargin);
}

export function buildQuoteFromBlockWall(
  profile: PriceCatalog,
  wastePercent: number,
  wall: BlockWallResult
): CalculationResult {
  const w = wasteFactor(wastePercent);
  const blockQty = wall.blocksNeeded * w;

  const materials = [
    {
      name: "Bloque",
      unit: "unidad",
      quantity: Math.ceil(blockQty),
      unitCost: profile.block,
      subtotal: 0,
    },
  ].map((m) => ({
    ...m,
    subtotal: roundMoney(m.quantity * m.unitCost),
  }));

  const labor = [
    {
      name: "Mano de obra (muro bloques / m²)",
      unit: "m²",
      quantity: Math.round(wall.areaM2 * 100) / 100,
      unitCost: profile.laborM2BlockWall,
      subtotal: roundMoney(wall.areaM2 * profile.laborM2BlockWall),
    },
  ];

  return finalizeTotals(materials, labor, profile.profitMargin);
}

export function buildQuoteFromStuccoFinish(
  profile: PriceCatalog,
  wastePercent: number,
  data: StuccoFinishResult
): CalculationResult {
  const w = wasteFactor(wastePercent);
  const stQ = data.stuccoKg * w;
  const masQ = data.masticKg * w;
  const paintQ = data.paintLiters * w;

  const stuccoSacks = ceilSacksByKg(stQ, STUCCO_SACO_KG);
  const masticSacks = ceilSacksByKg(masQ, MASTIC_SACO_KG);
  const paintCunetes = ceilPaintCunetes(paintQ);

  const materials = [
    {
      name: "Estuco (saco 25 kg)",
      unit: "saco",
      quantity: stuccoSacks,
      unitCost: profile.stuccoSaco25kg,
      subtotal: 0,
    },
    {
      name: "Masilla / mastic (saco 27 kg)",
      unit: "saco",
      quantity: masticSacks,
      unitCost: profile.masticSaco27kg,
      subtotal: 0,
    },
    {
      name: "Pintura (cuñete 19,25 L)",
      unit: "cuñete",
      quantity: paintCunetes,
      unitCost: profile.paintCunete19_25L,
      subtotal: 0,
    },
  ].map((m) => ({
    ...m,
    subtotal: roundMoney(m.quantity * m.unitCost),
  }));

  const labor = [
    {
      name: "Mano de obra (estuco y pintura / m²)",
      unit: "m²",
      quantity: Math.round(data.areaM2 * 100) / 100,
      unitCost: profile.laborM2Stucco,
      subtotal: roundMoney(data.areaM2 * profile.laborM2Stucco),
    },
  ];

  return finalizeTotals(materials, labor, profile.profitMargin);
}

export function buildQuoteFromGraniplast(
  profile: PriceCatalog,
  wastePercent: number,
  data: GraniplastResult
): CalculationResult {
  const w = wasteFactor(wastePercent);
  const kg = data.graniplastKg * w;
  const graniplastSacks = ceilSacksByKg(kg, GRANIPLAST_SAC_REF_KG);
  const graniplastSacoUnitCost = profile.graniplastKg * GRANIPLAST_SAC_REF_KG;

  const materials = [
    {
      name: "Graniplast (saco ref. 25 kg)",
      unit: "saco",
      quantity: graniplastSacks,
      unitCost: graniplastSacoUnitCost,
      subtotal: 0,
    },
  ].map((m) => ({
    ...m,
    subtotal: roundMoney(m.quantity * m.unitCost),
  }));

  const labor = [
    {
      name: "Mano de obra (graniplast / m²)",
      unit: "m²",
      quantity: Math.round(data.areaM2 * 100) / 100,
      unitCost: profile.laborM2Graniplast,
      subtotal: roundMoney(data.areaM2 * profile.laborM2Graniplast),
    },
  ];

  return finalizeTotals(materials, labor, profile.profitMargin);
}

export function buildQuoteFromTileLay(
  profile: PriceCatalog,
  wastePercent: number,
  data: TileLayResult
): CalculationResult {
  const w = wasteFactor(wastePercent);
  const mortQ = data.mortarKg * w;
  const groutQ = data.groutKg * w;

  const mortarSacs = ceilSacksByKg(mortQ, TILE_MORTAR_SAC_KG);
  const groutSacs = ceilSacksByKg(groutQ, TILE_GROUT_SAC_KG);

  const materials = [
    {
      name: "Adhesivo cerámica/porcelanato (saco 25 kg)",
      unit: "saco",
      quantity: mortarSacs,
      unitCost: profile.tileMortarSac25kg,
      subtotal: 0,
    },
    {
      name: "Rejunte (saco 5 kg referencia)",
      unit: "saco",
      quantity: groutSacs,
      unitCost: profile.tileGroutSac5kg,
      subtotal: 0,
    },
  ].map((m) => ({
    ...m,
    subtotal: roundMoney(m.quantity * m.unitCost),
  }));

  const labor = [
    {
      name: "Mano de obra (pegado cerámica–porcelánico / m²)",
      unit: "m²",
      quantity: Math.round(data.areaM2 * 100) / 100,
      unitCost: profile.laborM2TileLay,
      subtotal: roundMoney(data.areaM2 * profile.laborM2TileLay),
    },
  ];

  return finalizeTotals(materials, labor, profile.profitMargin);
}

/**
 * Fusiona varias cotizaciones parciales (carrito) en una sola con un solo margen.
 */
export function mergeQuoteLineItems(
  items: { label: string; result: CalculationResult }[],
  profile: PriceCatalog
): CalculationResult {
  if (items.length === 0) {
    throw new Error("No hay ítems para fusionar");
  }

  const materials: CalculationResult["materials"] = [];
  const labor: CalculationResult["labor"] = [];

  for (const { label, result } of items) {
    for (const m of result.materials) {
      materials.push({
        ...m,
        name: `${label} — ${m.name}`,
      });
    }
    for (const l of result.labor) {
      labor.push({
        ...l,
        name: `${label} — ${l.name}`,
      });
    }
  }

  return finalizeTotals(materials, labor, profile.profitMargin);
}
