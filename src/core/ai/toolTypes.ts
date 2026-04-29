import type { z } from "zod";
import type { ToolName } from "./types";

export type ToolDefinition = {
  name: ToolName;
  description: string;
  schema: z.ZodTypeAny;
  execute: (args: unknown) => Promise<unknown> | unknown;
};
