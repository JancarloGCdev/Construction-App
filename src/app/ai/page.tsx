"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronLeft, Mic, Send, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useGuestStore } from "@/store/useGuestStore";
import type { AiAssistantChatMessage, CalculationResult } from "@/core/types";
import { useSpeechDictation } from "@/hooks/useSpeechDictation";
import { formatCop } from "@/lib/format";
import { cn } from "@/lib/utils";

const schema = z.object({
  message: z.string().min(1, "Escribe o dicta un mensaje").max(8000),
});

type FormValues = z.infer<typeof schema>;

type ApiSuccess = {
  ok: true;
  message: string;
  toolUsed?: string;
  toolResult?: unknown;
  quote?: CalculationResult;
};

type ApiError = { ok: false; message?: string; error?: string };

function isRecord(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object";
}

function isCalc(x: unknown): x is CalculationResult {
  if (!isRecord(x) || !isRecord(x.totals as object)) return false;
  return typeof (x.totals as { total?: unknown }).total === "number";
}

function speechErrorLabel(code: string): string {
  const m: Record<string, string> = {
    "not-allowed": "Activa el permiso de micrófono en el navegador",
    "service-not-allowed": "No se pudo acceder al micrófono (revisa permisos o otro app usando el micro)",
    "no-speech": "No se escuchó voz; prueba de nuevo, más cerca del micrófono",
    // network en Chrome suele ser internet/firewall/VPN, no necesariamente el permiso del micro
    network:
      "No se pudo conectar con el servicio de dictado (suele ser internet, VPN, firewall o red bloqueada). " +
      "Comprueba datos/WiFi, prueba sin VPN, o vuelve a intentar. El micrófono puede estar bien.",
    "language-not-supported": "Prueba otra frase; si sigue, escribe el mensaje manualmente",
    "audio-capture": "No se pudo leer el audio del micro; cierra otras apps que lo usen o revisa el permiso",
    aborted: "Reconocimiento detenido",
    unsupported: "Dictado no disponible en este navegador (recomendado: Chrome, en Android con internet)",
  };
  return m[code] ?? `Voz: ${code}`;
}

function newBubbleId(role: string): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${role}-${globalThis.crypto.randomUUID()}`;
  }
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function AiPage() {
  const id = useId();
  const profile = useGuestStore((s) => s.profile);
  const saveQuoteToStore = useGuestStore((s) => s.setLastQuote);
  const messages = useGuestStore((s) => s.aiAssistantChat);
  const setAiAssistantChat = useGuestStore((s) => s.setAiAssistantChat);
  const clearAiAssistantChat = useGuestStore((s) => s.clearAiAssistantChat);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [lastQuote, setLastQuoteState] = useState<CalculationResult | null>(null);
  const prefixRef = useRef("");

  const scroller = useRef<HTMLDivElement | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { message: "" },
  });
  const watchMessage = form.watch("message");

  const scrollBottom = useCallback(() => {
    const el = scroller.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    scrollBottom();
  }, [messages, scrollBottom]);

  const onSessionText = useCallback(
    (session: string) => {
      const prefix = prefixRef.current;
      const next = [prefix, session]
        .filter((p) => p && String(p).trim().length > 0)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      form.setValue("message", next, { shouldValidate: true, shouldDirty: true });
    },
    [form]
  );

  const { listening, start, stop, supported, ready: speechReady } = useSpeechDictation({
    onSessionText,
    onError: (code) => {
      setSpeechError(speechErrorLabel(code));
    },
  });

  const toggleMic = useCallback(() => {
    if (listening) {
      stop();
      return;
    }
    setSpeechError(null);
    prefixRef.current = (form.getValues("message") || "").trim();
    start();
  }, [form, listening, start, stop]);

  const sendMessage = form.handleSubmit(async (data) => {
    if (listening) {
      stop();
    }
    setApiError(null);
    const userContent = data.message.trim();
    const prior = [...useGuestStore.getState().aiAssistantChat];
    const histForApi = prior.map((m) => ({ role: m.role, content: m.content }));
    const userBubble: AiAssistantChatMessage = {
      id: newBubbleId("user"),
      role: "user",
      content: userContent,
    };
    setAiAssistantChat([...prior, userBubble]);
    form.reset({ message: "" });
    prefixRef.current = "";
    setLoading(true);
    setLastQuoteState(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userContent,
          profile,
          history: histForApi,
        }),
      });
      const j = (await res.json()) as ApiSuccess | ApiError;
      if (!res.ok || !isRecord(j) || j.ok === false) {
        setAiAssistantChat(prior);
        const msg =
          (!isRecord(j) ? "Respuesta inválida" : j.message ?? (j as ApiError).error) ||
          `Error ${res.status}`;
        setApiError(String(msg));
        return;
      }
      const assistantBubble: AiAssistantChatMessage = {
        id: newBubbleId("assistant"),
        role: "assistant",
        content: j.message,
      };
      setAiAssistantChat([...prior, userBubble, assistantBubble]);
      if (j.quote && isCalc(j.quote)) {
        setLastQuoteState(j.quote);
      } else {
        setLastQuoteState(null);
      }
    } catch (e) {
      setAiAssistantChat(prior);
      setApiError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  });

  function confirmClearHistory() {
    if (messages.length === 0 && !loading) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm("¿Borrar todo el chat del asistente en este equipo? Esta acción no se puede deshacer.")
    ) {
      return;
    }
    clearAiAssistantChat();
    setLastQuoteState(null);
    setApiError(null);
  }

  return (
    <div className="flex h-dvh max-h-dvh w-full max-w-lg mx-auto flex-col bg-background">
      <header className="shrink-0 flex items-center gap-3 border-b border-border/80 bg-card/30 px-3 py-2">
        <Link
          href="/"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm"
          aria-label="Volver"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold leading-tight">Asistente IA</h1>
          <p className="text-xs text-muted-foreground truncate">Materiales y cotizaciones (COP)</p>
          <p className="text-[11px] text-muted-foreground/90 mt-0.5">El chat se guarda en este dispositivo para continuar la conversación.</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1 text-muted-foreground"
          onClick={() => confirmClearHistory()}
          disabled={messages.length === 0 && !loading}
          title="Vaciar historial guardado aquí"
        >
          <Trash2 className="h-4 w-4" />
          <span className="hidden sm:inline text-xs">Borrar</span>
        </Button>
      </header>

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3 space-y-3"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.length === 0 && !lastQuote && (
          <p className="text-sm text-muted-foreground text-pretty">
            Pregunta por una placa, un muro o pide un presupuesto. Tus mensajes anteriores siguen aquí al volver
            (se guardan solo en este equipo). Podés{" "}
            <span className="text-foreground font-medium">dictar</span> con el micrófono (mejor en
            Chrome, sobre todo en Android).
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex w-full", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                m.role === "user"
                  ? "bg-slate-800 text-slate-50"
                  : "bg-card border border-border/80 text-foreground"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <p className="text-xs text-muted-foreground px-1 animate-pulse">Pensando…</p>
        )}

        {lastQuote && (
          <Card className="border border-border/90 bg-gradient-to-b from-card to-muted/25 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cotización detectada en la respuesta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (antes de margen)</span>
                <span className="font-medium tabular-nums">
                  {formatCop(lastQuote.totals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ganancia (margen)</span>
                <span className="font-medium tabular-nums">
                  {formatCop(lastQuote.totals.profit)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-border/80">
                <span>Total</span>
                <span className="text-foreground tabular-nums">
                  {formatCop(lastQuote.totals.total)}
                </span>
              </div>
              <Button
                className="w-full mt-2"
                type="button"
                variant="secondary"
                onClick={() => {
                  saveQuoteToStore(lastQuote);
                }}
              >
                Guardar como última cotización
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="shrink-0 border-t border-border/80 bg-background/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-2">
        {listening && (
          <p
            className="text-center text-sm font-medium text-destructive animate-pulse"
            id={`${id}-rec`}
            role="status"
          >
            🎙️ Escuchando…
          </p>
        )}
        {speechReady && !supported && (
          <p className="text-center text-xs text-amber-700 dark:text-amber-400">
            Tu navegador no soporta dictado por voz o la página no es HTTPS. Usa Chrome (mejor en
            Android) o escribe el mensaje.
          </p>
        )}
        {speechError && (
          <p
            className="text-left text-pretty text-xs text-destructive leading-snug max-w-prose mx-auto"
            role="alert"
          >
            {speechError}
          </p>
        )}
        {apiError && (
          <p className="text-center text-xs text-destructive" role="alert">
            {apiError}
          </p>
        )}
        <Form {...form}>
          <form onSubmit={sendMessage} className="space-y-2">
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Escribe o dicta con el micrófono…"
                      className="min-h-[80px] max-h-40 resize-none"
                      readOnly={loading}
                      aria-label="Mensaje"
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex items-end gap-2">
              <Button
                type="button"
                size="icon"
                variant={listening ? "destructive" : "secondary"}
                className={cn(
                  "h-12 w-12 shrink-0 rounded-xl",
                  listening && "animate-pulse"
                )}
                onClick={toggleMic}
                disabled={loading || (speechReady && !supported)}
                aria-pressed={listening}
                aria-describedby={listening ? `${id}-rec` : undefined}
                title={listening ? "Detener" : "Hablar"}
              >
                {listening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                type="submit"
                className="flex-1 h-12 rounded-xl gap-2"
                disabled={loading || !String(watchMessage).trim()}
                title="Enviar (se detiene el micrófono si estaba activo)"
              >
                <Send className="h-4 w-4" />
                {loading ? "Enviando…" : "Enviar"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
