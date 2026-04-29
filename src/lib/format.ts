const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const integerEsCo = new Intl.NumberFormat("es-CO", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCop(value: number): string {
  return cop.format(Math.round(value));
}

/** Miles con punto (`48.000`) según hábito Colombia; sin sufijo monetario para inputs. */
export function formatIntegerEsCO(value: number): string {
  if (!Number.isFinite(value)) return "";
  return integerEsCo.format(Math.round(value));
}

/**
 * Acepta cifras escritas con o sin separador de miles (puntos) y coma decimal opcional.
 */
export function parseLocaleNumberInput(raw: string): number {
  const t = raw.trim().replace(/\s/g, "");
  if (t === "") return Number.NaN;
  const commaIdx = t.lastIndexOf(",");
  let normalized: string;
  if (commaIdx >= 0) {
    normalized = `${t.slice(0, commaIdx).replace(/\./g, "")}.${t.slice(commaIdx + 1)}`;
  } else {
    normalized = t.replace(/\./g, "");
  }
  const n = Number.parseFloat(normalized);
  return Number.isNaN(n) ? Number.NaN : n;
}

export function buildWhatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
