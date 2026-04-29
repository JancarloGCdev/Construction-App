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
import { calcStuccoFinish } from "@/core/calculators";
import { STUCCO_SACO_KG, MASTIC_SACO_KG } from "@/core/pricing/packaging";
import { ceilPaintCunetes, ceilSacksByKg } from "@/core/pricing/purchaseRounding";
import { buildQuoteFromStuccoFinish } from "@/core/quote/quoteEngine";
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
  stuccoCoats: z.coerce.number().int().min(1).max(4),
  masticCoats: z.coerce.number().int().min(0).max(3),
  paintCoats: z.coerce.number().int().min(0).max(4),
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

export default function StuccoCalculatorPage() {
  const router = useRouter();
  const { profile, setLastCalculator, getEffectiveWaste, addToQuoteBasket } = useGuestStore();
  const [showQuoteShortcut, setShowQuoteShortcut] = useState(false);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [successAddOpen, setSuccessAddOpen] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<FormValues | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      areaM2: 25,
      stuccoCoats: 2,
      masticCoats: 1,
      paintCoats: 2,
      wastePercent: "",
    },
  });
  const area = useWatch({ control: form.control, name: "areaM2" });
  const stuccoCoats = useWatch({ control: form.control, name: "stuccoCoats" });
  const masticCoats = useWatch({ control: form.control, name: "masticCoats" });
  const paintCoats = useWatch({ control: form.control, name: "paintCoats" });

  const preview = useMemo(() => {
    if (!area || area <= 0) return null;
    const calc = calcStuccoFinish(area, stuccoCoats ?? 2, masticCoats ?? 1, paintCoats ?? 2);
    return {
      ...calc,
      estucoSacs: ceilSacksByKg(calc.stuccoKg, STUCCO_SACO_KG),
      masticSacs: ceilSacksByKg(calc.masticKg, MASTIC_SACO_KG),
      pinturaCunetes: ceilPaintCunetes(calc.paintLiters),
    };
  }, [area, stuccoCoats, masticCoats, paintCoats]);

  function onCalculate(data: FormValues) {
    const r = calcStuccoFinish(
      data.areaM2,
      data.stuccoCoats,
      data.masticCoats,
      data.paintCoats
    );
    setLastCalculator({
      id: "stucco",
      inputs: {
        areaM2: data.areaM2,
        stuccoCoats: data.stuccoCoats,
        masticCoats: data.masticCoats,
        paintCoats: data.paintCoats,
        wastePercent: parseWaste(data.wastePercent) ?? null,
      },
      result: r,
    });
    setShowQuoteShortcut(true);
  }

  function commitAddToQuote(data: FormValues) {
    const waste = getEffectiveWaste(parseWaste(data.wastePercent));
    const r = calcStuccoFinish(
      data.areaM2,
      data.stuccoCoats,
      data.masticCoats,
      data.paintCoats
    );
    const line = `Estuco/pintura ${data.areaM2} m² (E${data.stuccoCoats} M${data.masticCoats} P${data.paintCoats} manos)`;
    onCalculate(data);
    const partial = buildQuoteFromStuccoFinish(profile, waste, r);
    addToQuoteBasket({ kind: "stucco", label: line, result: partial });
  }

  return (
    <AppShell title="Estuco y pintura" backHref="/calculators">
      <p className="text-sm text-muted-foreground -mt-2 text-pretty">
        Consumos aproximados: estuco ~2,2 kg/m²/mano, masilla ~0,45 kg/m²/mano, pintura
        ~0,12 L/m²/mano. En{" "}
        <Link
          href="/settings"
          className="text-foreground font-medium underline underline-offset-2 decoration-border hover:decoration-foreground/40"
        >
          Configurar precios
        </Link>{" "}
        cargá el valor por{" "}
        <span className="font-medium">saco de 25 kg</span>, <span className="font-medium">saco de 27 kg</span>{" "}
        y <span className="font-medium">cuñete de 19,25 L</span>; el desglose usa equivalente por kg/L.
        Desperdicio vacío = perfil.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-4">
          <FormField
            control={form.control}
            name="areaM2"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Área a cubrir (m²)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField
              control={form.control}
              name="stuccoCoats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manos estuco</FormLabel>
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
            <FormField
              control={form.control}
              name="masticCoats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manos masilla</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={String(field.value ?? 0)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[0, 1, 2, 3].map((n) => (
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
            <FormField
              control={form.control}
              name="paintCoats"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Manos pintura</FormLabel>
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
                      {[0, 1, 2, 3, 4].map((n) => (
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
          pendingAdd
            ? `Estuco/pintura ${pendingAdd.areaM2} m² (E${pendingAdd.stuccoCoats} M${pendingAdd.masticCoats} P${pendingAdd.paintCoats} manos)`
            : undefined
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
              <span className="text-muted-foreground">Estuco (25 kg)</span>
              <span className="font-medium tabular-nums">{preview.estucoSacs} saco(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Masilla (27 kg)</span>
              <span className="font-medium tabular-nums">{preview.masticSacs} saco(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pintura (~19 L)</span>
              <span className="font-medium tabular-nums">{preview.pinturaCunetes} cuñete(s)</span>
            </div>
            <p className="text-xs text-muted-foreground pt-2 text-pretty">
              Cantidades orientadas a cómo se compran en ferretería (sacos y cuñetes enteros).
            </p>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
