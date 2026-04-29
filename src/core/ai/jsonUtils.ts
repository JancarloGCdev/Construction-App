/**
 * Parseo JSON tolerante para respuestas de modelos (pueden añadir texto alrededor).
 */
export function safeJsonParse(text: string): unknown | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const block = extractJsonBlock(trimmed);
    if (!block) return null;
    try {
      return JSON.parse(block) as unknown;
    } catch {
      return null;
    }
  }
}

/**
 * Extrae el primer bloque JSON object del texto (p. ej. si el modelo envía ```json ... ``` o preámbulo).
 */
export function extractJsonBlock(text: string): string | null {
  const t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    const inner = fence[1].trim();
    if (inner.startsWith("{")) return inner;
  }
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return t.slice(start, end + 1);
}
