"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startBgm } from "@/lib/bgm";
import { exportReel } from "@/lib/export-video";
import {
  drawFrame,
  STAGE_SIZES,
  type AspectRatio,
} from "@/lib/render-frame";
import type { Dataset, DatasetSummary } from "@/lib/types";

export function Studio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [topN, setTopN] = useState(15);
  const [durationSec, setDurationSec] = useState(8);
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [bgm, setBgm] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [naics, setNaics] = useState("722515");
  const [censusYear, setCensusYear] = useState(2023);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [censusReady, setCensusReady] = useState(false);
  const [exportPct, setExportPct] = useState<number | null>(null);

  async function refreshList(selectId?: string) {
    const res = await fetch("/api/datasets");
    const json = (await res.json()) as { datasets: DatasetSummary[] };
    setDatasets(json.datasets);
    const id = selectId ?? json.datasets[0]?.id;
    if (id) await loadDataset(id);
  }

  async function loadDataset(id: string) {
    const res = await fetch(`/api/datasets/${id}`);
    const json = (await res.json()) as { dataset?: Dataset; error?: string };
    if (json.dataset) setDataset(json.dataset);
  }

  useEffect(() => {
    refreshList().catch((err: Error) => setError(err.message));
    fetch("/api/census")
      .then((res) => res.json())
      .then((json: { configured: boolean }) => setCensusReady(json.configured))
      .catch(() => setCensusReady(false));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !dataset) return;
    const size = STAGE_SIZES[aspect];
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;
    let start = performance.now();
    const durationMs = durationSec * 1000;

    const tick = (now: number) => {
      const elapsed = playing ? now - start : 0;
      const looped = durationMs <= 0 ? 1 : (elapsed % durationMs) / durationMs;
      const progress = playing ? looped : 1;
      drawFrame(ctx, dataset, progress, { topN, size });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dataset, topN, durationSec, aspect, playing]);

  const previewBgm = useRef<ReturnType<typeof startBgm> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!bgm || !playing) {
      previewBgm.current?.stop();
      previewBgm.current = null;
      return;
    }
    const ctx = new AudioContext();
    audioRef.current = ctx;
    void ctx.resume().then(() => {
      previewBgm.current = startBgm(ctx);
    });
    return () => {
      previewBgm.current?.stop();
      previewBgm.current = null;
      void ctx.close();
    };
  }, [bgm, playing, dataset?.id]);

  const activeMode = dataset?.mode ?? "rank";

  const status = useMemo(() => {
    if (busy) return busy;
    if (exportPct != null) return `Exporting ${Math.round(exportPct * 100)}%`;
    if (!dataset) return "Load a dataset to preview.";
    return `${dataset.items.length} values · ${dataset.source}`;
  }, [busy, dataset, exportPct]);

  async function pullCensus() {
    setError(null);
    setBusy("Pulling Census CBP…");
    try {
      const res = await fetch("/api/census", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naics, year: censusYear, topN }),
      });
      const json = (await res.json()) as { dataset?: Dataset; error?: string };
      if (!res.ok || !json.dataset) throw new Error(json.error || "Census pull failed");
      await refreshList(json.dataset.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Census pull failed");
    } finally {
      setBusy(null);
    }
  }

  async function importCsv(file: File) {
    setError(null);
    setBusy("Importing CSV…");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("mode", activeMode);
      form.set("title", file.name.replace(/\.csv$/i, ""));
      const res = await fetch("/api/import", { method: "POST", body: form });
      const json = (await res.json()) as { dataset?: Dataset; error?: string };
      if (!res.ok || !json.dataset) throw new Error(json.error || "Import failed");
      await refreshList(json.dataset.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleExport() {
    if (!dataset) return;
    setError(null);
    setExportPct(0);
    previewBgm.current?.stop();
    try {
      const blob = await exportReel({
        dataset,
        topN,
        durationMs: durationSec * 1000,
        aspect,
        bgm,
        onProgress: setExportPct,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug(dataset.title)}.webm`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExportPct(null);
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <strong>STATREEL</strong>
          <span>Rankings, comparisons, short video</span>
        </div>
        <div className="modes">
          <button
            className={activeMode === "rank" ? "active" : ""}
            onClick={() => {
              const next = datasets.find((item) => item.mode === "rank");
              if (next) void loadDataset(next.id);
            }}
          >
            Rank
          </button>
          <button
            className={activeMode === "compare" ? "active" : ""}
            onClick={() => {
              const next = datasets.find((item) => item.mode === "compare");
              if (next) void loadDataset(next.id);
            }}
          >
            Compare
          </button>
        </div>
        <div className="actions">
          <button className="ghost" onClick={() => setPlaying((value) => !value)}>
            {playing ? "Pause" : "Play"}
          </button>
          <button className="primary" disabled={!dataset || exportPct != null} onClick={() => void handleExport()}>
            Export WebM
          </button>
        </div>
      </header>

      <div className="workspace">
        <div className="stage-wrap">
          <div className={`stage-frame${aspect === "16:9" ? " wide" : ""}`}>
            <canvas ref={canvasRef} />
          </div>
        </div>

        <aside className="side">
          <section>
            <h2>Saved data</h2>
            <div className="list">
              {datasets.map((item) => (
                <button
                  key={item.id}
                  className={`card${dataset?.id === item.id ? " active" : ""}`}
                  onClick={() => void loadDataset(item.id)}
                >
                  {item.title}
                  <small>
                    {item.mode} · {item.itemCount} items
                    {item.year ? ` · ${item.year}` : ""}
                  </small>
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2>Animation</h2>
            <div className="row">
              <label className="field">
                <span>Top N</span>
                <input
                  type="number"
                  min={2}
                  max={25}
                  value={topN}
                  onChange={(event) => setTopN(Number(event.target.value) || 15)}
                />
              </label>
              <label className="field">
                <span>Seconds</span>
                <input
                  type="number"
                  min={3}
                  max={30}
                  value={durationSec}
                  onChange={(event) => setDurationSec(Number(event.target.value) || 8)}
                />
              </label>
            </div>
            <div className="row">
              <label className="field">
                <span>Aspect</span>
                <select value={aspect} onChange={(event) => setAspect(event.target.value as AspectRatio)}>
                  <option value="9:16">9:16 reel</option>
                  <option value="16:9">16:9 wide</option>
                </select>
              </label>
              <label className="field">
                <span>BGM</span>
                <select value={bgm ? "on" : "off"} onChange={(event) => setBgm(event.target.value === "on")}>
                  <option value="on">Procedural on</option>
                  <option value="off">Off</option>
                </select>
              </label>
            </div>
          </section>

          <section>
            <h2>Census fetch</h2>
            <p className="note">
              Official establishment counts from County Business Patterns.
              Ice cream shops sit in NAICS 722515. Cannabis retail has no federal CBP series — use the seed or CSV.
            </p>
            <div className="row">
              <label className="field">
                <span>NAICS</span>
                <input value={naics} onChange={(event) => setNaics(event.target.value)} />
              </label>
              <label className="field">
                <span>Year</span>
                <input
                  type="number"
                  value={censusYear}
                  onChange={(event) => setCensusYear(Number(event.target.value) || 2023)}
                />
              </label>
            </div>
            <button className="ghost" onClick={() => void pullCensus()} disabled={!!busy}>
              Pull Census by state
            </button>
            <p className="note">
              {censusReady
                ? "CENSUS_API_KEY is configured."
                : "Add CENSUS_API_KEY to .env.local for live pulls. Seeds work without it."}
            </p>
          </section>

          <section>
            <h2>CSV import</h2>
            <p className="note">Columns: label/name + value/count.</p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importCsv(file);
              }}
            />
          </section>

          <p className="status">{status}</p>
          {error ? <p className="error">{error}</p> : null}
        </aside>
      </div>
    </div>
  );
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "statreel";
}
