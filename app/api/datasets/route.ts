import { NextResponse } from "next/server";
import { listDatasets, upsertDataset } from "@/lib/db";
import type { DatasetMode } from "@/lib/types";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ datasets: listDatasets() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    title?: string;
    mode?: DatasetMode;
    unit?: string;
    source?: string;
    sourceUrl?: string;
    year?: number | null;
    items?: { label: string; value: number; color?: string | null }[];
  };
  if (!body.title?.trim() || !body.items?.length) {
    return NextResponse.json(
      { error: "title and at least one item are required" },
      { status: 400 },
    );
  }
  const dataset = upsertDataset({
    title: body.title.trim(),
    mode: body.mode === "compare" ? "compare" : "rank",
    unit: body.unit,
    source: body.source,
    sourceUrl: body.sourceUrl,
    year: body.year,
    items: body.items,
  });
  return NextResponse.json({ dataset });
}
