export function parseCsvTable(text: string): { label: string; value: number }[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const rows = lines.map(splitCsvLine);
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const looksLikeHeader =
    header.some((cell) => ["label", "name", "state", "item"].includes(cell)) &&
    header.some((cell) => ["value", "count", "n", "total", "estab"].includes(cell));

  const labelIdx = looksLikeHeader
    ? header.findIndex((cell) => ["label", "name", "state", "item"].includes(cell))
    : 0;
  const valueIdx = looksLikeHeader
    ? header.findIndex((cell) =>
        ["value", "count", "n", "total", "estab"].includes(cell),
      )
    : 1;
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;

  return dataRows
    .map((row) => ({
      label: (row[labelIdx] ?? "").trim(),
      value: Number(String(row[valueIdx] ?? "").replace(/[, ]/g, "")),
    }))
    .filter((row) => row.label && Number.isFinite(row.value));
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}
