"use client";

import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  show: boolean;
  /** Ej.: validar formulario, añadir partida al carrito (`commitAddToQuote`) y `router.push("/quote")`. */
  onGoToQuote: () => void;
};

/**
 * Aparece tras un cálculo exitoso ("Calcular").
 * Este botón lleva la partida actual al carrito y abre cotización — no sólo navega.
 */
export function AfterCalculateQuoteCta({ show, onGoToQuote }: Props) {
  if (!show) return null;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/90 bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between border-l-4 border-l-amber-600/50">
      <p className="text-sm text-muted-foreground text-pretty leading-relaxed">
        Cálculo listo. Esta acción incluye esta partida en el carrito de la cotización y te lleva ahí mismo.
      </p>
      <Button
        type="button"
        size="lg"
        className="w-full sm:w-auto shrink-0"
        onClick={() => onGoToQuote()}
      >
        <FileText className="h-4 w-4" />
        Ir a cotización
      </Button>
    </div>
  );
}
