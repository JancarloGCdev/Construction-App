import { z } from "zod";
import type {
  BlockWallResult,
  ConcreteSlabResult,
  GraniplastResult,
  PriceCatalog,
  StuccoFinishResult,
  TileLayResult,
} from "@/core/types";
import {
  buildQuoteFromBlockWall,
  buildQuoteFromConcrete,
  buildQuoteFromGraniplast,
  buildQuoteFromStuccoFinish,
  buildQuoteFromTileLay,
} from "@/core/quote/quoteEngine";
import { priceCatalogSchema } from "@/lib/schemas/priceCatalog";
import type { ToolDefinition } from "../toolTypes";

const schema = z
  .object({
    calculator: z.enum([
      "concrete_slab",
      "block_wall",
      "stucco_finish",
      "graniplast",
      "tile_lay",
    ]),
    calcResult: z.any(),
    profile: priceCatalogSchema,
    areaM2: z.coerce.number().positive().optional(),
    wastePercent: z.coerce.number().min(0).max(100).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.calculator === "concrete_slab" && (val.areaM2 === undefined || val.areaM2 === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "areaM2 es obligatoria para concrete_slab",
        path: ["areaM2"],
      });
    }
  });

export const generateQuoteTool: ToolDefinition = {
  name: "generate_quote_from_calc",
  description:
    "Convierte un resultado de calculadora + perfil en CalculationResult (COP, margen sobre costo obra). Incluye concreto, muro, estuco/pintura, graniplast y pegado cerámica/porcelanato.",
  schema: schema as z.ZodTypeAny,
  execute: (args) => {
    const p = schema.parse(args) as {
      calculator: "concrete_slab" | "block_wall" | "stucco_finish" | "graniplast" | "tile_lay";
      calcResult: unknown;
      profile: PriceCatalog;
      areaM2?: number;
      wastePercent?: number;
    };
    const waste =
      p.wastePercent !== undefined && !Number.isNaN(p.wastePercent)
        ? p.wastePercent
        : p.profile.wastePercent;
    if (p.calculator === "concrete_slab") {
      if (p.areaM2 === undefined) {
        throw new Error("areaM2 requerida para placa de concreto");
      }
      return buildQuoteFromConcrete(
        p.profile,
        waste,
        p.calcResult as ConcreteSlabResult,
        p.areaM2
      );
    }
    if (p.calculator === "block_wall") {
      return buildQuoteFromBlockWall(
        p.profile,
        waste,
        p.calcResult as BlockWallResult
      );
    }
    if (p.calculator === "stucco_finish") {
      return buildQuoteFromStuccoFinish(
        p.profile,
        waste,
        p.calcResult as StuccoFinishResult
      );
    }
    if (p.calculator === "tile_lay") {
      return buildQuoteFromTileLay(p.profile, waste, p.calcResult as TileLayResult);
    }
    return buildQuoteFromGraniplast(
      p.profile,
      waste,
      p.calcResult as GraniplastResult
    );
  },
};
