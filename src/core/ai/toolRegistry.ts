import { z } from "zod";
import type { ToolName } from "./types";
import type { ToolDefinition } from "./toolTypes";
import { calcConcreteSlabTool } from "./tools/calcConcreteSlabTool";
import { calcBlockWallTool } from "./tools/calcBlockWallTool";
import { calcTileLayTool } from "./tools/calcTileLayTool";
import { calcStuccoFinishTool } from "./tools/calcStuccoFinishTool";
import { calcGraniplastTool } from "./tools/calcGraniplastTool";
import { generateQuoteTool } from "./tools/generateQuoteTool";
import { formatQuoteTextTool } from "./tools/formatQuoteTextTool";

const ALL: ToolDefinition[] = [
  calcConcreteSlabTool,
  calcBlockWallTool,
  calcTileLayTool,
  calcStuccoFinishTool,
  calcGraniplastTool,
  generateQuoteTool,
  formatQuoteTextTool,
];

const BY_NAME = new Map<ToolName, ToolDefinition>(
  ALL.map((t) => [t.name, t] as const)
);

export function getToolDefinitions(): readonly ToolDefinition[] {
  return ALL;
}

const toolNameSchema = z.enum([
  "calc_concrete_slab",
  "calc_block_wall",
  "calc_tile_lay",
  "calc_stucco_finish",
  "calc_graniplast",
  "generate_quote_from_calc",
  "format_quote_text",
]);

export function executeTool(name: string, args: unknown): Promise<unknown> | unknown {
  if (!toolNameSchema.safeParse(name).success) {
    throw new Error(`Herramienta no registrada: ${name}`);
  }
  const def = BY_NAME.get(name as ToolName);
  if (!def) {
    throw new Error(`Herramienta no registrada: ${name}`);
  }
  const parsed = def.schema.safeParse(args);
  if (!parsed.success) {
    throw new Error(
      `Args inválidos para ${name}: ${parsed.error.message}`
    );
  }
  return def.execute(parsed.data);
}
