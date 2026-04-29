import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CALCULATOR_NAV_ITEMS } from "@/lib/calculatorNavItems";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function CalculatorsPage() {
  return (
    <AppShell title="Calculadoras" backHref="/">
      <p className="text-sm text-muted-foreground -mt-2 text-pretty leading-relaxed">
        Elige un tipo de cálculo. Usa{" "}
        <span className="font-medium text-foreground/90">Añadir a cotización</span> para juntar varios
        en{" "}
        <Link
          href="/quote"
          className="font-medium text-foreground underline underline-offset-2 decoration-border hover:decoration-foreground/50"
        >
          cotización
        </Link>
        .
      </p>
      <ul className="flex flex-col gap-2.5 list-none p-0 m-0" aria-label="Tipos de calculadora">
        {CALCULATOR_NAV_ITEMS.map((i) => {
          const Icon = i.icon;
          return (
          <li key={i.href}>
            <Link href={i.href} className="group block">
              <Card
                className={cn(
                  "border border-border/90 bg-card/90 shadow-sm",
                  "transition-all duration-200 group-hover:shadow-md"
                )}
              >
                <CardHeader className="flex flex-row items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                      i.iconClass
                    )}
                  >
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1 text-left">
                    <CardTitle
                      className={cn(
                        "text-base text-foreground",
                        "group-hover:underline group-hover:decoration-primary/40 group-hover:underline-offset-2"
                      )}
                    >
                      {i.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 leading-snug">{i.body}</p>
                  </div>
                  <ChevronRight
                    className="h-5 w-5 text-muted-foreground/70 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/50"
                    aria-hidden
                  />
                </CardHeader>
              </Card>
            </Link>
          </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
