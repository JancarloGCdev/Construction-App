import { z } from "zod";
import { calcStuccoFinish } from "@/core/calculators/stuccoFinish";
import type { ToolDefinition } from "../toolTypes";

const schema = z.object({
  areaM2: z.coerce.number().positive(),
  stuccoCoats: z.coerce.number().int().min(1).max(4),
  masticCoats: z.coerce.number().int().min(0).max(3),
  paintCoats: z.coerce.number().int().min(0).max(4),
  wastePercent: z.coerce.number().min(0).max(100).optional(),
});

export const calcStuccoFinishTool: ToolDefinition = {
  name: "calc_stucco_finish",
  description:
    "Calcula estuco (kg), masilla/mastic (kg) y pintura (L) según área en m² y número de manos por material.",
  schema,
  execute: (args) => {
    const p = schema.parse(args);
    const { wastePercent: _w, ...rest } = p;
    return calcStuccoFinish(
      rest.areaM2,
      rest.stuccoCoats,
      rest.masticCoats,
      rest.paintCoats
    );
  },
};
