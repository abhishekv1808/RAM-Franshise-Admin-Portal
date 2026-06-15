import { type NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getStatementData } from "@/lib/settlement";
import { buildStatementPdf } from "@/lib/settlement-pdf";
import { buildStatementXlsx } from "@/lib/settlement-xlsx";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "super_admin") return new NextResponse("Forbidden", { status: 403 });

  const sp = req.nextUrl.searchParams;
  const franchise = sp.get("franchise");
  const from = sp.get("from");
  const to = sp.get("to");
  const format = sp.get("format") === "xlsx" ? "xlsx" : "pdf";
  if (!franchise || !from || !to) return new NextResponse("Missing parameters", { status: 400 });

  const data = await getStatementData(supabase, franchise, from, to);
  if (!data) return new NextResponse("Franchise not found", { status: 404 });

  const base = `Settlement-${data.code}-${from.slice(0, 7)}`;

  if (format === "xlsx") {
    const buf = await buildStatementXlsx(data);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${base}.xlsx"`,
      },
    });
  }

  const buf = await buildStatementPdf(data);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${base}.pdf"`,
    },
  });
}
