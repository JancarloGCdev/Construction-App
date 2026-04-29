"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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
import { TILE_ADHESIVE_KG_PER_M2, TILE_GROUT_KG_PER_M2, calcTileLay } from "@/core/calculators/tileLay";
import { TILE_GROUT_SAC_KG, TILE_MORTAR_SAC_KG } from "@/core/pricing/packaging";
import { ceilSacksByKg } from "@/core/pricing/purchaseRounding";
import { buildQuoteFromTileLay } from "@/core/quote/quoteEngine";
import { useGuestStore } from "@/store/useGuestStore";
import { AfterCalculateQuoteCta } from "@/components/calculators/after-calc-quote-cta";
import { AddToQuoteModalFlow } from "@/components/calculators/add-to-quote-modal-flow";
import { ShoppingCart } from "lucide-react";

const schema = z.object({
  areaM2: z.coerce.number().min(0.1, "Área mín. 0,1 m²"),
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

export default function TileLayCalculatorPage() {
  const router = useRouter();
  const { profile, setLastCalculator, getEffectiveWaste, addToQuoteBasket } = useGuestStore();
  const [showQuoteShortcut, setShowQuoteShortcut] = useState(false);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [successAddOpen, setSuccessAddOpen] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<FormValues | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { areaM2: 18, wastePercent: "" },
  });
  const area = useWatch({ control: form.control, name: "areaM2" });

  const preview = useMemo(() => {
    if (!area || area <= 0) return null;
    const calc = calcTileLay(area);
    return {
      ...calc,
      mortarSacs: ceilSacksByKg(calc.mortarKg, TILE_MORTAR_SAC_KG),
      groutSacs: ceilSacksByKg(calc.groutKg, TILE_GROUT_SAC_KG),
    };
  }, [area]);

  function onCalculate(data: FormValues) {
    const r = calcTileLay(data.areaM2);
    setLastCalculator({
      id: "tile",
      inputs: { areaM2: data.areaM2, wastePercent: parseWaste(data.wastePercent) ?? null },
      result: r,
    });
    setShowQuoteShortcut(true);
  }

  function commitAddToQuote(data: FormValues) {
    const waste = getEffectiveWaste(parseWaste(data.wastePercent));
    const r = calcTileLay(data.areaM2);
    const line = `Cerámica/porcelanato ${data.areaM2} m² (adhesivo+rejunte)`;
    onCalculate(data);
    const partial = buildQuoteFromTileLay(profile, waste, r);
    addToQuoteBasket({ kind: "tile", label: line, result: partial });
  }

  return (
    <AppShell title="Pegado cerámica / porcelanato" backHref="/calculators">
      <div className="space-y-2 -mt-2 text-sm text-muted-foreground text-pretty leading-relaxed">
        <p>
          Consumos orientativos: adhesivo ~{TILE_ADHESIVE_KG_PER_M2} kg/m², rejunte ~{TILE_GROUT_KG_PER_M2}{" "}
          kg/m² (
          <span className="font-medium text-foreground/85">
            sin contar baldozas ni accesorios de impermeabilización
          </span>
          ). Cotizás por sacos en{" "}
          <Link
            href="/settings"
            className="text-foreground font-medium underline underline-offset-2 decoration-border hover:decoration-foreground/40"
          >
            Configurar precios
          </Link>{" "}
          · desperdicio vacío = perfil.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-4">
          <FormField
            control={form.control}
            name="areaM2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Área a pegar (m²)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          pendingAdd ? `Cerámica/porcelanato ${pendingAdd.areaM2} m² (adhesivo+rejunte)` : undefined
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
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Adhesivo (25 kg)</span>
              <span className="font-medium tabular-nums">{preview.mortarSacs} saco(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Rejunte (5 kg)</span>
              <span className="font-medium tabular-nums">{preview.groutSacs} saco(s)</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2 text-pretty">
              Compra típica por sacos enteros; la cotización incluye desperdicio y precios del perfil.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
