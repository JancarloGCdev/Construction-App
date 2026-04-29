import Link from "next/link";
import Image from "next/image";
import {
  Bot,
  Calculator,
  ChevronRight,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const actions = [
  {
    href: "/calculators",
    label: "Calculadoras",
    desc: "Concreto, muros, estuco, graniplast, pegado cerámica",
    icon: Calculator,
    iconClass: "bg-sky-100/90 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
  },
  {
    href: "/quote",
    label: "Cotización rápida",
    desc: "Cliente, desglose, PDF y WhatsApp",
    icon: FileText,
    iconClass: "bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
  },
  {
    href: "/settings",
    label: "Configurar precios",
    desc: "Tu catálogo COP (se guarda aquí)",
    icon: SlidersHorizontal,
    iconClass: "bg-amber-100/90 text-amber-950 dark:bg-amber-950/40 dark:text-amber-200",
  },
  {
    href: "/ai",
    label: "Asistente IA",
    desc: "Preguntas sobre materiales y cotizaciones",
    icon: Bot,
    iconClass: "bg-violet-100/90 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200",
  },
] as const;

export default function HomePage() {
  return (
    <div className="min-h-dvh max-w-2xl mx-auto px-4 py-8 pb-12 flex flex-col gap-8">
      <div className="space-y-4">
        <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
          Uso sin cuenta · datos en este equipo
        </span>
        <div className="space-y-3">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
            <Image
              src="/logo-mark.png"
              alt=""
              width={64}
              height={64}
              priority
              className="size-14 sm:size-[4.25rem] shrink-0 rounded-2xl shadow-md ring-1 ring-border/80 object-cover"
              aria-hidden
            />
            <div className="min-w-0 space-y-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                <span className="text-slate-700 dark:text-slate-200">Constru</span>
                <span className="text-orange-500 dark:text-orange-400">Ya</span>
              </h1>
              <p
                className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.14em] text-pretty leading-snug"
                aria-label="Cotiza, calcula, construye ya"
              >
                <span className="text-slate-600 dark:text-slate-400">
                  COTIZA. CALCULA. CONSTRUYE.
                </span>
                <span className="text-orange-500 dark:text-orange-400"> YA.</span>
              </p>
              <p className="text-muted-foreground text-pretty leading-relaxed text-sm sm:text-base">
                Calcula materiales, arma cotizaciones con tus precios y comparte por WhatsApp. Todo se guarda
                en tu dispositivo.
              </p>
            </div>
          </div>
        </div>
        <h2 className="text-sm font-semibold text-foreground/80 tracking-wide pt-1">Accesos rápidos</h2>
      </div>
      <ul className="grid grid-cols-1 gap-2.5 list-none p-0 m-0" aria-label="Accesos de la app">
        {actions.map((a) => (
          <li key={a.href}>
            <Link href={a.href} className="group block">
              <Card
                className={cn(
                  "overflow-hidden border border-border/90 bg-card/90 shadow-sm",
                  "transition-all duration-200",
                  "group-hover:shadow-md group-hover:border-border",
                  "group-active:scale-[0.99]"
                )}
              >
                <CardHeader className="pb-3 flex flex-row items-center gap-4">
                  <span
                    className={cn(
                      "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                      a.iconClass
                    )}
                  >
                    <a.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <CardTitle className="text-lg text-foreground group-hover:underline group-hover:decoration-primary/50 group-hover:underline-offset-2">
                      {a.label}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{a.desc}</p>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 text-muted-foreground/70 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/60"
                    aria-hidden
                  />
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-xs text-center text-muted-foreground leading-relaxed max-w-prose mx-auto">
        Valores de referencia en COP. Ajusta todo en{" "}
        <Link
          href="/settings"
          className="text-foreground/90 font-medium underline underline-offset-2 decoration-border hover:decoration-foreground/40"
        >
          Configurar precios
        </Link>
        .
      </p>
    </div>
  );
}
