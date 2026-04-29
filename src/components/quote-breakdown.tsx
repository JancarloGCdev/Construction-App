import type { CalculationResult } from "@/core/types";
import { getClientQuoteTotals, laborRowsClientPesos, materialRowsClientPesos } from "@/lib/clientQuote";
import { formatCop } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QuoteBreakdownProps = {
  result: CalculationResult;
};

/**
 * Vista alineada al envío cliente: ítems redondeados, sin línea aparte de margen
 * (factor comercial dentro de «mano de obra»).
 */
export function QuoteBreakdown({ result }: QuoteBreakdownProps) {
  const { materialsRounded, laborWithMarginRounded, totalRounded } = getClientQuoteTotals(
    result.totals,
  );
  const materials = materialRowsClientPesos(result.materials, materialsRounded);
  const labor = laborRowsClientPesos(result.labor, laborWithMarginRounded);

  return (
    <div className="space-y-4">
      <div
        role="note"
        className="rounded-xl border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20 px-3 py-2 text-xs text-muted-foreground leading-relaxed text-pretty"
      >
        <span className="font-medium text-foreground">Aviso:</span> los montos son una guía en COP enteros para el
        cliente; mercado y obra definen lo definitivo — no reemplazan una oferta formal sin revisión.
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Materiales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {materials.map((m) => (
            <div
              key={m.name + m.unit}
              className="flex justify-between gap-3 border-b border-border/50 pb-2 last:border-0"
            >
              <span className="text-muted-foreground">
                {m.name} — {m.quantity} {m.unit}
              </span>
              <span className="font-medium tabular-nums">{formatCop(m.subtotal)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-1 font-semibold">
            <span>Subtotal materiales</span>
            <span className="tabular-nums">{formatCop(materialsRounded)}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Mano de obra (precio cotizado)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {labor.map((l) => (
            <div
              key={`${l.name}-${l.unit}`}
              className="flex justify-between gap-3 border-b border-border/50 pb-2 last:border-0"
            >
              <span className="text-muted-foreground">
                {l.unit === "global"
                  ? l.name
                  : `${l.name} — ${l.quantity} ${l.unit}`}
              </span>
              <span className="font-medium tabular-nums">{formatCop(l.subtotal)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-1 font-semibold">
            <span>Subtotal mano de obra</span>
            <span className="tabular-nums">{formatCop(laborWithMarginRounded)}</span>
          </div>
        </CardContent>
      </Card>
      <Card className="border border-border/90 bg-gradient-to-b from-card to-muted/30 shadow-sm">
        <CardContent className="pt-5 space-y-2 text-sm">
          <div className="flex justify-between text-lg font-bold pt-1 border-t border-border/80">
            <span className="text-foreground">Total</span>
            <span className="tabular-nums text-foreground tracking-tight">{formatCop(totalRounded)}</span>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            Total = materiales + mano de obra (incluye factor cotizado). Sin desglose de
            margen en esta vista.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
