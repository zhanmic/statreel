import { easeOutCubic, formatCount } from "./easing";
import type { Dataset } from "./types";

export type StageSize = { width: number; height: number };

export const STAGE_SIZES = {
  "9:16": { width: 1080, height: 1920 },
  "16:9": { width: 1920, height: 1080 },
} as const;

export type AspectRatio = keyof typeof STAGE_SIZES;

const PALETTE = ["#f0b429", "#5eead4", "#fb7185", "#93c5fd", "#c4b5fd", "#86efac"];

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  dataset: Dataset,
  progress: number,
  options: { topN: number; size: StageSize },
) {
  const { width, height } = options.size;
  const t = easeOutCubic(progress);
  ctx.clearRect(0, 0, width, height);

  const bg = ctx.createLinearGradient(0, 0, 0, height);
  bg.addColorStop(0, "#101218");
  bg.addColorStop(1, "#07080c");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(240,180,41,0.08)";
  ctx.fillRect(0, 0, width, 6);

  const pad = Math.round(width * 0.07);
  ctx.fillStyle = "#f6f1e6";
  ctx.font = `700 ${Math.round(width * 0.048)}px ui-sans-serif, system-ui, sans-serif`;
  wrapText(ctx, dataset.title, pad, pad + Math.round(width * 0.06), width - pad * 2, Math.round(width * 0.055));

  ctx.fillStyle = "#9b968c";
  ctx.font = `500 ${Math.round(width * 0.022)}px ui-sans-serif, system-ui, sans-serif`;
  const meta = [dataset.year ? String(dataset.year) : null, dataset.unit, dataset.source]
    .filter(Boolean)
    .join("  ·  ");
  wrapText(ctx, meta, pad, pad + Math.round(width * 0.14), width - pad * 2, Math.round(width * 0.028));

  if (dataset.mode === "compare") {
    drawCompare(ctx, dataset, t, options.size);
  } else {
    drawRank(ctx, dataset, t, options.topN, options.size);
  }

  ctx.fillStyle = "#6d675e";
  ctx.font = `600 ${Math.round(width * 0.018)}px ui-sans-serif, system-ui, sans-serif`;
  ctx.fillText("STATREEL", pad, height - pad * 0.55);
}

function drawRank(
  ctx: CanvasRenderingContext2D,
  dataset: Dataset,
  t: number,
  topN: number,
  size: StageSize,
) {
  const items = [...dataset.items]
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
  const max = Math.max(...items.map((item) => item.value), 1);
  const { width, height } = size;
  const top = Math.round(height * 0.22);
  const bottom = height - Math.round(height * 0.08);
  const rowH = (bottom - top) / items.length;
  const labelW = Math.round(width * 0.28);
  const barMax = width - labelW - Math.round(width * 0.18);

  items.forEach((item, index) => {
    const y = top + index * rowH;
    const value = item.value * t;
    const barW = (item.value / max) * barMax * t;
    const color = item.color || PALETTE[index % PALETTE.length];

    ctx.fillStyle = "#8d877c";
    ctx.font = `600 ${Math.round(rowH * 0.38)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillText(String(index + 1).padStart(2, "0"), Math.round(width * 0.09), y + rowH * 0.62);

    ctx.textAlign = "left";
    ctx.fillStyle = "#efe8d8";
    ctx.fillText(truncate(ctx, item.label, labelW - 16), Math.round(width * 0.11), y + rowH * 0.62);

    const barX = labelW + Math.round(width * 0.04);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(barX, y + rowH * 0.28, barMax, rowH * 0.42);
    ctx.fillStyle = color;
    ctx.fillRect(barX, y + rowH * 0.28, Math.max(barW, 2), rowH * 0.42);

    ctx.fillStyle = "#f6f1e6";
    ctx.font = `700 ${Math.round(rowH * 0.36)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(formatCount(value), barX + barW + 16, y + rowH * 0.62);
  });
  ctx.textAlign = "left";
}

function drawCompare(
  ctx: CanvasRenderingContext2D,
  dataset: Dataset,
  t: number,
  size: StageSize,
) {
  const items = dataset.items.slice(0, 2);
  const max = Math.max(...items.map((item) => item.value), 1);
  const { width, height } = size;
  const top = Math.round(height * 0.28);
  const base = height - Math.round(height * 0.18);
  const colW = Math.round(width * 0.22);
  const gap = Math.round(width * 0.12);
  const startX = (width - (items.length * colW + (items.length - 1) * gap)) / 2;

  items.forEach((item, index) => {
    const x = startX + index * (colW + gap);
    const color = item.color || PALETTE[index % PALETTE.length];
    const barH = ((item.value / max) * (base - top - 80)) * t;
    const value = item.value * t;

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(x, top, colW, base - top);
    ctx.fillStyle = color;
    ctx.fillRect(x, base - barH, colW, barH);

    ctx.fillStyle = "#f6f1e6";
    ctx.font = `800 ${Math.round(width * 0.055)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(formatCount(value), x + colW / 2, base - barH - 28);

    ctx.fillStyle = "#d8d0c0";
    ctx.font = `700 ${Math.round(width * 0.028)}px ui-sans-serif, system-ui, sans-serif`;
    ctx.fillText(item.label, x + colW / 2, base + Math.round(width * 0.045));
  });
  ctx.textAlign = "left";
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let next = text;
  while (next.length > 1 && ctx.measureText(`${next}…`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}…`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let row = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + row * lineHeight);
      line = word;
      row += 1;
      if (row >= 2) break;
    } else {
      line = test;
    }
  }
  if (row < 2) ctx.fillText(line, x, y + row * lineHeight);
}
