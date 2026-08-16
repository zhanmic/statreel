import { NextResponse } from "next/server";
import { censusKeyConfigured, importCensusDataset } from "@/lib/census";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({
    configured: censusKeyConfigured(),
    signup: "https://api.census.gov/data/key_signup.html",
    exampleNaics: "722515",
    note: "722515 is Census CBP snack and nonalcoholic beverage bars (includes ice cream shops).",
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    naics?: string;
    title?: string;
    year?: number;
    topN?: number;
  };
  if (!body.naics?.trim()) {
    return NextResponse.json({ error: "naics is required" }, { status: 400 });
  }
  try {
    const dataset = await importCensusDataset({
      naics: body.naics,
      title: body.title,
      year: body.year,
      topN: body.topN,
    });
    return NextResponse.json({ dataset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Census fetch failed";
    const status = message.includes("CENSUS_API_KEY") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
