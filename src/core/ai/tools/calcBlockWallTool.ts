import { z } from "zod";
import { calcBlockWall } from "@/core/calculators/blockWall";
import type { ToolDefinition } from "../toolTypes";

const schema = z.object({
  length: z.coerce.number().positive(),
  height: z.coerce.number().positive(),
  wastePercent: z.coerce.number().min(0).max(100).optional(),
});

export const calcBlockWallTool: ToolDefinition = {
  name: "calc_block_wall",
  description: "Calcula área y bloques aproximados para muro (12,5 und/m²).",
  schema,
  execute: (args) => {
    const p = schema.parse(args);
    return calcBlockWall(p.length, p.height);
  },
};
