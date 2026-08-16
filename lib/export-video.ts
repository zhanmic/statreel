import { startBgm } from "./bgm";
import { drawFrame, type AspectRatio, STAGE_SIZES } from "./render-frame";
import type { Dataset } from "./types";

export async function exportReel(options: {
  dataset: Dataset;
  topN: number;
  durationMs: number;
  aspect: AspectRatio;
  bgm: boolean;
  onProgress?: (progress: number) => void;
}): Promise<Blob> {
  const size = STAGE_SIZES[options.aspect];
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");

  const stream = canvas.captureStream(30);
  let audioCtx: AudioContext | null = null;
  let bgm: ReturnType<typeof startBgm> | null = null;

  if (options.bgm) {
    audioCtx = new AudioContext();
    await audioCtx.resume();
    bgm = startBgm(audioCtx);
    const track = bgm.destination.stream.getAudioTracks()[0];
    if (track) stream.addTrack(track);
  }

  const mime = pickMime();
  const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const started = performance.now();
  recorder.start(100);

  await new Promise<void>((resolve) => {
    const tick = () => {
      const elapsed = performance.now() - started;
      const progress = Math.min(1, elapsed / options.durationMs);
      drawFrame(ctx, options.dataset, progress, { topN: options.topN, size });
      options.onProgress?.(progress);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });

  await new Promise((r) => setTimeout(r, 120));
  recorder.stop();
  await new Promise<void>((resolve) => {
    recorder.onstop = () => resolve();
  });

  bgm?.stop();
  await audioCtx?.close();
  stream.getTracks().forEach((track) => track.stop());

  return new Blob(chunks, { type: recorder.mimeType || "video/webm" });
}

function pickMime(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
}
