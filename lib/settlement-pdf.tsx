import path from "node:path";
import { Document, Page, View, Text, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";

import type { StatementData } from "./settlement";
import { formatINR } from "./format";

// Embed Inter (bundled in public/fonts) so the PDF uses true brand typography
// and renders the ₹ glyph (absent from the base PDF fonts).
const fontDir = path.join(process.cwd(), "public", "fonts");
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(fontDir, "Inter-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Inter-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "Inter-Bold.ttf"), fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]); // never hyphenate

const rs = (n: number) => formatINR(n);
const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const NAVY = "#1B3A6B";
const GOLD = "#C9A84C";

const s = StyleSheet.create({
  page: { fontSize: 9, fontFamily: "Inter", color: "#0f172a" },
  band: { backgroundColor: NAVY, paddingHorizontal: 28, paddingVertical: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { width: 30, height: 30, backgroundColor: GOLD, borderRadius: 6, color: NAVY, fontSize: 16, fontFamily: "Inter", fontWeight: 700, textAlign: "center", paddingTop: 6 },
  brand: { color: "#ffffff", fontSize: 14, fontFamily: "Inter", fontWeight: 700 },
  brandSub: { color: "#cbd5e1", fontSize: 8, marginTop: 2 },
  docTitle: { color: "#ffffff", fontSize: 12, fontFamily: "Inter", fontWeight: 700, textAlign: "right" },
  docRef: { color: GOLD, fontSize: 9, textAlign: "right", marginTop: 3 },
  goldRule: { height: 3, backgroundColor: GOLD },
  body: { paddingHorizontal: 28, paddingVertical: 22 },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 18 },
  metaItem: { width: "50%", marginBottom: 6 },
  metaLabel: { fontSize: 7, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 0.5 },
  metaVal: { fontSize: 10, color: "#0f172a", marginTop: 1, fontFamily: "Inter", fontWeight: 700 },
  thead: { flexDirection: "row", backgroundColor: NAVY, color: "#ffffff", paddingVertical: 6, paddingHorizontal: 6 },
  th: { fontSize: 8, fontFamily: "Inter", fontWeight: 700 },
  tr: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  trAlt: { backgroundColor: "#f8fafc" },
  td: { fontSize: 9 },
  cDate: { width: "15%" },
  cClient: { width: "27%" },
  cService: { width: "26%" },
  cGross: { width: "14%", textAlign: "right" },
  cPct: { width: "8%", textAlign: "right" },
  cComm: { width: "10%", textAlign: "right" },
  totalsWrap: { marginTop: 18, alignItems: "flex-end" },
  totalsBox: { width: 250, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 6 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#eef1f4" },
  totalLabel: { fontSize: 9, color: "#475569" },
  totalVal: { fontSize: 9, fontFamily: "Inter", fontWeight: 700, color: "#0f172a" },
  netRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, paddingHorizontal: 12, backgroundColor: NAVY },
  netLabel: { fontSize: 10, color: "#ffffff", fontFamily: "Inter", fontWeight: 700 },
  netVal: { fontSize: 11, color: GOLD, fontFamily: "Inter", fontWeight: 700 },
  empty: { fontSize: 9, color: "#94a3b8", paddingVertical: 16, textAlign: "center" },
  footer: { position: "absolute", bottom: 24, left: 28, right: 28, borderTopWidth: 1, borderTopColor: "#e2e8f0", paddingTop: 8, fontSize: 7, color: "#94a3b8", flexDirection: "row", justifyContent: "space-between" },
});

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaItem}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaVal}>{value}</Text>
    </View>
  );
}

function StatementDoc({ d }: { d: StatementData }) {
  return (
    <Document title={`Settlement Statement ${d.reference}`} author="Right Assets Management">
      <Page size="A4" style={s.page}>
        <View style={s.band}>
          <View style={s.logoRow}>
            <Text style={s.logo}>R</Text>
            <View>
              <Text style={s.brand}>RAM</Text>
              <Text style={s.brandSub}>Right Assets Management</Text>
            </View>
          </View>
          <View>
            <Text style={s.docTitle}>SETTLEMENT STATEMENT</Text>
            <Text style={s.docRef}>{d.reference}</Text>
          </View>
        </View>
        <View style={s.goldRule} />

        <View style={s.body}>
          <View style={s.metaGrid}>
            <Meta label="Franchise" value={`${d.franchiseName} (${d.code})`} />
            <Meta label="Period" value={d.periodLabel} />
            <Meta label="Statement Reference" value={d.reference} />
            <Meta label="Generated" value={d.generatedAt} />
          </View>

          {/* Payments table */}
          <View style={s.thead}>
            <Text style={[s.th, s.cDate]}>Date</Text>
            <Text style={[s.th, s.cClient]}>Client</Text>
            <Text style={[s.th, s.cService]}>Service</Text>
            <Text style={[s.th, s.cGross]}>Gross</Text>
            <Text style={[s.th, s.cPct]}>Comm %</Text>
            <Text style={[s.th, s.cComm]}>Commission</Text>
          </View>
          {d.rows.length === 0 ? (
            <Text style={s.empty}>No verified payments in this period.</Text>
          ) : (
            d.rows.map((r, i) => (
              <View key={i} style={i % 2 === 1 ? [s.tr, s.trAlt] : s.tr}>
                <Text style={[s.td, s.cDate]}>{fmtDate(r.date)}</Text>
                <Text style={[s.td, s.cClient]}>{r.client}</Text>
                <Text style={[s.td, s.cService]}>{r.service}</Text>
                <Text style={[s.td, s.cGross]}>{rs(r.gross)}</Text>
                <Text style={[s.td, s.cPct]}>{r.pct}%</Text>
                <Text style={[s.td, s.cComm]}>{rs(r.commission)}</Text>
              </View>
            ))
          )}

          {/* Totals */}
          <View style={s.totalsWrap}>
            <View style={s.totalsBox}>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Gross Collected</Text>
                <Text style={s.totalVal}>{rs(d.totals.grossCollected)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Commission Earned</Text>
                <Text style={s.totalVal}>{rs(d.totals.commissionEarned)}</Text>
              </View>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Already Settled</Text>
                <Text style={s.totalVal}>{rs(d.totals.alreadySettled)}</Text>
              </View>
              <View style={s.netRow}>
                <Text style={s.netLabel}>Net Owed This Period</Text>
                <Text style={s.netVal}>{rs(d.totals.netOwed)}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>This is a system-generated settlement statement and does not require a signature.</Text>
          <Text>Generated {d.generatedAt}</Text>
        </View>
      </Page>
    </Document>
  );
}

export function buildStatementPdf(d: StatementData): Promise<Buffer> {
  return renderToBuffer(<StatementDoc d={d} />);
}
