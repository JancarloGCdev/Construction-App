const DEFAULT_DEEPSEEK = "https://api.deepseek.com/v1/chat/completions";

export type ChatCompletionMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type ResolvedLlm = {
  apiKey: string;
  /** URL POST completa (p.ej. .../chat/completions). */
  chatCompletionsUrl: string;
  model: string;
};

/**
 * Detecta Groq (u otro vendor OpenAI-compat) o DeepSeek si hay DEEPSEEK_API_KEY.
 */
export function resolveLlmEnv(): ResolvedLlm | null {
  const compatKey = process.env.OPENAI_COMPATIBLE_API_KEY?.trim();
  const compatUrl =
    process.env.OPENAI_COMPATIBLE_CHAT_URL?.trim() ??
    process.env.OPENAI_CHAT_COMPLETIONS_URL?.trim();
  const compatModel = process.env.OPENAI_COMPATIBLE_MODEL?.trim();
  if (compatKey && compatUrl && compatModel) {
    return {
      apiKey: compatKey,
      chatCompletionsUrl: compatUrl,
      model: compatModel,
    };
  }
  const dsKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (dsKey) {
    const url = process.env.DEEPSEEK_API_URL?.trim() || DEFAULT_DEEPSEEK;
    const model = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
    return {
      apiKey: dsKey,
      chatCompletionsUrl: url,
      model,
    };
  }
  return null;
}

export async function callChatCompletions(
  messages: ChatCompletionMessage[],
  llm: ResolvedLlm,
  opts?: { temperature?: number; max_tokens?: number }
): Promise<string> {
  const r = await fetch(llm.chatCompletionsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${llm.apiKey}`,
    },
    body: JSON.stringify({
      model: llm.model,
      messages,
      temperature: opts?.temperature ?? 0.2,
      max_tokens: opts?.max_tokens ?? 2048,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`LLM ${r.status}: ${t.slice(0, 500)}`);
  }
  const data = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}
