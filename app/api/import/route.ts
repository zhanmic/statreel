import { NextResponse } from "next/server";
import { parseCsvTable } from "@/lib/csv";
import { upsertDataset } from "@/lib/db";
import type { DatasetMode } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  const text = await file.text();
  const items = parseCsvTable(text);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "CSV needs label/name and value/count columns" },
      { status: 400 },
    );
  }
  const mode = (String(form.get("mode") ?? "rank") === "compare"
    ? "compare"
    : "rank") as DatasetMode;
  const title =
    String(form.get("title") ?? "").trim() ||
    file.name.replace(/\.csv$/i, "") ||
    "Imported CSV";
  const dataset = upsertDataset({
    title,
    mode,
    unit: String(form.get("unit") ?? ""),
    source: String(form.get("source") ?? "CSV import"),
    items,
  });
  return NextResponse.json({ dataset });
}
