"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { QuoteBreakdown } from "@/components/quote-breakdown";
import { QuotePdfDocument } from "@/components/quote/QuotePdfDocument";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CalculationResult } from "@/core/types";
import { mergeQuoteLineItems } from "@/core/quote/quoteEngine";
import { buildWhatsAppUrl } from "@/lib/format";
import { downloadReactPdf } from "@/lib/downloadPdf";
import { buildQuoteText } from "@/lib/quoteText";
import { getCalculatorBasketVisual } from "@/lib/calculatorBasketVisual";
import { useGuestStore } from "@/store/useGuestStore";
import { ActionFeedbackDialog } from "@/components/feedback/action-feedback-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, FileDown, MessageCircle, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  clientName: z.string().min(1, "Nombre requerido"),
  jobDescription: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

function buildSnapshot(get: typeof useGuestStore.getState): {
  result: CalculationResult | null;
  itemLines: string[];
} {
  const s = get();
  if (s.quoteBasket.length === 0) return { result: null, itemLines: [] };
  return {
    result: mergeQuoteLineItems(
      s.quoteBasket.map((x) => ({ label: x.label, result: x.result })),
      s.profile
    ),
    itemLines: s.quoteBasket.map((x) => x.label),
  };
}

export default function QuotePage() {
  const profile = useGuestStore((st) => st.profile);
  const quoteBasket = useGuestStore((st) => st.quoteBasket);
  const removeFromQuoteBasket = useGuestStore((st) => st.removeFromQuoteBasket);
  const clearQuoteBasket = useGuestStore((st) => st.clearQuoteBasket);
  const setLastQuote = useGuestStore((st) => st.setLastQuote);

  const [result, setResult] = useState<CalculationResult | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; label: string } | null>(null);

  const [aiSuggestionLoading, setAiSuggestionLoading] = useState(false);
  const [aiSnippet, setAiSnippet] = useState<string | null>(null);
  /** Al completar IA: si es true se escribe en el párrafo de descripción. */
  const applyAISuggestionRef = useRef(true);
  /** UI checkbox (debe igualar aplicación en ref tras cada toggle). */
  const [syncDescriptionFromBasket, setSyncDescriptionFromBasket] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { clientName: "", jobDescription: "" },
  });

  const basketSignature = quoteBasket.map((x) => `${x.id}\t${x.label}`).join("\n");

  const dateTimeEsCo = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    []
  );

  const basketDisplayMeta = useMemo(() => {
    const sorted = [...quoteBasket].sort((a, b) => (b.addedAt ?? 0) - (a.addedAt ?? 0));
    const positive = quoteBasket.map((x) => x.addedAt ?? 0).filter((t) => t > 0);
    const mostRecent = positive.length > 0 ? Math.max(...positive) : null;
    const firstNewestId =
      mostRecent !== null ? sorted.find((x) => (x.addedAt ?? 0) === mostRecent)?.id ?? null : null;
    return { sorted, mostRecent, firstNewestId };
  }, [quoteBasket]);

  const itemLines = useMemo(() => quoteBasket.map((x) => x.label), [quoteBasket]);

  const canGenerate = quoteBasket.length > 0;

  const fetchDescriptionSuggestion = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (quoteBasket.length === 0) {
        setAiSnippet(null);
        return;
      }
      if (!opts?.silent) setAiSuggestionLoading(true);
      try {
        const res = await fetch("/api/quote/suggest-description", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemLabels: quoteBasket.map((x) => x.label),
          }),
        });
        const j = (await res.json()) as {
          ok?: boolean;
          suggestion?: string;
        };
        const text =
          typeof j.suggestion === "string" ? j.suggestion.trim().slice(0, 900) : "";
        if (text.length > 0) {
          setAiSnippet(text);
          if (applyAISuggestionRef.current) {
            form.setValue("jobDescription", text, {
              shouldValidate: false,
              shouldDirty: false,
              shouldTouch: false,
            });
          }
        }
      } catch {
        if (!opts?.silent) {
          setFeedback({
            title: "Sugerencia",
            message: "No se pudo contactar la sugerencia ahora mismo. Prueba de nuevo.",
          });
        }
      } finally {
        setAiSuggestionLoading(false);
      }
    },
    [quoteBasket, form]
  );

  useEffect(() => {
    if (quoteBasket.length === 0) {
      setResult(null);
      setAiSnippet(null);
      form.setValue("jobDescription", "");
      applyAISuggestionRef.current = true;
      setSyncDescriptionFromBasket(true);
      return;
    }
    const tid = window.setTimeout(() => {
      void fetchDescriptionSuggestion({ silent: true });
    }, 720);
    return () => window.clearTimeout(tid);
  }, [basketSignature, quoteBasket.length, fetchDescriptionSuggestion, form]);

  const onPreview = useCallback(() => {
    setFormError(null);
    const { result: r, itemLines: lines } = buildSnapshot(useGuestStore.getState);
    if (!r || quoteBasket.length === 0) {
      setFormError("Añadí ítems al carrito desde las calculadoras para generar el desglose.");
      setResult(null);
      return;
    }
    if (lines.length === 0) {
      setFormError("No se pudo armar el resumen.");
      setResult(null);
      return;
    }
    setResult(r);
    setLastQuote(r);
    setFeedback({
      title: "Desglose generado",
      message: "El resumen quedó listo abajo. Podés copiar, WhatsApp o PDF.",
    });
  }, [setLastQuote, quoteBasket.length]);

  const getBuilt = useCallback((): { built: CalculationResult; itemLines: string[] } | null => {
    const snap = buildSnapshot(useGuestStore.getState);
    if (!snap.result || quoteBasket.length === 0) return null;
    return { built: snap.result, itemLines: snap.itemLines };
  }, [quoteBasket.length]);

  function onCopy() {
    setFormError(null);
    const snap = getBuilt() ?? (result && quoteBasket.length ? { built: result, itemLines } : null);
    if (!snap) {
      setFormError("Generá el desglose con el carrito lleno primero.");
      return;
    }
    const t = buildQuoteText({
      clientName: form.getValues("clientName"),
      jobDescription: form.getValues("jobDescription"),
      itemLines: snap.itemLines,
      result: snap.built,
    });
    void navigator.clipboard.writeText(t);
    setFeedback({
      title: "Texto copiado",
      message: "La cotización en texto plano se guardó en el portapapeles.",
    });
  }

  function onWhatsApp() {
    setFormError(null);
    const snap = getBuilt() ?? (result && quoteBasket.length ? { built: result, itemLines } : null);
    if (!snap) {
      setFormError("Generá el desglose con el carrito lleno primero.");
      return;
    }
    const t = buildQuoteText({
      clientName: form.getValues("clientName"),
      jobDescription: form.getValues("jobDescription"),
      itemLines: snap.itemLines,
      result: snap.built,
    });
    window.open(buildWhatsAppUrl(t), "_blank", "noopener,noreferrer");
    setFeedback({
      title: "WhatsApp",
      message:
        "Se abrió una nueva pestaña. Si usas WhatsApp escritorio, Comprueba que el mensaje haya cargado bien.",
    });
  }

  async function onDownloadPdf() {
    setFormError(null);
    const snap = getBuilt() ?? (result && quoteBasket.length ? { built: result, itemLines } : null);
    if (!snap) {
      setFormError("Generá el desglose con el carrito lleno primero.");
      return;
    }
    setPdfBusy(true);
    try {
      const generatedAt = new Intl.DateTimeFormat("es-CO", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date());
      const name = form.getValues("clientName").trim() || "cliente";
      const safe = name.replace(/[^\wáéíóúüñÑ -]/g, "").slice(0, 32) || "obra";
      await downloadReactPdf(
        <QuotePdfDocument
          clientName={form.getValues("clientName")}
          jobDescription={form.getValues("jobDescription")}
          summaryLine={snap.itemLines.join(" · ")}
          result={snap.built}
          generatedAt={generatedAt}
        />,
        `cotizacion-${safe}.pdf`
      );
      setFeedback({
        title: "PDF descargado",
        message: "Revisá la carpeta de descargas del navegador.",
      });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <AppShell title="Cotización rápida" backHref="/">
      <p className="text-sm text-muted-foreground -mt-2 text-pretty">
        Suma uno o más cálculos con <span className="font-medium">Añadir a cotización</span> desde las calculadoras. Solo
        con ítems en el carrito se puede generar el desglose.
      </p>
      <p className="text-sm text-muted-foreground border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/25 rounded-xl px-3 py-2.5 text-pretty leading-relaxed">
        <span className="font-medium text-foreground">Importante:</span> los totales son una{" "}
        <span className="font-medium text-foreground">estimación</span>: los precios cambian por mercado, zona, obra y
        pérdidas reales. No tomes estos números como oferta contractual literal.
      </p>
      <Card className="bg-muted/40 border border-dashed border-border/80">
        <CardHeader className="pb-2 space-y-1">
          <CardTitle className="text-base">Carrito de cotización</CardTitle>
          {quoteBasket.length > 0 ? (
            <CardDescription className="text-xs sm:text-sm leading-relaxed text-pretty">
              {basketDisplayMeta.mostRecent != null ? (
                <>
                  <span className="font-medium text-foreground/90">Último cálculo añadido:</span>{" "}
                  <time
                    className="tabular-nums"
                    dateTime={new Date(basketDisplayMeta.mostRecent).toISOString()}
                  >
                    {dateTimeEsCo.format(new Date(basketDisplayMeta.mostRecent))}
                  </time>
                  . La lista va del más reciente al más antiguo.
                </>
              ) : (
                <>
                  Las partidas anteriores no guardan fecha. Al añadir ítems nuevos verás hora y orden. Lista del más
                  reciente al más antiguo.
                </>
              )}
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {quoteBasket.length === 0 ? (
            <p>
              Todavía no hay ítems. Abrí cada calculadora desde{" "}
              <Link
                className="text-foreground font-semibold underline underline-offset-2 decoration-border hover:decoration-foreground/40"
                href="/calculators"
              >
                Calculadoras
              </Link>{" "}
              y usá <span className="font-medium">Añadir a cotización</span>.
            </p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {basketDisplayMeta.sorted.map((item) => {
                const visual = getCalculatorBasketVisual(item.kind);
                const Icon = visual.icon;
                const ts = item.addedAt ?? 0;
                const isLatest =
                  basketDisplayMeta.firstNewestId !== null &&
                  item.id === basketDisplayMeta.firstNewestId &&
                  ts === basketDisplayMeta.mostRecent &&
                  ts > 0;
                return (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/70 bg-card px-2 py-2 shadow-sm"
                  >
                    <span
                      className={cn(
                        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                        visual.iconClass
                      )}
                      aria-hidden
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground leading-tight">
                        {visual.shortTitle}
                      </p>
                      <p className="mt-0.5 font-medium text-foreground leading-snug break-words">{item.label}</p>
                      {ts > 0 ? (
                        <p className="mt-1 text-[11px] text-muted-foreground tabular-nums sm:text-xs">
                          Añadido{" "}
                          <time dateTime={new Date(ts).toISOString()}>{dateTimeEsCo.format(new Date(ts))}</time>
                          {isLatest ? (
                            <span className="ml-1.5 inline-block rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Reciente
                            </span>
                          ) : null}
                        </p>
                      ) : (
                        <p className="mt-1 text-[11px] text-muted-foreground/85 sm:text-xs leading-snug">
                          Sin marca de hora guardada · las nuevas líneas muestrán fecha automática.
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 h-8 w-8"
                      onClick={() => setRemoveTarget({ id: item.id, label: item.label })}
                      aria-label="Quitar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
              </ul>
              {quoteBasket.length > 1 ? (
                <p className="text-[11px] text-muted-foreground leading-snug pt-2 mt-2 border-t border-dashed border-border/60">
                  El texto, WhatsApp y PDF fusionan las partidas en el orden en que las añadiste; esta lista solo ordena por
                  fecha para ver la más reciente primero.
                </p>
              ) : null}
            </>
          )}
          {quoteBasket.length > 0 ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setClearOpen(true)}>
              Vaciar carrito
            </Button>
          ) : null}
          {!canGenerate ? (
            <p className="pt-1">
              <Link
                className="text-foreground font-semibold underline underline-offset-2 decoration-border hover:decoration-foreground/40"
                href="/calculators"
              >
                Ir a calculadoras
              </Link>
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => onPreview())} className="space-y-4">
          <FormField
            control={form.control}
            name="clientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <FormControl>
                  <Input autoComplete="name" placeholder="Nombre o empresa" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="jobDescription"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <FormLabel className="pt-0.5">Descripción del trabajo</FormLabel>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="shrink-0 gap-1.5"
                    disabled={!canGenerate || aiSuggestionLoading}
                    onClick={() => {
                      applyAISuggestionRef.current = true;
                      setSyncDescriptionFromBasket(true);
                      void fetchDescriptionSuggestion();
                    }}
                  >
                    <Sparkles className={cn("h-3.5 w-3.5", aiSuggestionLoading && "animate-pulse")} />
                    {aiSuggestionLoading ? "Generando…" : "Sugerir con IA"}
                  </Button>
                </div>
                <p className="text-[13px] text-muted-foreground leading-snug text-pretty">
                  La IA arma un párrafo según los ítems del carrito. Podés mantener sincronizado el texto automáticamente o
                  editarlo a mano.
                </p>
                <FormControl>
                  <Textarea
                    placeholder="Alcance, detalles, plazo..."
                    {...field}
                    onChange={(e) => {
                      applyAISuggestionRef.current = false;
                      setSyncDescriptionFromBasket(false);
                      field.onChange(e);
                    }}
                  />
                </FormControl>
                <label className="flex cursor-pointer items-start gap-2 text-xs text-muted-foreground leading-snug select-none">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-border"
                    checked={syncDescriptionFromBasket}
                    onChange={(e) => {
                      const next = e.target.checked;
                      applyAISuggestionRef.current = next;
                      setSyncDescriptionFromBasket(next);
                      if (next && aiSnippet) {
                        form.setValue("jobDescription", aiSnippet);
                      }
                    }}
                  />
                  <span>
                    Cuando cambie el carrito, volver a rellenar la descripción con la última sugerencia de IA.
                  </span>
                </label>
                {quoteBasket.length > 0 && aiSnippet ? (
                  <div
                    className="rounded-lg border border-violet-200/80 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/25 px-3 py-2 text-xs text-muted-foreground"
                    aria-live="polite"
                  >
                    <span className="font-medium text-foreground">Último borrador IA:</span>
                    <p className="mt-1 whitespace-pre-wrap text-pretty">{aiSnippet}</p>
                  </div>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
          <Button type="submit" className="w-full" size="lg" disabled={!canGenerate}>
            Generar / actualizar desglose
          </Button>
        </form>
      </Form>
      <ActionFeedbackDialog
        open={feedback !== null}
        onOpenChange={(o) => {
          if (!o) setFeedback(null);
        }}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant={feedback ? "success" : "default"}
      />

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Vaciar el carrito?</AlertDialogTitle>
            <AlertDialogDescription>
              Se quitarán todos los ítems. No se podrá generar cotización hasta que vuelvas a añadir cálculos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                clearQuoteBasket();
                setClearOpen(false);
                setResult(null);
                setAiSnippet(null);
                form.setValue("jobDescription", "");
                setFeedback({
                  title: "Carrito vacío",
                  message: "Añadí cálculos otra vez cuando quieras armar una cotización.",
                });
              }}
            >
              Sí, vaciar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={removeTarget !== null}
        onOpenChange={(o) => {
          if (!o) setRemoveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar este ítem?</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap break-words">
              {removeTarget ? `«${removeTarget.label}»` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (removeTarget) {
                  removeFromQuoteBasket(removeTarget.id);
                  setRemoveTarget(null);
                  setFeedback({
                    title: "Ítem quitado",
                    message: "El carrito cambió; generá el desglose de nuevo si ya lo habías sacado.",
                  });
                }
              }}
            >
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {result && quoteBasket.length > 0 ? (
        <div className="space-y-3">
          <QuoteBreakdown result={result} />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Base: tu perfil de precios ({profile.profitMargin}% margen). Montos orientativos; vos definís las condiciones
            finales del trabajo.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button type="button" variant="secondary" className="w-full" size="lg" onClick={onCopy}>
              <Copy className="h-4 w-4" />
              Copiar texto
            </Button>
            <Button type="button" className="w-full" size="lg" onClick={onWhatsApp}>
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              type="button"
              className="w-full"
              size="lg"
              variant="outline"
              onClick={() => void onDownloadPdf()}
              disabled={pdfBusy}
            >
              <FileDown className="h-4 w-4" />
              {pdfBusy ? "Generando…" : "Descargar PDF"}
            </Button>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
