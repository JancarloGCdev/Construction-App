import { z } from "zod";
import { calcTileLay } from "@/core/calculators/tileLay";
import type { ToolDefinition } from "../toolTypes";

const schema = z.object({
  areaM2: z.coerce.number().positive(),
  wastePercent: z.coerce.number().min(0).max(100).optional(),
});

export const calcTileLayTool: ToolDefinition = {
  name: "calc_tile_lay",
  description:
    "Calcula adhesivo + rejunte aproximados (kg) para pegar cerámica o porcelanato sobre un área en m². No incluye baldosas ni impermeabilizante.",
  schema,
  execute: (args) => {
    const p = schema.parse(args);
    return calcTileLay(p.areaM2);
  },
};
