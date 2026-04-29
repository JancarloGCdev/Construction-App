"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { CALCULATOR_NAV_ITEMS } from "@/lib/calculatorNavItems";
import { cn } from "@/lib/utils";

function normalizePath(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

type Props = {
  className?: string;
};

/**
 * Lista de calculadoras (excluye la ruta actual) para usar tras añadir al carrito.
 * Mismos iconos y tonos que la lista principal en /calculators.
 */
export function CalculatorQuickNavLinks({ className }: Props) {
  const pathname = usePathname() ?? "";
  const here = normalizePath(pathname);
  const links = CALCULATOR_NAV_ITEMS.filter((item) => normalizePath(item.href) !== here);

  if (links.length === 0) return null;

  return (
    <div className={cn("rounded-xl border border-border/80 bg-muted/30 px-2 py-1.5", className)}>
      <p className="px-1.5 py-2 text-xs font-medium text-muted-foreground">Ir a otra calculadora</p>
      <ul className="flex flex-col gap-0.5 p-0 m-0 list-none" aria-label="Otras calculadoras">
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-accent/80 transition-colors"
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    item.iconClass
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 text-left">{item.title}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
      <Link
        href="/calculators"
        className="mt-1 block px-2 py-2 text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        Ver todas las calculadoras
      </Link>
    </div>
  );
}
