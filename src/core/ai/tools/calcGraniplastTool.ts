import { z } from "zod";
import { calcGraniplast } from "@/core/calculators/graniplast";
import type { ToolDefinition } from "../toolTypes";

const schema = z.object({
  areaM2: z.coerce.number().positive(),
  coats: z.coerce.number().int().min(1).max(4),
  wastePercent: z.coerce.number().min(0).max(100).optional(),
});

export const calcGraniplastTool: ToolDefinition = {
  name: "calc_graniplast",
  description:
    "Calcula kg de material tipo graniplast (texturizado) según área en m² y número de manos.",
  schema,
  execute: (args) => {
    const p = schema.parse(args);
    const { wastePercent: _w, ...dims } = p;
    return calcGraniplast(dims.areaM2, dims.coats);
  },
};
