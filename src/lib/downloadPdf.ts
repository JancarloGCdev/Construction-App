import { pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";

type PdfDocumentInput = NonNullable<Parameters<typeof pdf>[0]>;

export async function downloadReactPdf(
  element: ReactElement,
  filename: string
): Promise<void> {
  const blob = await pdf(element as PdfDocumentInput).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
