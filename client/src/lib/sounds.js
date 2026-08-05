// Tiny Web Audio beeps for incoming requests / transfer completion.
// Uses the shared AudioContext so no audio files are needed.

let ctx = null;

function audioContext() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function beep(freq, durationMs = 0.12, type = "sine", gain = 0.04) {
  const ac = audioContext();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + durationMs);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + durationMs);
}

export function playRequestSound() {
  beep(660, 0.12, "sine", 0.05);
  setTimeout(() => beep(880, 0.14, "sine", 0.05), 140);
}

export function playCompleteSound() {
  beep(523, 0.12, "triangle", 0.05);
  setTimeout(() => beep(659, 0.12, "triangle", 0.05), 130);
  setTimeout(() => beep(784, 0.18, "triangle", 0.06), 260);
}
