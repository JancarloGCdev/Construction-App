import { NextResponse } from "next/server";
import { z } from "zod";
import { callChatCompletions, resolveLlmEnv } from "@/lib/llmOpenAICompat";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const bodySchema = z.object({
  itemLabels: z.array(z.string()).min(1).max(40),
});

function buildFallbackSuggestion(labels: string[]): string {
  const list = labels.slice(0, 8);
  const rest = labels.length > 8 ? ` y otros ${labels.length - 8} ítems` : "";
  return `Cotización orientativa que agrupa: ${list.join(", ")}${rest}. Cantidades y valores según calculadoras ConstruYa; confirmar en obra antes de comprometer plazos y montos definitivos.`;
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Validación", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { itemLabels } = parsed.data;
  const llm = resolveLlmEnv();
  if (!llm) {
    return NextResponse.json({
      ok: true,
      suggestion: buildFallbackSuggestion(itemLabels),
      source: "fallback" as const,
    });
  }
  const lines = itemLabels.map((l, i) => `${i + 1}. ${l}`).join("\n");

  const sys =
    "Eres asistente para presupuestos de construcción en Colombia. Escribe en español neutro, tono profesional y breve.";
  const usr = [
    "Estos son los ítems acumulados en el carrito de una cotización:",
    lines,
    "",
    "Genera UN solo párrafo (máx. 600 caracteres) como descripción de alcance para el cliente: qué trabajos abarca conjuntamente, sin precios ni moneda, sin Markdown, sin listas con viñetas.",
  ].join("\n");

  try {
    const text = await callChatCompletions(
      [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
      llm,
      { temperature: 0.45, max_tokens: 380 }
    );
    const trimmed = text.replace(/\s+/g, " ").trim().slice(0, 800);
    const suggestion = trimmed.length >= 20 ? trimmed : buildFallbackSuggestion(itemLabels);
    return NextResponse.json({ ok: true, suggestion, source: "llm" as const });
  } catch (e) {
    return NextResponse.json(
      {
        ok: true,
        suggestion: buildFallbackSuggestion(itemLabels),
        source: "fallback" as const,
        warning: e instanceof Error ? e.message : String(e),
      },
      { status: 200 }
    );
  }
}
