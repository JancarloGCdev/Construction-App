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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calcBlockWall } from "@/core/calculators";
import { buildQuoteFromBlockWall } from "@/core/quote/quoteEngine";
import { useGuestStore } from "@/store/useGuestStore";
import { AfterCalculateQuoteCta } from "@/components/calculators/after-calc-quote-cta";
import { AddToQuoteModalFlow } from "@/components/calculators/add-to-quote-modal-flow";
import { ShoppingCart } from "lucide-react";

const BLOCK_PRESETS = ["12x20x40 (hueco)", "10x20x30", "15x20x40", "Bloque macizo 10x20x40"] as const;

const schema = z.object({
  lengthM: z.coerce.number().min(0.01, "Largo mín. 0,01 m"),
  heightM: z.coerce.number().min(0.01, "Altura mín. 0,01 m"),
  blockType: z.string().min(1, "Elige un tipo"),
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

export default function BlocksCalculatorPage() {
  const router = useRouter();
  const { profile, setLastCalculator, getEffectiveWaste, addToQuoteBasket } = useGuestStore();
  const [showQuoteShortcut, setShowQuoteShortcut] = useState(false);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [successAddOpen, setSuccessAddOpen] = useState(false);
  const [pendingAdd, setPendingAdd] = useState<FormValues | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lengthM: 4,
      heightM: 2.4,
      blockType: BLOCK_PRESETS[0],
      wastePercent: "",
    },
  });

  const lengthM = useWatch({ control: form.control, name: "lengthM" });
  const heightM = useWatch({ control: form.control, name: "heightM" });

  const preview = useMemo(() => {
    if (!lengthM || !heightM) return null;
    if (lengthM <= 0 || heightM <= 0) return null;
    return calcBlockWall(lengthM, heightM);
  }, [lengthM, heightM]);

  function onCalculate(data: FormValues) {
    const r = calcBlockWall(data.lengthM, data.heightM);
    setLastCalculator({
      id: "blocks",
      inputs: {
        lengthM: data.lengthM,
        heightM: data.heightM,
        blockType: data.blockType,
        wastePercent: parseWaste(data.wastePercent) ?? null,
      },
      result: r,
    });
    setShowQuoteShortcut(true);
  }

  function commitAddToQuote(data: FormValues) {
    const waste = getEffectiveWaste(parseWaste(data.wastePercent));
    const r = calcBlockWall(data.lengthM, data.heightM);
    const line = `Muro ${data.lengthM}×${data.heightM} m · ${data.blockType}`;
    onCalculate(data);
    const partial = buildQuoteFromBlockWall(profile, waste, r);
    addToQuoteBasket({ kind: "blocks", label: line, result: partial });
  }

  return (
    <AppShell title="Muro de bloques" backHref="/calculators">
      <p className="text-sm text-muted-foreground -mt-2">
        Cantidad aprox. ~12,5 und/m². El tipo de bloque queda anotado en la cotización. Desperdicio
        vacío = {profile.wastePercent}% del perfil.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="lengthM"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Largo (m)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="heightM"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alto (m)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="blockType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de bloque</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Elige" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BLOCK_PRESETS.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
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
            name="wastePercent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Desperdicio (%), opcional</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" placeholder={`Perfil: ${profile.wastePercent}%`} {...field} />
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
            ? `Muro ${pendingAdd.lengthM}×${pendingAdd.heightM} m · ${pendingAdd.blockType}`
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
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Área</span>
              <span className="font-medium tabular-nums">{preview.areaM2.toFixed(2)} m²</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Bloques (aprox.)</span>
              <span className="font-medium tabular-nums">{preview.blocksNeeded} und</span>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              En cotización se aplican precios del perfil, desperdicio y margen.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}
