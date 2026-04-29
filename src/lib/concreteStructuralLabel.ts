/**
 * Fragmento para etiquetas del carrito y la IA: solo columnas, solo vigas, ambas o nada (solo losa).
 */
export function structuralConcretePhrase(
  columnGroups: number,
  beamGroups: number
): "" | "columnas" | "vigas" | "columnas y vigas" {
  const c = columnGroups > 0;
  const b = beamGroups > 0;
  if (c && b) return "columnas y vigas";
  if (c) return "columnas";
  if (b) return "vigas";
  return "";
}
