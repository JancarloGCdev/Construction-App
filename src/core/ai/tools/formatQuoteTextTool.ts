import { z } from "zod";
import type { CalculationResult } from "@/core/types";
import type { ToolDefinition } from "../toolTypes";

const quoteShape = z.object({
  materials: z.array(
    z.object({
      name: z.string(),
      unit: z.string(),
      quantity: z.number(),
      unitCost: z.number(),
      subtotal: z.number(),
    })
  ),
  labor: z.array(
    z.object({
      name: z.string(),
      unit: z.string(),
      quantity: z.number(),
      unitCost: z.number(),
      subtotal: z.number(),
    })
  ),
  extras: z.array(
    z.object({
      name: z.string(),
      subtotal: z.number(),
    })
  ),
  totals: z.object({
    materialsTotal: z.number(),
    laborTotal: z.number(),
    extrasTotal: z.number(),
    subtotal: z.number(),
    profit: z.number(),
    total: z.number(),
  }),
});

const schema = z.object({
  clientName: z.string().optional(),
  address: z.string().optional(),
  description: z.string().optional(),
  quote: quoteShape,
});

function formatCop(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

export const formatQuoteTextTool: ToolDefinition = {
  name: "format_quote_text",
  description: "Formatea una cotización para WhatsApp con totales, fecha y condiciones.",
  schema,
  execute: (args) => {
    const p = schema.parse(args) as {
      clientName?: string;
      address?: string;
      description?: string;
      quote: CalculationResult;
    };
    const t = p.quote.totals;
    const now = new Date();
    const fecha = new Intl.DateTimeFormat("es-CO", {
      dateStyle: "long",
    }).format(now);

    const line = (label: string, value: string) => `${label}: ${value}`;

    const body = [
      "COTIZACIÓN",
      `Fecha: ${fecha}`,
      "",
      p.clientName ? line("Cliente", p.clientName) : null,
      p.address ? line("Dirección", p.address) : null,
      p.description ? line("Trabajo", p.description) : null,
      "",
      "---",
      "DESGLOSE",
    ]
      .filter(Boolean)
      .join("\n");

    const mats = p.quote.materials
      .map((m) => `• ${m.name}: ${m.quantity} ${m.unit} → ${formatCop(m.subtotal)}`)
      .join("\n");
    const lab = p.quote.labor
      .map((l) => `• ${l.name}: ${l.quantity} ${l.unit} → ${formatCop(l.subtotal)}`)
      .join("\n");
    const exLines = p.quote.extras
      .filter((e) => e.subtotal !== 0)
      .map((e) => `• ${e.name}: ${formatCop(e.subtotal)}`);
    const ex = exLines.length > 0 ? exLines.join("\n") : "• (sin otros ítems en este diseño)";

    const end = [
      "",
      "TOTALES",
      `Subtotal materiales: ${formatCop(t.materialsTotal)}`,
      `Subtotal mano de obra: ${formatCop(t.laborTotal)}`,
      ...(t.extrasTotal !== 0 ? [`Otros / extras: ${formatCop(t.extrasTotal)}`] : []),
      `Subtotal: ${formatCop(t.subtotal)}`,
      `Utilidad: ${formatCop(t.profit)}`,
      `TOTAL: ${formatCop(t.total)}`,
      "",
      "CONDICIONES",
      "• Cotización orientativa: precios susceptibles de cambiar; revisar antes de cerrar montos.",
      "• Vigencia sugerida: 7 días salvo otro acuerdo.",
      "• Generado con los precios configurados en ConstruYa al momento del cálculo.",
    ].join("\n");

    return [
      body,
      "",
      "MATERIALES",
      mats,
      "",
      "MANO DE OBRA",
      lab,
      "",
      "OTROS",
      ex,
      end,
    ].join("\n");
  },
};
