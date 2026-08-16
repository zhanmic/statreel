import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { SEEDS } from "./seeds";
import type { Dataset, DatasetMode, DatasetSummary } from "./types";

type Sql = NeonQueryFunction<false, false>;

let sql: Sql | null = null;
let ready: Promise<void> | null = null;

function databaseUrl(): string {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. In Vercel: Storage → Create Database → Neon. Locally: copy the Neon URI into .env.local.",
    );
  }
  return url;
}

function getSql(): Sql {
  if (!sql) sql = neon(databaseUrl());
  return sql;
}

async function ensureDb(): Promise<Sql> {
  const client = getSql();
  if (!ready) ready = initSchema(client);
  await ready;
  return client;
}

async function initSchema(client: Sql) {
  await client`
    CREATE TABLE IF NOT EXISTS datasets (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      mode TEXT NOT NULL CHECK (mode IN ('rank', 'compare')),
      unit TEXT NOT NULL DEFAULT '',
      source TEXT NOT NULL DEFAULT '',
      source_url TEXT NOT NULL DEFAULT '',
      year INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `;
  await client`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      value DOUBLE PRECISION NOT NULL,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `;
  const counted = await client`SELECT COUNT(*)::int AS n FROM datasets`;
  if (Number(counted[0]?.n) > 0) return;

  const now = new Date().toISOString();
  for (const seed of SEEDS) {
    await client`
      INSERT INTO datasets (id, title, mode, unit, source, source_url, year, created_at, updated_at)
      VALUES (
        ${seed.id}, ${seed.title}, ${seed.mode}, ${seed.unit},
        ${seed.source}, ${seed.sourceUrl}, ${seed.year}, ${now}, ${now}
      )
    `;
    for (const [index, item] of seed.items.entries()) {
      await client`
        INSERT INTO items (dataset_id, label, value, color, sort_order)
        VALUES (${seed.id}, ${item.label}, ${item.value}, ${item.color ?? null}, ${index})
      `;
    }
  }
}

function mapDataset(row: Record<string, unknown>): Omit<Dataset, "items"> {
  return {
    id: String(row.id),
    title: String(row.title),
    mode: row.mode as DatasetMode,
    unit: String(row.unit ?? ""),
    source: String(row.source ?? ""),
    sourceUrl: String(row.source_url ?? ""),
    year: row.year == null ? null : Number(row.year),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function listDatasets(): Promise<DatasetSummary[]> {
  const client = await ensureDb();
  const rows = await client`
    SELECT d.*, (SELECT COUNT(*) FROM items i WHERE i.dataset_id = d.id)::int AS item_count
    FROM datasets d
    ORDER BY d.updated_at DESC
  `;
  return rows.map((row) => ({
    ...mapDataset(row as Record<string, unknown>),
    itemCount: Number(row.item_count),
  }));
}

export async function getDataset(id: string): Promise<Dataset | null> {
  const client = await ensureDb();
  const rows = await client`SELECT * FROM datasets WHERE id = ${id}`;
  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;
  const items = await client`
    SELECT * FROM items WHERE dataset_id = ${id}
    ORDER BY sort_order ASC, value DESC
  `;
  return {
    ...mapDataset(row),
    items: items.map((item) => ({
      id: Number(item.id),
      datasetId: String(item.dataset_id),
      label: String(item.label),
      value: Number(item.value),
      color: item.color == null ? null : String(item.color),
      sortOrder: Number(item.sort_order),
    })),
  };
}

export async function deleteDataset(id: string): Promise<boolean> {
  const client = await ensureDb();
  const result = await client`DELETE FROM datasets WHERE id = ${id} RETURNING id`;
  return result.length > 0;
}

export async function upsertDataset(input: {
  id?: string;
  title: string;
  mode: DatasetMode;
  unit?: string;
  source?: string;
  sourceUrl?: string;
  year?: number | null;
  items: { label: string; value: number; color?: string | null }[];
}): Promise<Dataset> {
  const client = await ensureDb();
  const id = input.id ?? `ds-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const existing = await client`SELECT created_at FROM datasets WHERE id = ${id}`;

  if (existing[0]) {
    await client`
      UPDATE datasets
      SET title = ${input.title},
          mode = ${input.mode},
          unit = ${input.unit ?? ""},
          source = ${input.source ?? ""},
          source_url = ${input.sourceUrl ?? ""},
          year = ${input.year ?? null},
          updated_at = ${now}
      WHERE id = ${id}
    `;
    await client`DELETE FROM items WHERE dataset_id = ${id}`;
  } else {
    await client`
      INSERT INTO datasets (id, title, mode, unit, source, source_url, year, created_at, updated_at)
      VALUES (
        ${id}, ${input.title}, ${input.mode}, ${input.unit ?? ""},
        ${input.source ?? ""}, ${input.sourceUrl ?? ""}, ${input.year ?? null},
        ${now}, ${now}
      )
    `;
  }

  for (const [index, item] of input.items.entries()) {
    await client`
      INSERT INTO items (dataset_id, label, value, color, sort_order)
      VALUES (${id}, ${item.label}, ${item.value}, ${item.color ?? null}, ${index})
    `;
  }

  const saved = await getDataset(id);
  if (!saved) throw new Error("Failed to save dataset");
  return saved;
}
