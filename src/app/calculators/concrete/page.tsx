"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppShell } from "@/components/app-shell";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calcConcreteSlab } from "@/core/calculators";
import {
  STEEL_KG_PER_M3_BEAM_ESTIMATE,
  STEEL_KG_PER_M3_COLUMN_ESTIMATE,
} from "@/core/calculators/concreteSlab";
import type { ConcreteBeamInput, ConcreteColumnInput } from "@/core/types";
import { buildQuoteFromConcrete } from "@/core/quote/quoteEngine";
import {
  ceilCommercialAggregateM3,
  ceilWholeBagsOrSacks,
} from "@/core/pricing/purchaseRounding";
import { structuralConcretePhrase } from "@/lib/concreteStructuralLabel";
import { useGuestStore } from "@/store/useGuestStore";
import { AfterCalculateQuoteCta } from "@/components/calculators/after-calc-quote-cta";
import { AddToQuoteModalFlow } from "@/components/calculators/add-to-quote-modal-flow";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";

const columnRowSchema = z.object({
  qty: z.coerce.number().nonnegative(),
  sectionWidthCm: z.coerce.number().nonnegative(),
  sectionDepthCm: z.coerce.number().nonnegative(),
  heightM: z.coerce.number().nonnegative(),
});

const beamRowSchema = z.object({
  qty: z.coerce.number().nonnegative(),
  spanM: z.coerce.number().nonnegative(),
  widthCm: z.coerce.number().nonnegative(),
  depthCm: z.coerce.number().nonnegative(),
});

const schema = z.object({
  lengthM: z.coerce.number().min(0.01, "Largo mín. 0,01 m"),
  widthM: z.coerce.number().min(0.01, "Ancho mín. 0,01 m"),
  thicknessCm: z.coerce.number().min(0.1, "Espesor mín. 0,1 cm"),
  aggregateMode: z.enum(["separate", "balasto"]),
  columns: z.array(columnRowSchema),
  beams: z.array(beamRowSchema),
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

function filteredColumns(rows: FormValues["columns"]): ConcreteColumnInput[] {
  return rows
    .filter((c) => c.qty > 0 && c.heightM > 0 && c.sectionWidthCm > 0 && c.sectionDepthCm > 0)
    .map((c) => ({
      qty: Math.max(1, Math.floor(c.qty)),
      sectionWidthCm: c.sectionWidthCm,
      sectionDepthCm: c.sectionDepthCm,
      heightM: c.heightM,
    }));
}

function filteredBeams(rows: FormValues["beams"]): ConcreteBeamInput[] {
  return rows
    .filter((b) => b.qty > 0 && b.spanM > 0 && b.widthCm > 0 && b.depthCm > 0)
    .map((b) => ({
      qty: Math.max(1, Math.floor(b.qty)),
      spanM: b.spanM,
      widthCm: b.widthCm,
      depthCm: b.depthCm,
    }));
}

function calcOpts(data: FormValues) {
  return {
    columns: filteredColumns(data.columns),
    beams: filteredBeams(data.beams),
    aggregateMode: data.aggregateMode,
  };
}

export default function ConcreteCalculatorPage() {
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
      widthM: 3,
      thicknessCm: 10,
      aggregateMode: "separate",
      columns: [],
      beams: [],
      wastePercent: "",
    },
  });

  const { fields: columnFields, append: appendColumn, remove: removeColumn } = useFieldArray({
    control: form.control,
    name: "columns",
  });

  const { fields: beamFields, append: appendBeam, remove: removeBeam } = useFieldArray({
    control: form.control,
    name: "beams",
  });

  const watched = useWatch({ control: form.control }) as FormValues | undefined;

  const preview = useMemo(() => {
    if (
      watched == null ||
      !watched.lengthM ||
      !watched.widthM ||
      !watched.thicknessCm ||
      watched.lengthM <= 0 ||
      watched.widthM <= 0 ||
      watched.thicknessCm <= 0
    ) {
      return null;
    }
    const slab = calcConcreteSlab(watched.lengthM, watched.widthM, watched.thicknessCm, calcOpts(watched));
    const mode = slab.aggregateMode;
    const purchaseBag = ceilWholeBagsOrSacks(slab.cementBags);
    const purchaseBalasto = ceilCommercialAggregateM3(slab.sandM3 + slab.gravelM3);
    const purchaseSandM3 = ceilCommercialAggregateM3(slab.sandM3);
    const purchaseGravelM3 = ceilCommercialAggregateM3(slab.gravelM3);

    return { slab, mode, purchaseBag, purchaseBalasto, purchaseSandM3, purchaseGravelM3 };
  }, [watched]);

  function onCalculate(data: FormValues) {
    const opts = calcOpts(data);
    const r = calcConcreteSlab(data.lengthM, data.widthM, data.thicknessCm, opts);
    setLastCalculator({
      id: "concrete",
      inputs: {
        lengthM: data.lengthM,
        widthM: data.widthM,
        thicknessCm: data.thicknessCm,
        wastePercent: parseWaste(data.wastePercent) ?? null,
        aggregateMode: data.aggregateMode,
        columns: opts.columns,
        beams: opts.beams,
      },
      result: r,
    });
    setShowQuoteShortcut(true);
  }

  function commitAddToQuote(data: FormValues) {
    const waste = getEffectiveWaste(parseWaste(data.wastePercent));
    const opts = calcOpts(data);
    const r = calcConcreteSlab(data.lengthM, data.widthM, data.thicknessCm, opts);
    const areaM2 = data.lengthM * data.widthM;
    const phrase = structuralConcretePhrase(opts.columns.length, opts.beams.length);
    const line = `Placa ${data.lengthM}×${data.widthM} m · ${data.thicknessCm} cm${phrase ? ` + ${phrase}` : ""}`;
    onCalculate(data);
    const partial = buildQuoteFromConcrete(profile, waste, r, areaM2);
    addToQuoteBasket({
      kind: "concrete",
      label: line,
      result: partial,
    });
  }

  return (
    <AppShell title="Concreto / placa" backHref="/calculators">
      <p className="text-sm text-muted-foreground -mt-2">
        Desperdicio vacío = usa {profile.wastePercent}% del{" "}
        <span className="text-foreground">perfil</span>. Vigas/columnas suman volumen al hormigón; la mano de
        obra cotizada sigue referida a los m² de placa únicamente.
      </p>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onCalculate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="lengthM"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Largo losa (m)</FormLabel>
                  <FormControl>
                    <Input inputMode="decimal" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="widthM"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ancho losa (m)</FormLabel>
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
            name="thicknessCm"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Espesor losa (cm)</FormLabel>
                <FormControl>
                  <Input inputMode="decimal" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="aggregateMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Agregados (materiales a comprar)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Modo agregados" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="separate">Arena + grava (por separado)</SelectItem>
                    <SelectItem value="balasto">Balasto único (arena mezclada con piedras)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground text-pretty">
                  En modo balasto se cotiza un solo volumen tipo agregado mixto (≈ la suma de los m³ típicos arena
                  + piedra según proporción habitual). Precio en Configuración (balasto m³).
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <Card className="border-dashed border-border">
            <CardHeader className="py-3 space-y-0">
              <CardTitle className="text-sm">Columnas (opcional)</CardTitle>
              <CardDescription className="text-xs">
                Sección rectangular: ancho × fondo en cm × altura en m × cantidad.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {columnFields.map((fld, idx) => (
                <div
                  key={fld.id}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto] items-end"
                >
                  <FormField
                    control={form.control}
                    name={`columns.${idx}.qty`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Cant.</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`columns.${idx}.sectionWidthCm`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Ancho cm</FormLabel>
                        <FormControl>
                          <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`columns.${idx}.sectionDepthCm`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Fondo cm</FormLabel>
                        <FormControl>
                          <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`columns.${idx}.heightM`}
                    render={({ field }) => (
                      <FormItem className="col-span-2 sm:col-span-1">
                        <FormLabel className="text-xs">Alto m</FormLabel>
                        <FormControl>
                          <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label="Quitar columna"
                    onClick={() => removeColumn(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() =>
                  appendColumn({
                    qty: 1,
                    sectionWidthCm: 30,
                    sectionDepthCm: 30,
                    heightM: 2.4,
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Agregar grupo de columnas
              </Button>
            </CardContent>
          </Card>

          <Card className="border-dashed border-border">
            <CardHeader className="py-3 space-y-0">
              <CardTitle className="text-sm">Vigas (opcional)</CardTitle>
              <CardDescription className="text-xs">
                Vigas tipo prismático: cantidad de tramos idénticos × tramo horizontal (m) × sección cm (ancho
                × alto del alma habitual).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pb-4">
              {beamFields.map((fld, idx) => (
                <div
                  key={fld.id}
                  className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(5,minmax(0,1fr))_auto] items-end"
                >
                  <FormField
                    control={form.control}
                    name={`beams.${idx}.qty`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Cant.</FormLabel>
                        <FormControl>
                          <Input inputMode="numeric" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`beams.${idx}.spanM`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Tramo m</FormLabel>
                        <FormControl>
                          <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`beams.${idx}.widthCm`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Ancho cm</FormLabel>
                        <FormControl>
                          <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`beams.${idx}.depthCm`}
                    render={({ field }) => (
                      <FormItem className="col-span-2 sm:col-span-1">
                        <FormLabel className="text-xs">Alto cm</FormLabel>
                        <FormControl>
                          <Input inputMode="decimal" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    aria-label="Quitar viga"
                    onClick={() => removeBeam(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() =>
                  appendBeam({
                    qty: 1,
                    spanM: 4,
                    widthCm: 15,
                    depthCm: 25,
                  })
                }
              >
                <Plus className="h-4 w-4" />
                Agregar grupo de vigas
              </Button>
            </CardContent>
          </Card>

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
            ? (() => {
                const o = calcOpts(pendingAdd);
                const phrase = structuralConcretePhrase(o.columns.length, o.beams.length);
                return (
                  `Placa ${pendingAdd.lengthM}×${pendingAdd.widthM} m · ${pendingAdd.thicknessCm} cm` +
                  (phrase ? ` + ${phrase}` : "") +
                  (pendingAdd.aggregateMode === "balasto" ? " · balasto" : "")
                );
              })()
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
            <Row label="Volumen losa" value={`${preview.slab.slabVolumeM3.toFixed(3)} m³`} />
            {preview.slab.columnsVolumeM3 > 1e-6 ? (
              <Row label="Vol. columnas" value={`${preview.slab.columnsVolumeM3.toFixed(3)} m³`} />
            ) : null}
            {preview.slab.beamsVolumeM3 > 1e-6 ? (
              <Row label="Vol. vigas" value={`${preview.slab.beamsVolumeM3.toFixed(3)} m³`} />
            ) : null}
            <Row label="Volumen total de concreto" value={`${preview.slab.volumeM3.toFixed(3)} m³`} />
            <Row label="Cemento (compra)" value={`${preview.purchaseBag} bulto(s)`} />
            {preview.mode === "balasto" ? (
              <Row label="Balasto (compra)" value={`${preview.purchaseBalasto} m³`} />
            ) : (
              <>
                <Row label="Arena (compra)" value={`${preview.purchaseSandM3} m³`} />
                <Row label="Grava (compra)" value={`${preview.purchaseGravelM3} m³`} />
              </>
            )}
            {preview.slab.columnsVolumeM3 > 1e-6 ? (
              <Row
                label={`Acero/hierro columnas (≈ ${STEEL_KG_PER_M3_COLUMN_ESTIMATE} kg/m³ ref.)`}
                value={`${preview.slab.steelKgColumnsEstimate.toFixed(0)} kg`}
              />
            ) : null}
            {preview.slab.beamsVolumeM3 > 1e-6 ? (
              <Row
                label={`Acero/hierro vigas (≈ ${STEEL_KG_PER_M3_BEAM_ESTIMATE} kg/m³ ref.)`}
                value={`${preview.slab.steelKgBeamsEstimate.toFixed(0)} kg`}
              />
            ) : null}
            <p className="text-xs text-muted-foreground pt-1 text-pretty">
              Vista previa sin desperdicio %: bultos enteros; arena/gravilla o balasto en incrementos de 0,5 m³.
              Hierro solo si hay volumen de columna o viga; en cotización los kg van al alza con desperdicio y el
              precio por kg del perfil.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums text-right">{value}</span>
    </div>
  );
}
