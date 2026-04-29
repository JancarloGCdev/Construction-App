import type { CalculatorId } from "@/core/types";
import { CALCULATOR_NAV_ITEMS } from "./calculatorNavItems";
import type { LucideIcon } from "lucide-react";

/** Icono, color y título corto alineados con /calculators (lista principal). */
export function getCalculatorBasketVisual(kind: CalculatorId): {
  icon: LucideIcon;
  iconClass: string;
  shortTitle: string;
} {
  const href = `/calculators/${kind}`;
  const item = CALCULATOR_NAV_ITEMS.find((i) => i.href === href);
  if (!item) {
    return {
      icon: CALCULATOR_NAV_ITEMS[0]!.icon,
      iconClass: "bg-muted/90 text-foreground dark:bg-muted/50 dark:text-foreground",
      shortTitle: "Calculadora",
    };
  }
  return { icon: item.icon, iconClass: item.iconClass, shortTitle: item.title };
}
