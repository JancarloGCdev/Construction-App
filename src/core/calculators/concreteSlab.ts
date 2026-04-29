import type {
  ConcreteAggregateMode,
  ConcreteBeamInput,
  ConcreteColumnInput,
  ConcreteSlabResult,
} from "../types";
/** Reglas orientativas de obra por m³ de concreto (Colombia, presupuesto). */
export const CONCRETE_CEMENT_BAGS_PER_M3 = 7;
export const CONCRETE_SAND_M3_PER_M3 = 0.5;
export const CONCRETE_GRAVEL_M3_PER_M3 = 0.8;

/** Hierro orientativo por m³ de hormigón (presupuesto, no proyecto estructural). */
export const STEEL_KG_PER_M3_COLUMN_ESTIMATE = 120;
export const STEEL_KG_PER_M3_BEAM_ESTIMATE = 100;

export function estimateStructuralSteelKg(columnsVolumeM3: number, beamsVolumeM3: number): {
  steelKgColumnsEstimate: number;
  steelKgBeamsEstimate: number;
  steelStructuralKgTotal: number;
} {
  const steelKgColumnsEstimate = columnsVolumeM3 * STEEL_KG_PER_M3_COLUMN_ESTIMATE;
  const steelKgBeamsEstimate = beamsVolumeM3 * STEEL_KG_PER_M3_BEAM_ESTIMATE;
  return {
    steelKgColumnsEstimate,
    steelKgBeamsEstimate,
    steelStructuralKgTotal: steelKgColumnsEstimate + steelKgBeamsEstimate,
  };
}

function rectColumnVolumeM3(c: ConcreteColumnInput): number {
  if (c.qty <= 0 || c.heightM <= 0 || c.sectionWidthCm <= 0 || c.sectionDepthCm <= 0) return 0;
  const w = c.sectionWidthCm / 100;
  const d = c.sectionDepthCm / 100;
  return c.qty * w * d * c.heightM;
}

function beamsVolumeM3(b: ConcreteBeamInput): number {
  if (
    b.qty <= 0 ||
    b.spanM <= 0 ||
    b.widthCm <= 0 ||
    b.depthCm <= 0
  ) {
    return 0;
  }
  const w = b.widthCm / 100;
  const depth = b.depthCm / 100;
  return b.qty * b.spanM * w * depth;
}

type CalcOpts = {
  columns?: ConcreteColumnInput[];
  beams?: ConcreteBeamInput[];
  aggregateMode?: ConcreteAggregateMode;
};

/**
 * Placa de concreto y, opcionalmente, volumen por columnas (sección rectangular) y vigas.
 * Dos modos de agregado idénticos en cemento pero distintos al cotizar materiales:
 * - separate: arena y gravilla por líneas aparte
 * - balasto: un solo volumen tipo agregado mixto (cantidad volumétrica ~ arena + gravilla de la proporción habitual)
 */
export function calcConcreteSlab(
  lengthM: number,
  widthM: number,
  thicknessCm: number,
  opts?: CalcOpts
): ConcreteSlabResult {
  const columns = opts?.columns ?? [];
  const beams = opts?.beams ?? [];
  const aggregateMode: ConcreteAggregateMode = opts?.aggregateMode ?? "separate";

  const thicknessM = thicknessCm / 100;
  const slabVolumeM3 = lengthM * widthM * thicknessM;
  const columnsVolumeM3 = columns.reduce((s, c) => s + rectColumnVolumeM3(c), 0);
  const beamsVolumeM3Calc = beams.reduce((sum, b) => sum + beamsVolumeM3(b), 0);
  const volumeM3 = slabVolumeM3 + columnsVolumeM3 + beamsVolumeM3Calc;

  const cementBags = volumeM3 * CONCRETE_CEMENT_BAGS_PER_M3;
  const sandM3 = volumeM3 * CONCRETE_SAND_M3_PER_M3;
  const gravelM3 = volumeM3 * CONCRETE_GRAVEL_M3_PER_M3;

  const steel = estimateStructuralSteelKg(columnsVolumeM3, beamsVolumeM3Calc);

  return {
    slabVolumeM3,
    columnsVolumeM3,
    beamsVolumeM3: beamsVolumeM3Calc,
    volumeM3,
    cementBags,
    sandM3,
    gravelM3,
    aggregateMode,
    ...steel,
  };
}

/**
 * Compatibilidad con resultados guardados antes de desglosar placa/columnas/vigas.
 */
export function normalizeConcreteSlabResult(
  raw: Partial<ConcreteSlabResult> & { volumeM3?: number }
): ConcreteSlabResult {
  if (typeof raw.slabVolumeM3 === "number") {
    const colV = raw.columnsVolumeM3 ?? 0;
    const bmV = raw.beamsVolumeM3 ?? 0;
    const steelFromVol = estimateStructuralSteelKg(colV, bmV);
    return {
      slabVolumeM3: raw.slabVolumeM3,
      columnsVolumeM3: colV,
      beamsVolumeM3: bmV,
      volumeM3:
        raw.volumeM3 ??
        (raw.slabVolumeM3 + (raw.columnsVolumeM3 ?? 0) + (raw.beamsVolumeM3 ?? 0)),
      cementBags: raw.cementBags ?? 0,
      sandM3: raw.sandM3 ?? 0,
      gravelM3: raw.gravelM3 ?? 0,
      aggregateMode: raw.aggregateMode ?? "separate",
      steelKgColumnsEstimate: steelFromVol.steelKgColumnsEstimate,
      steelKgBeamsEstimate: steelFromVol.steelKgBeamsEstimate,
      steelStructuralKgTotal: steelFromVol.steelStructuralKgTotal,
    };
  }
  const v = raw.volumeM3 ?? 0;
  const z = estimateStructuralSteelKg(0, 0);
  return {
    slabVolumeM3: v,
    columnsVolumeM3: 0,
    beamsVolumeM3: 0,
    volumeM3: v,
    cementBags: raw.cementBags ?? 0,
    sandM3: raw.sandM3 ?? 0,
    gravelM3: raw.gravelM3 ?? 0,
    aggregateMode: raw.aggregateMode ?? "separate",
    steelKgColumnsEstimate: z.steelKgColumnsEstimate,
    steelKgBeamsEstimate: z.steelKgBeamsEstimate,
    steelStructuralKgTotal: z.steelStructuralKgTotal,
  };
}
