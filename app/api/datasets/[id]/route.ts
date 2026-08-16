import { NextResponse } from "next/server";
import { deleteDataset, getDataset } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const dataset = await getDataset(id);
  if (!dataset) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }
  return NextResponse.json({ dataset });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const ok = await deleteDataset(id);
  if (!ok) {
    return NextResponse.json({ error: "Dataset not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
