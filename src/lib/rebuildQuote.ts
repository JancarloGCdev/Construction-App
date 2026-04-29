import { normalizeConcreteSlabResult } from "@/core/calculators";
import {
  buildQuoteFromBlockWall,
  buildQuoteFromConcrete,
  buildQuoteFromGraniplast,
  buildQuoteFromStuccoFinish,
  buildQuoteFromTileLay,
} from "@/core/quote/quoteEngine";
import type { CalculationResult, LastCalculator } from "@/core/types";
import { structuralConcretePhrase } from "@/lib/concreteStructuralLabel";
import { useGuestStore } from "@/store/useGuestStore";

type GetState = typeof useGuestStore.getState;

export function rebuildLastQuote(get: GetState): CalculationResult | null {
  const { lastCalculator, profile, getEffectiveWaste } = get();
  if (!lastCalculator) return null;
  if (lastCalculator.id === "concrete") {
    const w = getEffectiveWaste(lastCalculator.inputs.wastePercent);
    const area = lastCalculator.inputs.lengthM * lastCalculator.inputs.widthM;
    return buildQuoteFromConcrete(
      profile,
      w,
      normalizeConcreteSlabResult(lastCalculator.result),
      area
    );
  }
  if (lastCalculator.id === "blocks") {
    const w = getEffectiveWaste(lastCalculator.inputs.wastePercent);
    return buildQuoteFromBlockWall(profile, w, lastCalculator.result);
  }
  if (lastCalculator.id === "stucco") {
    const w = getEffectiveWaste(lastCalculator.inputs.wastePercent);
    return buildQuoteFromStuccoFinish(profile, w, lastCalculator.result);
  }
  if (lastCalculator.id === "tile") {
    const w = getEffectiveWaste(lastCalculator.inputs.wastePercent);
    return buildQuoteFromTileLay(profile, w, lastCalculator.result);
  }
  const w = getEffectiveWaste(lastCalculator.inputs.wastePercent);
  return buildQuoteFromGraniplast(profile, w, lastCalculator.result);
}

export function lastCalculatorLabel(last: NonNullable<LastCalculator>): string {
  if (last.id === "concrete") {
    const nc = last.inputs.columns?.length ?? 0;
    const nb = last.inputs.beams?.length ?? 0;
    const phrase = structuralConcretePhrase(nc, nb);
    return `Concreto/placa — ${last.inputs.lengthM}×${last.inputs.widthM} m, ${last.inputs.thicknessCm} cm${
      phrase ? ` · ${phrase}` : ""
    }`;
  }
  if (last.id === "blocks") {
    return `Muro bloques — ${last.inputs.lengthM}×${last.inputs.heightM} m · ${last.inputs.blockType}`;
  }
  if (last.id === "stucco") {
    return `Estuco y pintura — ${last.inputs.areaM2} m² (E${last.inputs.stuccoCoats} M${last.inputs.masticCoats} P${last.inputs.paintCoats} manos)`;
  }
  if (last.id === "graniplast") {
    return `Graniplast — ${last.inputs.areaM2} m² · ${last.inputs.coats} mano(s)`;
  }
  return `Cerámica/porcelanato — ${last.inputs.areaM2} m² (pegado)`;
}
