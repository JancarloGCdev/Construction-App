import { NextResponse } from "next/server";
import { z } from "zod";
import {
  resolveLlmEnv,
  callChatCompletions,
  type ChatCompletionMessage,
} from "@/lib/llmOpenAICompat";
import { priceCatalogSchema } from "@/lib/schemas/priceCatalog";
import { formatCop } from "@/lib/format";
import type { CalculationResult, PriceCatalog } from "@/core/types";
import { buildSystemPrompt } from "@/core/ai/systemPrompt";
import { safeJsonParse, extractJsonBlock } from "@/core/ai/jsonUtils";
import { executeTool, getToolDefinitions } from "@/core/ai/toolRegistry";
import type { ModelResponse } from "@/core/ai/types";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
  profile: priceCatalogSchema,
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(32000),
      })
    )
    .max(80)
    .optional(),
});

const toolNameSchema = z.enum([
  "calc_concrete_slab",
  "calc_block_wall",
  "calc_tile_lay",
  "calc_stucco_finish",
  "calc_graniplast",
  "generate_quote_from_calc",
  "format_quote_text",
]);

const modelResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("tool_call"),
    tool: toolNameSchema,
    args: z.unknown().optional().default({}),
  }),
  z.object({ type: z.literal("final"), message: z.string().min(1), data: z.unknown().optional() }),
]);

function isCalculationResult(x: unknown): x is CalculationResult {
  if (x == null || typeof x !== "object" || !("totals" in x)) return false;
  const t = (x as { totals?: unknown }).totals;
  if (t == null || typeof t !== "object") return false;
  return "total" in t && "subtotal" in t;
}

function normalizeModel(d: z.infer<typeof modelResponseSchema>): ModelResponse {
  if (d.type === "tool_call") {
    return { type: "tool_call", tool: d.tool, args: d.args ?? {} };
  }
  return d;
}

function parseModelResponseJson(text: string): ModelResponse | null {
  const tryOne = (obj: unknown): ModelResponse | null => {
    if (obj == null || typeof obj !== "object") return null;
    const r = modelResponseSchema.safeParse(obj);
    return r.success ? normalizeModel(r.data) : null;
  };
  const first = safeJsonParse(text);
  const a = tryOne(first);
  if (a) return a;
  const block = extractJsonBlock(text);
  if (block) {
    const j = safeJsonParse(block);
    return tryOne(j);
  }
  return null;
}

/** Detecta texto que no debería mostrarse al usuario (payload interno tipo tool_call). */
function looksLikeLeakedInternalJson(text: string): boolean {
  const t = text.trimStart();
  if (!t.startsWith("{")) return false;
  return (
    /"type"\s*:\s*"tool_call"/.test(t) ||
    /"generate_quote_from_calc"|"calc_concrete_slab"|"calc_block_wall"|"calc_tile_lay"/.test(t)
  );
}

function briefQuoteTotalsLine(q: CalculationResult): string {
  return `Total orientativo según tus precios del perfil: ${formatCop(q.totals.total)} — materiales, mano de obra y margen. Es una estimación; revisá antes de presentar valores al cliente.`;
}

/** Garantiza un texto legible si el modelo respondió sólo JSON técnico. */
function finalizeAssistantText(params: {
  finalMessage: string;
  lastTool: string | undefined;
  lastResult: unknown;
  lastQuote: CalculationResult | undefined;
}): string {
  const fmtStr =
    typeof params.lastResult === "string" ? params.lastResult.trim() : "";
  const raw = params.finalMessage.trim();

  if (params.lastTool === "format_quote_text" && fmtStr.length >= 120) {
    return fmtStr.slice(0, 14000);
  }

  if (raw.length > 0 && !looksLikeLeakedInternalJson(raw)) {
    return raw.slice(0, 14000);
  }

  if (fmtStr.length >= 160) {
    return fmtStr.slice(0, 14000);
  }

  if (params.lastQuote) {
    return briefQuoteTotalsLine(params.lastQuote);
  }

  return "Listo el cálculo; si no ves el detalle, pedí de nuevo un resumen o indicá medidas más precisas.";
}

type ChatMsg = ChatCompletionMessage;

function parseMockDimsConcrete(msg: string): { length: number; width: number; thicknessCm: number } {
  const m = /(\d+[.,]?\d*)\s*(?:m\s*)?x\s*(\d+[.,]?\d*)/i.exec(msg);
  const l = m ? parseFloat(m[1].replace(",", ".")) : 4;
  const w = m ? parseFloat(m[2].replace(",", ".")) : 3;
  const th = /(\d+[.,]?\d*)\s*cm/.exec(msg);
  const t = th ? parseFloat(th[1].replace(",", ".")) : 10;
  return { length: l > 0 ? l : 4, width: w > 0 ? w : 3, thicknessCm: t > 0 ? t : 10 };
}

function parseMockDimsBlock(msg: string): { length: number; height: number } {
  const m = /(\d+[.,]?\d*)\s*(?:m\s*)?x\s*(\d+[.,]?\d*)/i.exec(msg);
  const l = m ? parseFloat(m[1].replace(",", ".")) : 4;
  const h = m ? parseFloat(m[2].replace(",", ".")) : 2.4;
  return { length: l > 0 ? l : 4, height: h > 0 ? h : 2.4 };
}

function parseMockTileAreaM2(msg: string): number {
  const sq = /(\d+[.,]?\d*)\s*m(?:²|2)(?:\s*cuadrad)?.?/i.exec(msg);
  if (sq) {
    const v = parseFloat(sq[1].replace(",", "."));
    return v > 0 ? v : 12;
  }
  const m = /(\d+[.,]?\d*)\s*metros\s*cuadrad/i.exec(msg);
  if (m) {
    const v = parseFloat(m[1].replace(",", "."));
    return v > 0 ? v : 12;
  }
  const naked = /\b(\d{1,4}[.,]\d+|\d{1,5})\b/.exec(msg);
  if (naked) {
    const v = parseFloat(naked[1].replace(",", "."));
    if (v > 0 && v < 5000) return v;
  }
  return 12;
}

/** Si no hay clave del modelo en el servidor: flujo determinista por palabras clave (calc + cotización), sin LLM real. */
async function runMockPipeline(
  message: string,
  profile: PriceCatalog
): Promise<{
  message: string;
  toolUsed?: string;
  toolResult?: unknown;
  quote?: CalculationResult;
}> {
  const lower = message.toLowerCase();
  const isConcrete = /placa|concreto|losa|cemento/.test(lower) && !/cerámica|porcel/.test(lower);
  const isBlock = /muro|bloque|bovedilla|ladrill/.test(lower);
  const isTile = /cerámica|ceramica|porcelanato|gres|pegado\s+de\s+baldos|baldosas|pisos\s+tipo|rejunte\b/.test(lower);

  if (isTile && !isBlock && !isConcrete) {
    const areaM2 = parseMockTileAreaM2(message);
    const laying = executeTool("calc_tile_lay", { areaM2 });
    const quote = executeTool("generate_quote_from_calc", {
      calculator: "tile_lay" as const,
      calcResult: laying,
      profile,
    }) as CalculationResult;
    const text = executeTool("format_quote_text", {
      quote,
      clientName: "Cliente",
    }) as string;
    return {
      message: String(text).slice(0, 3000),
      toolUsed: "format_quote_text",
      toolResult: text,
      quote,
    };
  }
  const isGraniplastKeyword = /\bgraniplast\b/.test(lower);
  const isEstucoKeyword = /\bestuco\b/.test(lower);
  /** Estuco: evita confundir con «muro de bloques»; «graniplast» va aparte antes. */
  if (isGraniplastKeyword && !isTile && !isConcrete) {
    const areaM2 = parseMockTileAreaM2(message);
    const coats = /\b(\d+)\s*(?:manos?|pasadas?)\b/i.exec(lower);
    const c = coats ? Math.min(4, Math.max(1, parseInt(coats[1], 10) || 2)) : 2;
    const gran = executeTool("calc_graniplast", { areaM2, coats: c });
    const quote = executeTool("generate_quote_from_calc", {
      calculator: "graniplast" as const,
      calcResult: gran,
      profile,
    }) as CalculationResult;
    const text = executeTool("format_quote_text", {
      quote,
      clientName: "Cliente",
    }) as string;
    return {
      message: String(text).slice(0, 3000),
      toolUsed: "format_quote_text",
      toolResult: text,
      quote,
    };
  }
  if (isEstucoKeyword && !isTile && !isGraniplastKeyword) {
    const areaM2 = parseMockTileAreaM2(message);
    const stuccoFinish = executeTool("calc_stucco_finish", {
      areaM2,
      stuccoCoats: 2,
      masticCoats: 1,
      paintCoats: 2,
    });
    const quote = executeTool("generate_quote_from_calc", {
      calculator: "stucco_finish" as const,
      calcResult: stuccoFinish,
      profile,
    }) as CalculationResult;
    const text = executeTool("format_quote_text", {
      quote,
      clientName: "Cliente",
    }) as string;
    return {
      message: String(text).slice(0, 3000),
      toolUsed: "format_quote_text",
      toolResult: text,
      quote,
    };
  }
  if (isConcrete && !isBlock) {
    const dims = parseMockDimsConcrete(message);
    const slab = executeTool("calc_concrete_slab", {
      length: dims.length,
      width: dims.width,
      thicknessCm: dims.thicknessCm,
    });
    const areaM2 = dims.length * dims.width;
    const quote = executeTool("generate_quote_from_calc", {
      calculator: "concrete_slab" as const,
      calcResult: slab,
      profile,
      areaM2,
    }) as CalculationResult;
    const text = executeTool("format_quote_text", {
      quote,
      clientName: "Cliente",
    }) as string;
    return {
      message: String(text).slice(0, 3000),
      toolUsed: "format_quote_text",
      toolResult: text,
      quote,
    };
  }
  if (isBlock) {
    const d = parseMockDimsBlock(message);
    const wall = executeTool("calc_block_wall", {
      length: d.length,
      height: d.height,
    });
    const quote = executeTool("generate_quote_from_calc", {
      calculator: "block_wall" as const,
      calcResult: wall,
      profile,
    }) as CalculationResult;
    const text = executeTool("format_quote_text", {
      quote,
      clientName: "Cliente",
    }) as string;
    return {
      message: String(text).slice(0, 3000),
      toolUsed: "format_quote_text",
      toolResult: text,
      quote,
    };
  }
  return {
    message:
      "No alcancé a armar un cálculo desde ese texto. Prueba: cerámica/porcelanato + m², placa/concreto con medidas, muro/bloques con tamaño, «graniplast» + m² (opcional número de manos), o «estuco» + m². Sin servicio de IA estas frases siguen patrones concretos; con IA activa admite preguntas más libres.",
  };
}

type ApiOk = {
  ok: true;
  message: string;
  toolUsed?: string;
  toolResult?: unknown;
  quote?: CalculationResult;
};

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo JSON inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validación", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { message, profile, history: rawHistory } = parsed.data;

  /** Últimos turnos antes del mensaje actual (solo user/assistant, sin sistema). */
  const priorTurns =
    rawHistory?.slice(Math.max(0, (rawHistory?.length ?? 0) - 48)) ?? [];

  /** Modo sin LLM: inyectamos un poco de contexto de conversación para heurísticas. */
  const combinedForMock = (() => {
    if (!priorTurns.length) return message;
    const tail = priorTurns
      .slice(-8)
      .map((t) => `${t.role}: ${t.content}`)
      .join("\n");
    return `[Contexto reciente]\n${tail}\n\n[mensaje actual]\n${message}`;
  })();

  const llm = resolveLlmEnv();
  if (!llm) {
    try {
      const m = await runMockPipeline(combinedForMock, profile);
      const body: ApiOk = { ok: true, ...m };
      return NextResponse.json(body);
    } catch (e) {
      return NextResponse.json(
        {
          ok: false,
          message: e instanceof Error ? e.message : "No se pudo generar la cotización desde el mensaje.",
        } as { ok: false; message: string },
        { status: 500 }
      );
    }
  }

  const system = buildSystemPrompt(JSON.stringify(profile));
  const threaded: ChatCompletionMessage[] = [];
  for (const t of priorTurns) {
    threaded.push({ role: t.role, content: t.content });
  }

  const history: ChatCompletionMessage[] = [
    { role: "system", content: system },
    ...threaded,
    { role: "user", content: message },
  ];
  const MAX = 12;
  let lastTool: string | undefined;
  let lastResult: unknown;
  let lastQuote: CalculationResult | undefined;
  let finalMessage = "";
  const toolsSummary = getToolDefinitions()
    .map((t) => `${t.name}: ${t.description}`)
    .join("\n");

  try {
    for (let i = 0; i < MAX; i++) {
      const content = await callChatCompletions(history, llm);
      if (!content) {
        finalMessage = "No hubo respuesta del modelo.";
        break;
      }
      const mres = parseModelResponseJson(content);
      if (!mres) {
        history.push({ role: "assistant", content });
        const hint =
          "La respuesta anterior no era JSON reconocible. Devuelve SOLO un JSON con type 'tool_call' o 'final', sin markdown extra.";
        history.push({ role: "user", content: `${hint} Tools:\n${toolsSummary}` });
        if (i === MAX - 1) {
          finalMessage =
            (content || "").slice(0, 4000) ||
            "No se pudo extraer un JSON. Configura un modelo o acota el mensaje.";
        }
        continue;
      }
      history.push({ role: "assistant", content: JSON.stringify(mres) });

      if (mres.type === "final") {
        finalMessage = mres.message;
        if (mres.data && isCalculationResult(mres.data)) {
          lastQuote = mres.data;
        }
        break;
      }

      if (mres.type === "tool_call") {
        let tr: unknown;
        try {
          if (mres.tool === "generate_quote_from_calc" && mres.args) {
            const a =
              mres.args as Record<string, unknown> & { profile?: PriceCatalog };
            tr = await Promise.resolve(
              executeTool("generate_quote_from_calc", { ...a, profile })
            );
          } else {
            tr = await Promise.resolve(executeTool(mres.tool, mres.args));
          }
        } catch (e) {
          tr = { error: e instanceof Error ? e.message : "Error al ejecutar tool" };
        }
        lastTool = mres.tool;
        lastResult = tr;
        if (isCalculationResult(tr)) {
          lastQuote = tr;
        }
        const payload = {
          tool: mres.tool,
          args: mres.args,
          result: tr,
        };
        history.push({
          role: "user",
          content: [
            "Resultado de herramienta (sistema, JSON). Continúa con un único JSON:",
            JSON.stringify(payload),
            "Si el trabajo de cotización está listo, usa type final. Si faltan datos, pregunta en final.",
            "Si hace falta otra tool, responde con tool_call de nuevo (máx. cadena: calc → generate_quote → format_quote o final resumiendo).",
          ].join("\n\n"),
        });
      }
    }
    if (!finalMessage.trim()) {
      finalMessage = lastQuote
        ? briefQuoteTotalsLine(lastQuote)
        : typeof lastResult === "string" && lastResult.trim().length > 80
          ? lastResult.trim()
          : lastResult
            ? "La cotización sigue disponible como datos en la respuesta; pedí que te la resuma o prueba preguntando de nuevo en una frase."
            : "No se obtuvo un mensaje final. Reintenta con instrucciones más concretas (medidas, tipo de ítem).";
    }
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        message: e instanceof Error ? e.message : "Error al contactar al modelo",
      } as { ok: false; message: string },
      { status: 502 }
    );
  }

  const replyPlain = finalizeAssistantText({
    finalMessage,
    lastTool,
    lastResult,
    lastQuote,
  });

  const out: ApiOk = {
    ok: true,
    message: replyPlain,
    toolUsed: lastTool,
    toolResult: lastResult,
    quote: lastQuote,
  };
  return NextResponse.json(out);
}
