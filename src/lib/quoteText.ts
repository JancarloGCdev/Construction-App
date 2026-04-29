import type { CalculationResult } from "@/core/types";
import { formatCop } from "./format";
import {
  extrasRowsClientPesos,
  getClientQuoteTotals,
  laborRowsClientPesos,
  materialRowsClientPesos,
} from "./clientQuote";

function lineSection(
  title: string,
  lines: { label: string; value: string }[]
): string {
  const body = lines.map((l) => `  • ${l.label}: ${l.value}`).join("\n");
  return `${title}\n${body}`;
}

/**
 * Texto plano para cliente (WhatsApp / copiar): COP enteros,
 * sin desglosar margen; lo comercial va integrado en la mano de obra.
 */
export function buildQuoteText(params: {
  clientName: string;
  jobDescription: string;
  /** Líneas descriptivas (ítems del carrito) */
  itemLines: string[];
  result: CalculationResult;
}): string {
  const { clientName, jobDescription, itemLines, result } = params;
  const itemBlock =
    itemLines.length === 0
      ? "Sin ítems listados"
      : itemLines.length === 1
        ? `Calculadora: ${itemLines[0]}`
        : `Ítems en cotización:\n${itemLines.map((l, i) => `  ${i + 1}. ${l}`).join("\n")}`;

  const {
    materialsRounded,
    extrasRounded,
    laborWithMarginRounded,
    totalRounded,
  } = getClientQuoteTotals(result.totals);

  const mats = materialRowsClientPesos(result.materials, materialsRounded);
  const labs = laborRowsClientPesos(result.labor, laborWithMarginRounded);
  const exs = extrasRowsClientPesos(result.extras, extrasRounded);

  const matLines =
    mats.length > 0
      ? mats.map((m) => ({
          label: `${m.name} (${m.quantity} ${m.unit})`,
          value: formatCop(m.subtotal),
        }))
      : [{ label: "Total materiales", value: formatCop(materialsRounded) }];

  const labLines =
    labs.length > 0
      ? labs.map((l) => ({
          label:
            l.unit === "global"
              ? l.name
              : `${l.name} (${l.quantity} ${l.unit})`,
          value: formatCop(l.subtotal),
        }))
      : [{ label: "Mano de obra (precio cotizado)", value: formatCop(laborWithMarginRounded) }];

  const exLines = exs.map((e) => ({
    label: e.name,
    value: formatCop(e.subtotal),
  }));

  const parts: string[] = [
    `*ConstruYa — Cotización*`,
    ``,
    `*Aviso:* montos orientativos en COP (pesos enteros); estimación según tus precios en la app. No equivalen a oferta contractual sin validación previa.`,
    ``,
    `Cliente: ${clientName}`,
    `Trabajo: ${jobDescription.trim() ? jobDescription.trim() : "(Sin descripción textual)"}`,
    itemBlock,
    ``,
    lineSection("Materiales", matLines),
    ``,
    lineSection("Mano de obra (precio cotizado)", labLines),
  ];
  if (exLines.length > 0) {
    parts.push(``, lineSection("Otros / extras", exLines));
  }
  parts.push(
    ``,
    `Subtotal materiales: ${formatCop(materialsRounded)}`,
    `Subtotal mano de obra: ${formatCop(laborWithMarginRounded)}`,
    ...(extrasRounded !== 0 ? [`Otros / extras: ${formatCop(extrasRounded)}`] : []),
    ``,
    `*TOTAL: ${formatCop(totalRounded)}*`,
    ``,
    `La mano de obra mostrada es el valor cotizado al cliente e incluye el factor sobre costo estimado.`,
  );
  return parts.join("\n");
}
