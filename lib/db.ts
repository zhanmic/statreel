import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SEEDS } from "./seeds";
import type { Dataset, DatasetMode, DatasetSummary } from "./types";

const DB_PATH = join(process.cwd(), "data", "statreel.sqlite");

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
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
    );
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dataset_id TEXT NOT NULL,
      label TEXT NOT NULL,
      value REAL NOT NULL,
      color TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
    );
  `);
  seedIfEmpty(db);
  return db;
}

function seedIfEmpty(database: DatabaseSync) {
  const row = database.prepare("SELECT COUNT(*) AS n FROM datasets").get() as {
    n: number;
  };
  if (row.n > 0) return;
  const now = new Date().toISOString();
  const insertDataset = database.prepare(
    `INSERT INTO datasets (id, title, mode, unit, source, source_url, year, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertItem = database.prepare(
    `INSERT INTO items (dataset_id, label, value, color, sort_order) VALUES (?, ?, ?, ?, ?)`,
  );
  for (const seed of SEEDS) {
    insertDataset.run(
      seed.id,
      seed.title,
      seed.mode,
      seed.unit,
      seed.source,
      seed.sourceUrl,
      seed.year,
      now,
      now,
    );
    seed.items.forEach((item, index) => {
      insertItem.run(seed.id, item.label, item.value, item.color ?? null, index);
    });
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

export function listDatasets(): DatasetSummary[] {
  const rows = getDb()
    .prepare(
      `SELECT d.*, (SELECT COUNT(*) FROM items i WHERE i.dataset_id = d.id) AS item_count
       FROM datasets d ORDER BY d.updated_at DESC`,
    )
    .all() as Record<string, unknown>[];
  return rows.map((row) => ({
    ...mapDataset(row),
    itemCount: Number(row.item_count),
  }));
}

export function getDataset(id: string): Dataset | null {
  const row = getDb()
    .prepare("SELECT * FROM datasets WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return null;
  const items = getDb()
    .prepare(
      "SELECT * FROM items WHERE dataset_id = ? ORDER BY sort_order ASC, value DESC",
    )
    .all(id) as Record<string, unknown>[];
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

export function deleteDataset(id: string): boolean {
  const result = getDb().prepare("DELETE FROM datasets WHERE id = ?").run(id);
  return Number(result.changes) > 0;
}

export function upsertDataset(input: {
  id?: string;
  title: string;
  mode: DatasetMode;
  unit?: string;
  source?: string;
  sourceUrl?: string;
  year?: number | null;
  items: { label: string; value: number; color?: string | null }[];
}): Dataset {
  const database = getDb();
  const id = input.id ?? `ds-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const existing = database
    .prepare("SELECT created_at FROM datasets WHERE id = ?")
    .get(id) as { created_at: string } | undefined;

  if (existing) {
    database
      .prepare(
        `UPDATE datasets SET title = ?, mode = ?, unit = ?, source = ?, source_url = ?, year = ?, updated_at = ?
         WHERE id = ?`,
      )
      .run(
        input.title,
        input.mode,
        input.unit ?? "",
        input.source ?? "",
        input.sourceUrl ?? "",
        input.year ?? null,
        now,
        id,
      );
    database.prepare("DELETE FROM items WHERE dataset_id = ?").run(id);
  } else {
    database
      .prepare(
        `INSERT INTO datasets (id, title, mode, unit, source, source_url, year, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.title,
        input.mode,
        input.unit ?? "",
        input.source ?? "",
        input.sourceUrl ?? "",
        input.year ?? null,
        now,
        now,
      );
  }

  const insertItem = database.prepare(
    `INSERT INTO items (dataset_id, label, value, color, sort_order) VALUES (?, ?, ?, ?, ?)`,
  );
  input.items.forEach((item, index) => {
    insertItem.run(id, item.label, item.value, item.color ?? null, index);
  });

  const saved = getDataset(id);
  if (!saved) throw new Error("Failed to save dataset");
  return saved;
}
