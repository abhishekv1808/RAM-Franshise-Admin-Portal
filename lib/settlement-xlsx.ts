import ExcelJS from "exceljs";

import type { StatementData } from "./settlement";

const NAVY = "FF1B3A6B";
const GOLD = "FFC9A84C";
const INR = '"₹"#,##0.00';

export async function buildStatementXlsx(d: StatementData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "RAM Admin";
  const ws = wb.addWorksheet("Settlement", {
    properties: { defaultRowHeight: 16 },
    pageSetup: { paperSize: 9, orientation: "portrait" },
  });

  ws.columns = [
    { width: 14 },
    { width: 26 },
    { width: 24 },
    { width: 16 },
    { width: 10 },
    { width: 16 },
  ];

  // Branded header
  ws.mergeCells("A1:F1");
  const h1 = ws.getCell("A1");
  h1.value = "Right Assets Management";
  h1.font = { name: "Inter", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  h1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  h1.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells("A2:F2");
  const h2 = ws.getCell("A2");
  h2.value = `SETTLEMENT STATEMENT  ·  ${d.reference}`;
  h2.font = { name: "Inter", size: 10, bold: true, color: { argb: NAVY } };
  h2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
  h2.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 20;

  // Meta
  const meta: [string, string][] = [
    ["Franchise", `${d.franchiseName} (${d.code})`],
    ["Period", d.periodLabel],
    ["Statement Reference", d.reference],
    ["Generated", d.generatedAt],
  ];
  let r = 4;
  for (const [k, v] of meta) {
    ws.getCell(`A${r}`).value = k;
    ws.getCell(`A${r}`).font = { name: "Inter", size: 9, color: { argb: "FF94A3B8" } };
    ws.getCell(`B${r}`).value = v;
    ws.getCell(`B${r}`).font = { name: "Inter", size: 10, bold: true };
    r++;
  }

  // Table header
  r += 1;
  const headerRow = ws.getRow(r);
  ["Date", "Client", "Service", "Gross", "Comm %", "Commission"].forEach((label, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = label;
    cell.font = { name: "Inter", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { horizontal: i >= 3 ? "right" : "left" };
  });
  headerRow.height = 18;
  const firstDataRow = r + 1;

  for (const row of d.rows) {
    r++;
    const xr = ws.getRow(r);
    xr.getCell(1).value = new Date(`${row.date}T00:00:00`);
    xr.getCell(1).numFmt = "dd mmm yyyy";
    xr.getCell(2).value = row.client;
    xr.getCell(3).value = row.service;
    xr.getCell(4).value = row.gross;
    xr.getCell(4).numFmt = INR;
    xr.getCell(5).value = row.pct / 100;
    xr.getCell(5).numFmt = "0%";
    xr.getCell(6).value = row.commission;
    xr.getCell(6).numFmt = INR;
    xr.eachCell((c) => (c.font = { name: "Inter", size: 10 }));
  }
  if (d.rows.length === 0) {
    r++;
    ws.mergeCells(`A${r}:F${r}`);
    ws.getCell(`A${r}`).value = "No verified payments in this period.";
    ws.getCell(`A${r}`).font = { name: "Inter", size: 10, italic: true, color: { argb: "FF94A3B8" } };
  }

  // Totals
  r += 2;
  const totals: [string, number, boolean][] = [
    ["Gross Collected", d.totals.grossCollected, false],
    ["Commission Earned", d.totals.commissionEarned, false],
    ["Already Settled", d.totals.alreadySettled, false],
    ["Net Owed This Period", d.totals.netOwed, true],
  ];
  for (const [label, value, isNet] of totals) {
    ws.getCell(`E${r}`).value = label;
    ws.getCell(`E${r}`).font = { name: "Inter", size: 10, bold: isNet, color: { argb: isNet ? NAVY : "FF475569" } };
    ws.getCell(`E${r}`).alignment = { horizontal: "right" };
    const v = ws.getCell(`F${r}`);
    v.value = value;
    v.numFmt = INR;
    v.font = { name: "Inter", size: isNet ? 11 : 10, bold: true, color: { argb: isNet ? NAVY : "FF0F172A" } };
    if (isNet) {
      ws.getCell(`E${r}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3EFE0" } };
      v.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3EFE0" } };
    }
    r++;
  }

  // Borders for the table block
  for (let row = firstDataRow - 1; row < firstDataRow + d.rows.length; row++) {
    for (let col = 1; col <= 6; col++) {
      ws.getCell(row, col).border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
    }
  }

  r += 1;
  ws.mergeCells(`A${r}:F${r}`);
  ws.getCell(`A${r}`).value = `This is a system-generated settlement statement. Generated ${d.generatedAt}.`;
  ws.getCell(`A${r}`).font = { name: "Inter", size: 8, italic: true, color: { argb: "FF94A3B8" } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
