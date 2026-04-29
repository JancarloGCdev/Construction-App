"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  Layers,
  LayoutGrid,
  Paintbrush,
  Percent,
  Upload,
} from "lucide-react";
import { defaultPrices } from "@/core/pricing/defaultPrices";
import type { PriceCatalog } from "@/core/types";
import { priceCatalogSchema } from "@/lib/schemas/priceCatalog";
import { downloadJsonFile } from "@/lib/download";
import { formatIntegerEsCO, parseLocaleNumberInput } from "@/lib/format";
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
import { useGuestStore } from "@/store/useGuestStore";
import { cn } from "@/lib/utils";
import { ActionFeedbackDialog } from "@/components/feedback/action-feedback-dialog";

const KEYS: (keyof PriceCatalog)[] = [
  "cementBag",
  "sandM3",
  "gravelM3",
  "balastoM3",
  "block",
  "steelKg",
  "laborM2Concrete",
  "laborM2BlockWall",
  "stuccoSaco25kg",
  "masticSaco27kg",
  "paintCunete19_25L",
  "laborM2Stucco",
  "graniplastKg",
  "laborM2Graniplast",
  "tileMortarSac25kg",
  "tileGroutSac5kg",
  "laborM2TileLay",
  "wastePercent",
  "profitMargin",
];

const COP_FIELD_KEYS = new Set<keyof PriceCatalog>(
  KEYS.filter((k) => k !== "wastePercent" && k !== "profitMargin")
);

const stringField = z
  .string()
  .refine(
    (s) => {
      const t = s.trim();
      if (t === "") return true;
      const n = parseLocaleNumberInput(t);
      return !Number.isNaN(n);
    },
    { message: "Número inválido" }
  )
  .refine(
    (s) => {
      const t = s.trim();
      if (t === "") return true;
      return parseLocaleNumberInput(t) >= 0;
    },
    { message: "No puede ser negativo" }
  );

const formSchema = z.object({
  cementBag: stringField,
  sandM3: stringField,
  gravelM3: stringField,
  balastoM3: stringField,
  block: stringField,
  steelKg: stringField,
  laborM2Concrete: stringField,
  laborM2BlockWall: stringField,
  stuccoSaco25kg: stringField,
  masticSaco27kg: stringField,
  paintCunete19_25L: stringField,
  laborM2Stucco: stringField,
  graniplastKg: stringField,
  laborM2Graniplast: stringField,
  tileMortarSac25kg: stringField,
  tileGroutSac5kg: stringField,
  laborM2TileLay: stringField,
  wastePercent: stringField,
  profitMargin: stringField,
});

type FormValues = z.infer<typeof formSchema>;

const fields: { key: keyof FormValues; label: string; suffix?: string }[] = [
  { key: "cementBag", label: "Cemento (por bulto)", suffix: "COP" },
  { key: "sandM3", label: "Arena (m³)", suffix: "COP" },
  { key: "gravelM3", label: "Grava (m³)", suffix: "COP" },
  { key: "balastoM3", label: "Balasto / agregado mixto (m³)", suffix: "COP" },
  { key: "block", label: "Bloque (unidad)", suffix: "COP" },
  { key: "steelKg", label: "Acero (kg) — referencia", suffix: "COP" },
  { key: "laborM2Concrete", label: "Mano de obra (m² concreto)", suffix: "COP" },
  { key: "laborM2BlockWall", label: "Mano de obra (m² muro bloque)", suffix: "COP" },
  { key: "stuccoSaco25kg", label: "Estuco — saco 25 kg", suffix: "COP" },
  { key: "masticSaco27kg", label: "Masilla / mastic — saco 27 kg", suffix: "COP" },
  { key: "paintCunete19_25L", label: "Pintura — cuñete 19,25 L", suffix: "COP" },
  { key: "laborM2Stucco", label: "Mano de obra (m² estuco y pintura)", suffix: "COP" },
  { key: "graniplastKg", label: "Graniplast (kg)", suffix: "COP" },
  { key: "laborM2Graniplast", label: "Mano de obra (m² graniplast)", suffix: "COP" },
  { key: "tileMortarSac25kg", label: "Adhesivo cerámica/porcelanato — saco 25 kg", suffix: "COP" },
  { key: "tileGroutSac5kg", label: "Rejunte — saco 5 kg", suffix: "COP" },
  { key: "laborM2TileLay", label: "Mano de obra (m² pegado cerámica/porcelánico)", suffix: "COP" },
  { key: "wastePercent", label: "Desperdicio por defecto (materiales)", suffix: "%" },
  { key: "profitMargin", label: "Margen de ganancia", suffix: "%" },
];

const fieldMetaByKey = Object.fromEntries(fields.map((f) => [f.key, f])) as Record<
  keyof FormValues,
  (typeof fields)[number]
>;

type SectionSpec = {
  id: string;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  iconWrap: string;
  headBar: string;
  cardBorder: string;
  cardBg: string;
  keys: (keyof FormValues)[];
};

const SECTIONS: SectionSpec[] = [
  {
    id: "materials",
    title: "Materiales estructura",
    subtitle: "Suelos base, cerramiento y ferretería referencial.",
    icon: Layers,
    iconWrap: "bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-200",
    headBar: "border-sky-200/90 dark:border-sky-900/70",
    cardBorder: "border-sky-200/90 dark:border-sky-800/80",
    cardBg: "bg-sky-50/40 dark:bg-sky-950/15",
    keys: ["cementBag", "sandM3", "gravelM3", "balastoM3", "block", "steelKg"],
  },
  {
    id: "labor-structure",
    title: "Mano de obra — obra gruesa",
    subtitle:
      "Precios COP por m²: sirven como base para cotizar, no cubren equipo intermitente por sí solos.",
    icon: ClipboardList,
    iconWrap:
      "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/55 dark:text-emerald-100",
    headBar: "border-emerald-200/90 dark:border-emerald-900/70",
    cardBorder: "border-emerald-200/85 dark:border-emerald-800/80",
    cardBg: "bg-emerald-50/40 dark:bg-emerald-950/15",
    keys: ["laborM2Concrete", "laborM2BlockWall"],
  },
  {
    id: "finishes-wall",
    title: "Acabados muro pintura",
    subtitle: "Estuco, masilla y pintura.",
    icon: Paintbrush,
    iconWrap: "bg-amber-100 text-amber-950 dark:bg-amber-950/55 dark:text-amber-100",
    headBar: "border-amber-200/90 dark:border-amber-900/70",
    cardBorder: "border-amber-200/85 dark:border-amber-800/80",
    cardBg: "bg-amber-50/35 dark:bg-amber-950/15",
    keys: ["stuccoSaco25kg", "masticSaco27kg", "paintCunete19_25L", "laborM2Stucco"],
  },
  {
    id: "overlays",
    title: "Revestimientos y pegado",
    subtitle: "Texturizado, cerámica y porcelanato.",
    icon: LayoutGrid,
    iconWrap: "bg-violet-100 text-violet-900 dark:bg-violet-950/55 dark:text-violet-100",
    headBar: "border-violet-200/90 dark:border-violet-900/70",
    cardBorder: "border-violet-200/85 dark:border-violet-800/80",
    cardBg: "bg-violet-50/40 dark:bg-violet-950/15",
    keys: ["graniplastKg", "laborM2Graniplast", "tileMortarSac25kg", "tileGroutSac5kg", "laborM2TileLay"],
  },
  {
    id: "business",
    title: "Desperdicio y margen",
    subtitle:
      "Coeficiente de desperdicio sobre materiales y margen sobre costo obra calculado.",
    icon: Percent,
    iconWrap: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800/75 dark:text-zinc-100",
    headBar: "border-zinc-200/90 dark:border-zinc-800/70",
    cardBorder: "border-zinc-200/80 dark:border-zinc-700/80",
    cardBg: "bg-zinc-50/35 dark:bg-zinc-950/25",
    keys: ["wastePercent", "profitMargin"],
  },
];

function priceToFormStrings(p: PriceCatalog): FormValues {
  return KEYS.reduce((acc, k) => {
    const v = p[k] as number;
    if (!Number.isFinite(v)) {
      acc[k] = "";
      return acc;
    }
    if (COP_FIELD_KEYS.has(k)) {
      acc[k] = formatIntegerEsCO(Math.round(v));
    } else {
      acc[k] = String(Math.round(v));
    }
    return acc;
  }, {} as FormValues);
}

function catalogsEqual(a: PriceCatalog, b: PriceCatalog): boolean {
  return KEYS.every((k) => (a[k] as number) === (b[k] as number));
}

function formStringsToPrice(v: FormValues): PriceCatalog {
  const raw: Record<string, number> = {};
  for (const k of KEYS) {
    const t = v[k].trim();
    if (t === "") {
      raw[k] = 0;
    } else {
      const n = parseLocaleNumberInput(t);
      if (Number.isNaN(n)) {
        throw new Error(`Campo inválido: ${k}`);
      }
      raw[k] = Math.round(n);
    }
  }
  return priceCatalogSchema.parse(raw);
}

export default function SettingsPage() {
  const { profile, setProfile, importProfile } = useGuestStore();
  const [importError, setImportError] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [feedback, setFeedback] = useState<{
    title: string;
    message: string;
    variant?: "default" | "success";
  } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const formStrings = useMemo(() => priceToFormStrings(profile), [profile]);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: formStrings,
    values: formStrings,
  });

  useEffect(() => {
    const store = useGuestStore.persist;
    if (store.hasHydrated()) {
      setHasHydrated(true);
      return;
    }
    const unsub = store.onFinishHydration(() => setHasHydrated(true));
    return unsub;
  }, []);

  function onSave(data: FormValues) {
    form.clearErrors("root");
    try {
      const next = formStringsToPrice(data);
      if (catalogsEqual(next, profile)) {
        setFeedback({
          title: "Sin cambios",
          message:
            "Los valores en pantalla ya coinciden con el perfil guardado en este equipo. No hubo nada nuevo que persistir.",
          variant: "default",
        });
        return;
      }
      setProfile(next);
      setFeedback({
        title: "Cambios guardados",
        message: "Los precios quedaron guardados solo en este navegador.",
        variant: "success",
      });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : "Revisa porcentajes y valores (COP, % máximos, etc.)";
      form.setError("root", { type: "manual", message: msg });
    }
  }

  function onReset() {
    const p: PriceCatalog = { ...defaultPrices };
    if (catalogsEqual(profile, p)) {
      setFeedback({
        title: "Sin cambios",
        message:
          "El perfil ya estaba igual que los valores estándar de esta versión. No fue necesario restaurar.",
        variant: "default",
      });
      return;
    }
    setProfile(p);
    form.reset(priceToFormStrings(p));
    setFeedback({
      title: "Valores estándar aplicados",
      message:
        "Se aplicaron los precios por defecto de la app en este dispositivo. Podés seguir ajustando y pulsar Guardar cuando quieras.",
      variant: "success",
    });
  }

  function onExport() {
    try {
      const p = formStringsToPrice(form.getValues());
      downloadJsonFile(p, "construya-precios.json");
      setFeedback({
        title: "Descarga lista",
        message:
          "Se descargó construya-precios.json con los valores que ves ahora en el formulario. Si no aparece, revisá la carpeta de descargas o bloqueos del navegador.",
        variant: "success",
      });
    } catch {
      setFeedback({
        title: "Revisá el formulario",
        message:
          "No se pudo exportar: corregí los campos con error (números válidos en COP o porcentajes) y probá otra vez.",
        variant: "default",
      });
    }
  }

  function onPickFile() {
    fileRef.current?.click();
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const json = JSON.parse(text) as unknown;
        const parsed = priceCatalogSchema.parse(json);
        importProfile(parsed);
        form.reset(priceToFormStrings(parsed));
        setFeedback({
          title: "Archivo cargado",
          message:
            "Los precios del archivo reemplazaron los valores locales y ya están disponibles para las calculadoras.",
          variant: "success",
        });
      } catch (err) {
        setImportError(
          err instanceof Error ? err.message : "No se pudo leer el archivo. Que sea el exportado desde aquí mismo."
        );
      }
    };
    reader.readAsText(file);
  }

  return (
    <AppShell title="Configurar precios" backHref="/" className="max-w-3xl">
      <div className="space-y-3 text-sm text-muted-foreground -mt-2">
        <p>
          Tus precios y porcentajes se guardan solo en este equipo (navegador). Para llevarlos a otro teléfono u ordenador,
          descargá primero una copia con <span className="font-medium text-foreground/85">Guardar archivo de precios</span>{" "}
          y cargala en el nuevo dispositivo.
        </p>
        <p>
          <span className="font-medium text-foreground/85">Restaurar estándar</span> devuelve los valores que trae esta
          versión de la app cuando no hay guardado anterior. Si algo se ve fuera de lugar, guardá de nuevo después de restaurar.
        </p>
        <p className="text-xs text-muted-foreground/95">
          Valores monetarios mostrados con <span className="font-medium text-foreground/80">punto como separador de miles</span>{" "}
          (ej. <span className="tabular-nums">48.000</span>). puedes pegar número con o sin puntos al guardar.
        </p>
      </div>
      {hasHydrated ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
            <div className="grid grid-cols-1 min-w-0 lg:grid-cols-2 gap-4">
              {SECTIONS.map((sec) => {
                const Icon = sec.icon;
                return (
                  <Card
                    key={sec.id}
                    className={cn(
                      "border-2 shadow-sm overflow-hidden min-w-0",
                      sec.cardBorder,
                      sec.cardBg
                    )}
                  >
                    <CardHeader
                      className={cn(
                        "space-y-0 pb-3 border-b",
                        sec.headBar
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                            sec.iconWrap
                          )}
                          aria-hidden
                        >
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 pt-0.5 space-y-0.5">
                          <CardTitle className="text-base leading-snug">{sec.title}</CardTitle>
                          <p className="text-xs text-muted-foreground font-normal leading-snug">{sec.subtitle}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className={cn("pt-4 grid gap-3 min-w-0 sm:grid-cols-2")}>
                      {sec.keys.map((key) => {
                        const fm = fieldMetaByKey[key];
                        const isCop = COP_FIELD_KEYS.has(key as keyof PriceCatalog);
                        return (
                          <FormField
                            key={key}
                            control={form.control}
                            name={key}
                            render={({ field }) => (
                              <FormItem className="min-w-0 space-y-2">
                                <FormLabel className="block text-xs sm:text-[13px] font-medium leading-snug break-words text-balance [overflow-wrap:anywhere] hyphens-auto">
                                  {fm.label}
                                  {fm.suffix ? (
                                    <span className="text-muted-foreground font-normal"> · {fm.suffix}</span>
                                  ) : null}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    type="text"
                                    inputMode="decimal"
                                    autoComplete="off"
                                    placeholder={isCop ? "48.000" : undefined}
                                    className="tabular-nums shadow-sm bg-card/95"
                                    name={field.name}
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={(ev) => {
                                      if (isCop) {
                                        const n = parseLocaleNumberInput(ev.target.value);
                                        if (Number.isFinite(n) && !Number.isNaN(n)) {
                                          field.onChange(formatIntegerEsCO(n));
                                        }
                                      }
                                      field.onBlur();
                                    }}
                                    ref={field.ref}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        );
                      })}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button type="submit" className="w-full" size="lg">
                Guardar
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                size="lg"
                onClick={onReset}
              >
                Restaurar estándar
              </Button>
              <Button type="button" variant="outline" className="w-full" size="lg" onClick={onExport}>
                Guardar archivo de precios
              </Button>
              <Button type="button" variant="outline" className="w-full" size="lg" onClick={onPickFile}>
                <Upload className="h-4 w-4" />
                Cargar archivo de precios
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={onFile}
              />
            </div>
          </form>
        </Form>
      ) : (
        <p className="text-sm text-muted-foreground py-6" role="status">
          Cargando perfil guardado…
        </p>
      )}
      {form.formState.errors.root ? (
        <p className="text-sm text-destructive" role="alert">
          {form.formState.errors.root.message}
        </p>
      ) : null}
      {importError ? (
        <p className="text-sm text-destructive" role="alert">
          {importError}
        </p>
      ) : null}
      <ActionFeedbackDialog
        open={feedback !== null}
        onOpenChange={(open) => {
          if (!open) setFeedback(null);
        }}
        title={feedback?.title ?? ""}
        message={feedback?.message ?? ""}
        variant={feedback?.variant === "success" ? "success" : "default"}
      />
    </AppShell>
  );
}
