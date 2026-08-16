import type { DatasetMode } from "./types";

export type SeedItem = {
  label: string;
  value: number;
  color?: string;
};

export type SeedDataset = {
  id: string;
  title: string;
  mode: DatasetMode;
  unit: string;
  source: string;
  sourceUrl: string;
  year: number;
  items: SeedItem[];
};

/**
 * Licensed cannabis retail has no single federal establishment API.
 * These are rounded compilations from state licensing reports and
 * industry trackers (2024–2025), for demo animation — replace via CSV.
 */
export const SEEDS: SeedDataset[] = [
  {
    id: "seed-dispensaries-by-state",
    title: "Licensed dispensaries by state",
    mode: "rank",
    unit: "stores",
    source: "Compiled from state licensing reports & industry trackers (not a federal API)",
    sourceUrl: "https://www.census.gov/programs-surveys/cbp.html",
    year: 2025,
    items: [
      { label: "Oklahoma", value: 2200 },
      { label: "California", value: 1850 },
      { label: "Michigan", value: 850 },
      { label: "Colorado", value: 700 },
      { label: "Oregon", value: 650 },
      { label: "Washington", value: 500 },
      { label: "Missouri", value: 350 },
      { label: "Massachusetts", value: 250 },
      { label: "New York", value: 250 },
      { label: "Arizona", value: 200 },
      { label: "Illinois", value: 200 },
      { label: "New Jersey", value: 200 },
      { label: "New Mexico", value: 200 },
      { label: "Ohio", value: 180 },
      { label: "Pennsylvania", value: 180 },
      { label: "Montana", value: 180 },
      { label: "Maryland", value: 150 },
      { label: "Nevada", value: 150 },
      { label: "Maine", value: 120 },
      { label: "Florida", value: 70 },
    ],
  },
  {
    id: "seed-ice-cream-vs-dispensaries",
    title: "Ice cream stores vs dispensaries",
    mode: "compare",
    unit: "U.S. locations",
    source: "Ice cream: replace with Census CBP NAICS 722515. Dispensaries: compiled state licenses.",
    sourceUrl: "https://api.census.gov/data/2023/cbp.html",
    year: 2023,
    items: [
      { label: "Ice cream stores", value: 28400, color: "#7dd3fc" },
      { label: "Dispensaries", value: 12410, color: "#86efac" },
    ],
  },
];
