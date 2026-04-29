export type ToolName =
  | "calc_concrete_slab"
  | "calc_block_wall"
  | "calc_tile_lay"
  | "calc_stucco_finish"
  | "calc_graniplast"
  | "generate_quote_from_calc"
  | "format_quote_text";

export type ToolCall = {
  type: "tool_call";
  tool: ToolName;
  args: unknown;
};

export type FinalResponse = {
  type: "final";
  message: string;
  data?: unknown;
};

export type ModelResponse = ToolCall | FinalResponse;
