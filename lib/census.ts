import { upsertDataset } from "./db";
import type { Dataset } from "./types";

const STATE_ABBR: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  "District of Columbia": "DC",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
};

export const DEFAULT_CENSUS_YEAR = 2023;
export const ICE_CREAM_NAICS = "722515";

export function censusKeyConfigured(): boolean {
  return Boolean(process.env.CENSUS_API_KEY?.trim());
}

export async function fetchCensusEstablishments(input: {
  naics: string;
  year?: number;
}): Promise<{
  year: number;
  naics: string;
  label: string;
  items: { label: string; value: number }[];
}> {
  const key = process.env.CENSUS_API_KEY?.trim();
  if (!key) {
    throw new Error(
      "CENSUS_API_KEY is required for live Census pulls. Get a free key at https://api.census.gov/data/key_signup.html and add it to .env.local",
    );
  }

  const year = input.year ?? DEFAULT_CENSUS_YEAR;
  const naics = input.naics.trim();
  const params = new URLSearchParams({
    get: "NAME,NAICS2017_LABEL,ESTAB",
    for: "state:*",
    NAICS2017: naics,
    key,
  });
  const url = `https://api.census.gov/data/${year}/cbp?${params.toString()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Census CBP ${year} failed (${response.status}). ${body.slice(0, 240)}`,
    );
  }

  const table = (await response.json()) as string[][];
  if (!Array.isArray(table) || table.length < 2) {
    throw new Error("Census returned no state rows for that NAICS code.");
  }

  const header = table[0];
  const nameIdx = header.indexOf("NAME");
  const labelIdx = header.indexOf("NAICS2017_LABEL");
  const estabIdx = header.indexOf("ESTAB");
  const items = table
    .slice(1)
    .map((row) => {
      const name = row[nameIdx] ?? "";
      const short = STATE_ABBR[name] ? `${STATE_ABBR[name]}  ${name}` : name;
      return { label: short, value: Number(row[estabIdx] ?? 0) };
    })
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => b.value - a.value);

  return {
    year,
    naics,
    label: table[1]?.[labelIdx] || `NAICS ${naics}`,
    items,
  };
}

export async function importCensusDataset(input: {
  naics: string;
  title?: string;
  year?: number;
  topN?: number;
}): Promise<Dataset> {
  const pulled = await fetchCensusEstablishments(input);
  const topN = input.topN && input.topN > 0 ? input.topN : pulled.items.length;
  const items = pulled.items.slice(0, topN);
  const title =
    input.title?.trim() ||
    `${pulled.label} by state (${pulled.year})`;

  return upsertDataset({
    id: `census-${pulled.year}-${input.naics}`,
    title,
    mode: "rank",
    unit: "establishments",
    source: `U.S. Census Bureau, County Business Patterns ${pulled.year}, NAICS ${input.naics}`,
    sourceUrl: `https://api.census.gov/data/${pulled.year}/cbp.html`,
    year: pulled.year,
    items,
  });
}
