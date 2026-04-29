"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { CalculationResult } from "@/core/types";
import { formatCop } from "@/lib/format";
import {
  extrasRowsClientPesos,
  getClientQuoteTotals,
  laborRowsClientPesos,
  materialRowsClientPesos,
} from "@/lib/clientQuote";

const c = {
  brand: "#c2410c",
  muted: "#525252",
  border: "#e5e5e5",
  surface: "#fafafa",
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#171717",
  },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: c.brand, paddingBottom: 12 },
  title: { fontSize: 20, color: c.brand, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 9, color: c.muted },
  section: { marginTop: 14 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: c.brand,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    paddingVertical: 5,
    paddingHorizontal: 2,
  },
  rowAlt: { backgroundColor: c.surface },
  colMain: { flex: 1, paddingRight: 8 },
  colSub: { width: 80, textAlign: "right" as const, fontFamily: "Helvetica-Bold" },
  small: { fontSize: 8, color: c.muted },
  totals: { marginTop: 16, padding: 12, backgroundColor: "#fff7ed", borderRadius: 4 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  totalBig: { fontSize: 14, color: c.brand, fontFamily: "Helvetica-Bold" },
  footer: { marginTop: 24, fontSize: 8, color: c.muted, textAlign: "center" as const },
});

type QuotePdfDocumentProps = {
  clientName: string;
  jobDescription: string;
  summaryLine: string;
  result: CalculationResult;
  generatedAt: string;
};

export function QuotePdfDocument({
  clientName,
  jobDescription,
  summaryLine,
  result,
  generatedAt,
}: QuotePdfDocumentProps) {
  const { materialsRounded, extrasRounded, laborWithMarginRounded, totalRounded } =
    getClientQuoteTotals(result.totals);
  const materials = materialRowsClientPesos(
    result.materials,
    materialsRounded,
  );
  const labor = laborRowsClientPesos(result.labor, laborWithMarginRounded);
  const extras = extrasRowsClientPesos(result.extras, extrasRounded);
  const hasExtrasRows = extras.length > 0;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>COTIZACIÓN — ConstruYa</Text>
          <Text style={styles.subtitle}>
            {generatedAt} · COP (pesos enteros) orientativos; estimación previa sin compromiso hasta validar obra
          </Text>
        </View>
        <View style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 9, marginBottom: 2 }}>Cliente: {clientName}</Text>
          {jobDescription.trim() ? (
            <Text style={{ fontSize: 9, marginBottom: 2 }}>Trabajo: {jobDescription}</Text>
          ) : null}
          <Text style={{ fontSize: 8, color: c.muted, marginTop: 4 }}>Ítems: {summaryLine}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Materiales</Text>
          {materials.length === 0 ? (
            <Text style={[styles.small, { paddingVertical: 4 }]}>
              {materialsRounded > 0
                ? `Total materiales (consolidado): ${formatCop(materialsRounded)}`
                : "(Sin ítems en este formato)"}
            </Text>
          ) : (
            materials.map((m, i) => (
              <View
                key={`${m.name}-${i}`}
                style={i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
              >
                <Text style={styles.colMain}>
                  {m.name} — {m.quantity} {m.unit}
                </Text>
                <Text style={styles.colSub}>{formatCop(m.subtotal)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mano de obra (precio cotizado)</Text>
          {labor.map((l, i) => (
            <View
              key={`${l.name}-${i}`}
              style={i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
            >
              <Text style={styles.colMain}>
                {l.unit === "global"
                  ? l.name
                  : `${l.name} — ${l.quantity} ${l.unit}`}
              </Text>
              <Text style={styles.colSub}>{formatCop(l.subtotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Otros / extras</Text>
          {hasExtrasRows ? (
            extras.map((e, i) => (
              <View
                key={`${e.name}-${i}`}
                style={i % 2 === 1 ? [styles.row, styles.rowAlt] : styles.row}
              >
                <Text style={styles.colMain}>{e.name}</Text>
                <Text style={styles.colSub}>{formatCop(e.subtotal)}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.small, { paddingVertical: 4 }]}>
              {(extrasRounded !== 0
                ? `Total otros: ${formatCop(extrasRounded)}`
                : "(Sin otros ítems en este formato)")}
            </Text>
          )}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text>Subtotal materiales</Text>
            <Text>{formatCop(materialsRounded)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Subtotal mano de obra</Text>
            <Text>{formatCop(laborWithMarginRounded)}</Text>
          </View>
          {extrasRounded !== 0 ? (
            <View style={styles.totalRow}>
              <Text>Otros / extras</Text>
              <Text>{formatCop(extrasRounded)}</Text>
            </View>
          ) : null}
          <View style={[styles.totalRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: c.brand }]}>
            <Text style={styles.totalBig}>TOTAL</Text>
            <Text style={styles.totalBig}>{formatCop(totalRounded)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Los montos se expresan en pesos COP sin centavos. La mano de obra es precio cotizado e incluye el factor sobre costo estimado.
        </Text>
      </Page>
    </Document>
  );
}
