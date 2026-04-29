import { z } from "zod";
import { calcConcreteSlab } from "@/core/calculators/concreteSlab";
import type { ConcreteBeamInput, ConcreteColumnInput } from "@/core/types";
import type { ToolDefinition } from "../toolTypes";

const columnSchema = z.object({
  qty: z.coerce.number().int().positive(),
  sectionWidthCm: z.coerce.number().positive(),
  sectionDepthCm: z.coerce.number().positive(),
  heightM: z.coerce.number().positive(),
});

const beamSchema = z.object({
  qty: z.coerce.number().int().positive(),
  spanM: z.coerce.number().positive(),
  widthCm: z.coerce.number().positive(),
  depthCm: z.coerce.number().positive(),
});

const schema = z.object({
  length: z.coerce.number().positive(),
  width: z.coerce.number().positive(),
  thicknessCm: z.coerce.number().positive(),
  wastePercent: z.coerce.number().min(0).max(100).optional(),
  aggregateMode: z.enum(["separate", "balasto"]).optional(),
  columns: z.array(columnSchema).optional().default([]),
  beams: z.array(beamSchema).optional().default([]),
});

export const calcConcreteSlabTool: ToolDefinition = {
  name: "calc_concrete_slab",
  description:
    "Placa de concreto: volumen, cemento y agregados (arena+grava o balasto único). Opcional: columnas rectangulares (cantidad × ancho × fondo cm × alto m), vigas (cantidad × tramo m × sección cm).",
  schema,
  execute: (args) => {
    const p = schema.parse(args);
    const { wastePercent: _w, length, width, thicknessCm, columns, beams, aggregateMode } = p;
    return calcConcreteSlab(length, width, thicknessCm, {
      columns: columns as ConcreteColumnInput[],
      beams: beams as ConcreteBeamInput[],
      aggregateMode,
    });
  },
};
