import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireBioechemAdmin } from "@/lib/admin/require-admin";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireBioechemAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const db = createServiceRoleClient();
  if (!db) return NextResponse.json({ error: "Storage not configured." }, { status: 500 });

  const { data: item, error } = await db
    .from("drive_items")
    .select("storage_path, name, mime_type")
    .eq("id", id)
    .single();

  if (error || !item) return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!item.storage_path) return NextResponse.json({ error: "No storage path." }, { status: 400 });
  if (!/\.xlsx?$/i.test(item.name))
    return NextResponse.json({ error: "Only .xlsx/.xls files can be parsed." }, { status: 400 });

  const { data: blob, error: downloadError } = await db.storage.from("drive").download(item.storage_path);
  if (downloadError || !blob) return NextResponse.json({ error: downloadError?.message ?? "Failed to download file." }, { status: 500 });

  const workbook = new ExcelJS.Workbook();
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- exceljs ships a conflicting nested @types/node Buffer type
    await workbook.xlsx.load(Buffer.from(await blob.arrayBuffer()) as any);
  } catch {
    return NextResponse.json({ error: "Failed to parse spreadsheet. Is it a valid .xlsx file?" }, { status: 400 });
  }

  const sheets = workbook.worksheets.map((sheet) => {
    const found = new Set<string>();
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        const text = cell.text ?? "";
        for (const match of text.matchAll(EMAIL_RE)) found.add(match[0].toLowerCase());
      });
    });
    return { name: sheet.name, emails: Array.from(found).sort() };
  });

  return NextResponse.json({ data: { sheets } });
}
