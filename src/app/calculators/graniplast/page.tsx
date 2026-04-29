"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { calcGraniplast } from "@/core/calculators";
import { GRANIPLAST_SAC_REF_KG } from "@/core/pricing/packaging";
import { ceilSacksByKg } from "@/core/pricing/purchaseRounding";
import { buildQuoteFromGraniplast } from "@/core/quote/quoteEngine";
import { useGuestStore } from "@/store/useGuestStore";
import { AfterCalculateQuoteCta } from "@/components/calculators/after-calc-quote-cta";
import { AddToQuoteModalFlow } from "@/components/calculators/add-to-quote-modal-flow";
import { ShoppingCart } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  areaM2: z.coerce.number().min(0.1, "Área mín. 0,1 m²"),
  coats: z.coerce.number().int().min(1).max(4),
  wastePercent: z
    .string()
    .optional()
    .refine(
      (s) => s === undefined || s.trim() === "" || !Number.isNaN(Number(s.replace(",", "."))),
      "Número inválido"
    )
    .refine(
      (s) => {
        if (s === undefined || s.trim() === "") return true;
        const n = Number(s.replace(",", "."));
        return n >= 0 && n <= 100;
      },
      "Desperdicio entre 0 y 100"
    ),
});

type FormValues = z.infer<typeof schema>;

function parseWaste(s: string | undefined): number | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  if (t === "") return undefined;
  return Number(t.replace(",", "."));
}

export default function GraniplastCalculatorPage() {
  const router = useRouter();
  const { profile, setLastCalculator, getEffectiveWaste, addToQuoteBasket } = useGuestStore();
  const [showQuoteShortcut, setShowQuoteShortcut] = useState(false);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [successAddOpen, setSuccessAddOpen] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<FormValues | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { areaM2: 20, coats: 2, wastePercent: "" },
  });
  const area = useWatch({ control: form.control, name: "areaM2" });
  const coats = useWatch({ control: form.control, name: "coats" });

  const preview = useMemo(() => {
    if (!area || area <= 0) return null;
    const calc = calcGraniplast(area, coats ?? 2);
    return {
      ...calc,
      sacos: ceilSacksByKg(calc.graniplastKg, GRANIPLAST_SAC_REF_KG),
    };
  }, [area, coats]);

  function onCalculate(data: FormValues) {
    const r = calcGraniplast(data.areaM2, data.coats);
    setLastCalculator({
      id: "graniplast",
      inputs: {
        areaM2: data.areaM2,
        coats: data.coats,
        wastePercent: parseWaste(data.wastePercent) ?? null,
      },
      result: r,
    });
    setShowQuoteShortcut(true);
  }

  function commitAddToQuote(data: FormValues) {
    const waste = getEffectiveWaste(parseWaste(data.wastePercent));
    const r = calcGraniplast(data.areaM2, data.coats);
    const line = `Graniplast ${data.areaM2} m² · ${data.coats} mano(s)`;
    onCalculate(data);
    const partial = buildQuoteFromGraniplast(profile, waste, r);
    addToQuoteBasket({ kind: "graniplast", label: line, result: partial });
  }

  return (
    <AppShell title="Graniplast" backHref="/calculators">
      <p className="text-sm text-muted-foreground -mt-2 text-pretty">
        Consumo referencia ~2,8 kg/m² por mano (texturizado). Precio por kg en Configurar precios. Desperdicio
        vacío = perfil.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="areaM2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Área (m²)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manos</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={String(field.value ?? 2)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4].map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="wastePercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desperdicio (%), opcional</FormLabel>
                <FormControl>
                  <Input
                    inputMode="decimal"
                    placeholder={`Perfil: ${profile.wastePercent}%`}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button type="submit" className="w-full" size="lg" variant="secondary">
              Calcular
            </Button>
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={form.handleSubmit((d) => {
                setPendingAdd(d);
                setConfirmAddOpen(true);
              })}
            >
              <ShoppingCart className="h-4 w-4" />
              Añadir a cotización
            </Button>
          </div>
        </form>
      </Form>

      <AddToQuoteModalFlow
        confirmOpen={confirmAddOpen}
        onConfirmOpenChange={setConfirmAddOpen}
        onConfirmAdd={() => {
          if (pendingAdd) {
            commitAddToQuote(pendingAdd);
            setSuccessAddOpen(true);
          }
          setPendingAdd(null);
        }}
        successOpen={successAddOpen}
        onSuccessOpenChange={setSuccessAddOpen}
        confirmHint={
          pendingAdd ? `Graniplast ${pendingAdd.areaM2} m² · ${pendingAdd.coats} mano(s)` : undefined
        }
      />
      <AfterCalculateQuoteCta
        show={showQuoteShortcut}
        onGoToQuote={() => {
          void form.handleSubmit((data) => {
            commitAddToQuote(data);
            router.push("/quote");
          })();
        }}
      />
      {preview ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado aproximado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Material (saco ref. 25 kg)</span>
              <span className="font-medium tabular-nums">{preview.sacos} saco(s)</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2 text-pretty">
              Cantidad al alza como sacos enteros según precio por kg del perfil; en cotización suma desperdicio.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
