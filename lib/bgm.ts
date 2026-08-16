export type BgmHandle = {
  destination: MediaStreamAudioDestinationNode;
  stop: () => void;
};

export function startBgm(audioCtx: AudioContext): BgmHandle {
  const destination = audioCtx.createMediaStreamDestination();
  const master = audioCtx.createGain();
  master.gain.value = 0.18;
  master.connect(audioCtx.destination);
  master.connect(destination);

  const tempo = 88;
  const beat = 60 / tempo;
  const start = audioCtx.currentTime + 0.05;
  const oscillators: OscillatorNode[] = [];

  const kick = () => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(110, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(42, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.9, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
    oscillators.push(osc);
  };

  const note = (freq: number, when: number, dur = 0.28) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.22, when + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + dur + 0.02);
    oscillators.push(osc);
  };

  const scale = [196, 233.08, 261.63, 293.66, 349.23, 392];
  let beatIndex = 0;
  const timer = window.setInterval(() => {
    if (audioCtx.state === "closed") return;
    kick();
    const now = audioCtx.currentTime;
    if (beatIndex % 2 === 0) {
      note(scale[beatIndex % scale.length], now + 0.02);
      note(scale[(beatIndex + 2) % scale.length] * 2, now + beat * 0.5, 0.18);
    }
    beatIndex += 1;
  }, beat * 1000);

  note(scale[0], start, 0.4);

  return {
    destination,
    stop: () => {
      window.clearInterval(timer);
      for (const osc of oscillators) {
        try {
          osc.stop();
        } catch {
          /* already stopped */
        }
      }
    },
  };
}
