// Tiny Web Audio beeps for incoming requests / transfer completion.
// Uses the shared AudioContext so no audio files are needed.

let ctx = null;
let unlocked = false;

function audioContext() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  return ctx;
}

// Browsers block AudioContext until the user has interacted with the page
// (click/tap/keypress). We create & resume it on the very first gesture so
// later beeps (incoming chat, transfer requests, completion) actually play.
function unlock() {
  if (unlocked) return;
  const ac = audioContext();
  if (!ac) return;
  if (ac.state === "suspended") {
    ac.resume().catch(() => {});
  }
  unlocked = true;
}

if (typeof window !== "undefined") {
  const onGesture = () => {
    unlock();
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
    window.removeEventListener("touchstart", onGesture);
  };
  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);
  window.addEventListener("touchstart", onGesture);
  // Also try to unlock immediately in case the user already interacted.
  unlock();
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
