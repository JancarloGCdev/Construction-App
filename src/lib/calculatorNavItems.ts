import type { LucideIcon } from "lucide-react";
import { BrickWall, Layers, LayoutGrid, Paintbrush, Sparkles } from "lucide-react";

export type CalculatorNavItem = {
  href: string;
  title: string;
  body: string;
  icon: LucideIcon;
  iconClass: string;
};

/** Lista única para /calculators y enlaces rápidos (ej. tras añadir al carrito). */
export const CALCULATOR_NAV_ITEMS: CalculatorNavItem[] = [
  {
    href: "/calculators/concrete",
    title: "Concreto / placa",
    body: "Volumen, cemento, arena y grava según reglas aproximadas",
    icon: Layers,
    iconClass: "bg-sky-100/90 text-sky-900 dark:bg-sky-950/55 dark:text-sky-100",
  },
  {
    href: "/calculators/blocks",
    title: "Muro de bloques",
    body: "Cantidad de bloques según m² (desperdicio en cotización)",
    icon: BrickWall,
    iconClass:
      "bg-emerald-100/90 text-emerald-900 dark:bg-emerald-950/55 dark:text-emerald-100",
  },
  {
    href: "/calculators/stucco",
    title: "Estuco y pintura",
    body: "Estuco, masilla y pintura por m² y manos",
    icon: Paintbrush,
    iconClass: "bg-amber-100/90 text-amber-950 dark:bg-amber-950/55 dark:text-amber-100",
  },
  {
    href: "/calculators/graniplast",
    title: "Graniplast",
    body: "Texturizado · kg por m² y manos",
    icon: Sparkles,
    iconClass: "bg-violet-100/90 text-violet-900 dark:bg-violet-950/55 dark:text-violet-100",
  },
  {
    href: "/calculators/tile",
    title: "Pegado cerámica / porcelanato",
    body: "Adhesivo y rejunte orientativos por m²",
    icon: LayoutGrid,
    iconClass: "bg-rose-100/90 text-rose-900 dark:bg-rose-950/55 dark:text-rose-100",
  },
];
