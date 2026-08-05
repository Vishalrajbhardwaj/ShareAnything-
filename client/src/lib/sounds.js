// Sound themes for incoming requests / transfer completion.
// Uses the shared Web Audio API so no audio files are needed.
// Each theme defines distinct note patterns so users can pick a favorite.

let ctx = null;
let unlocked = false;

function audioContext() {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
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

function beep(freq, durationMs = 0.12, type = "sine", gain = 0.04, delayMs = 0) {
  const ac = audioContext();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const start = ac.currentTime + delayMs / 1000;
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + durationMs);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(start);
  osc.stop(start + durationMs);
}

// List of available sound themes. Each has request + complete note patterns.
// `label` is shown in the settings UI; `preview` is a short melody to hear.
export const SOUND_THEMES = [
  {
    id: "classic",
    label: "Classic",
    icon: "🔔",
    request: [
      { f: 660, d: 0.12, t: "sine", g: 0.05, delay: 0 },
      { f: 880, d: 0.14, t: "sine", g: 0.05, delay: 140 },
    ],
    complete: [
      { f: 523, d: 0.12, t: "triangle", g: 0.05, delay: 0 },
      { f: 659, d: 0.12, t: "triangle", g: 0.05, delay: 130 },
      { f: 784, d: 0.18, t: "triangle", g: 0.06, delay: 260 },
    ],
    preview: [
      { f: 523, d: 0.12, t: "triangle", g: 0.05, delay: 0 },
      { f: 659, d: 0.12, t: "triangle", g: 0.05, delay: 130 },
      { f: 784, d: 0.18, t: "triangle", g: 0.06, delay: 260 },
    ],
  },
  {
    id: "chime",
    label: "Chime",
    icon: "🎐",
    request: [
      { f: 1174, d: 0.2, t: "sine", g: 0.05, delay: 0 },
      { f: 1568, d: 0.24, t: "sine", g: 0.04, delay: 180 },
    ],
    complete: [
      { f: 1318, d: 0.2, t: "sine", g: 0.05, delay: 0 },
      { f: 1760, d: 0.22, t: "sine", g: 0.04, delay: 160 },
      { f: 2093, d: 0.3, t: "sine", g: 0.04, delay: 340 },
    ],
    preview: [
      { f: 1318, d: 0.2, t: "sine", g: 0.05, delay: 0 },
      { f: 1760, d: 0.22, t: "sine", g: 0.04, delay: 160 },
      { f: 2093, d: 0.3, t: "sine", g: 0.04, delay: 340 },
    ],
  },
  {
    id: "digital",
    label: "Digital",
    icon: "🤖",
    request: [
      { f: 740, d: 0.08, t: "square", g: 0.04, delay: 0 },
      { f: 740, d: 0.08, t: "square", g: 0.04, delay: 120 },
      { f: 988, d: 0.12, t: "square", g: 0.04, delay: 240 },
    ],
    complete: [
      { f: 988, d: 0.1, t: "square", g: 0.04, delay: 0 },
      { f: 1319, d: 0.1, t: "square", g: 0.04, delay: 130 },
      { f: 1976, d: 0.2, t: "square", g: 0.03, delay: 260 },
    ],
    preview: [
      { f: 988, d: 0.1, t: "square", g: 0.04, delay: 0 },
      { f: 1319, d: 0.1, t: "square", g: 0.04, delay: 130 },
      { f: 1976, d: 0.2, t: "square", g: 0.03, delay: 260 },
    ],
  },
  {
    id: "retro",
    label: "Retro",
    icon: "👾",
    request: [
      { f: 262, d: 0.1, t: "sawtooth", g: 0.05, delay: 0 },
      { f: 392, d: 0.1, t: "sawtooth", g: 0.05, delay: 120 },
      { f: 523, d: 0.16, t: "sawtooth", g: 0.05, delay: 240 },
    ],
    complete: [
      { f: 523, d: 0.1, t: "sawtooth", g: 0.05, delay: 0 },
      { f: 659, d: 0.1, t: "sawtooth", g: 0.05, delay: 120 },
      { f: 784, d: 0.1, t: "sawtooth", g: 0.05, delay: 240 },
      { f: 1046, d: 0.2, t: "sawtooth", g: 0.05, delay: 360 },
    ],
    preview: [
      { f: 523, d: 0.1, t: "sawtooth", g: 0.05, delay: 0 },
      { f: 659, d: 0.1, t: "sawtooth", g: 0.05, delay: 120 },
      { f: 1046, d: 0.2, t: "sawtooth", g: 0.05, delay: 240 },
    ],
  },
  {
    id: "gentle",
    label: "Gentle",
    icon: "🌿",
    request: [
      { f: 440, d: 0.2, t: "sine", g: 0.04, delay: 0 },
      { f: 554, d: 0.24, t: "sine", g: 0.04, delay: 200 },
    ],
    complete: [
      { f: 392, d: 0.22, t: "sine", g: 0.04, delay: 0 },
      { f: 494, d: 0.22, t: "sine", g: 0.04, delay: 220 },
      { f: 587, d: 0.3, t: "sine", g: 0.04, delay: 440 },
    ],
    preview: [
      { f: 392, d: 0.22, t: "sine", g: 0.04, delay: 0 },
      { f: 494, d: 0.22, t: "sine", g: 0.04, delay: 220 },
      { f: 587, d: 0.3, t: "sine", g: 0.04, delay: 440 },
    ],
  },
  {
    id: "tech",
    label: "Tech",
    icon: "🔊",
    request: [
      { f: 880, d: 0.06, t: "square", g: 0.04, delay: 0 },
      { f: 1108, d: 0.06, t: "square", g: 0.04, delay: 90 },
      { f: 1319, d: 0.1, t: "square", g: 0.04, delay: 180 },
    ],
    complete: [
      { f: 1319, d: 0.08, t: "square", g: 0.04, delay: 0 },
      { f: 1760, d: 0.08, t: "square", g: 0.04, delay: 120 },
      { f: 2637, d: 0.22, t: "square", g: 0.03, delay: 240 },
    ],
    preview: [
      { f: 1319, d: 0.08, t: "square", g: 0.04, delay: 0 },
      { f: 1760, d: 0.08, t: "square", g: 0.04, delay: 120 },
      { f: 2637, d: 0.22, t: "square", g: 0.03, delay: 240 },
    ],
  },
];

export function getTheme(id) {
  return SOUND_THEMES.find((s) => s.id === id) || SOUND_THEMES[0];
}

// Plays a theme's note pattern. `pattern` is one of "request"/"complete"/"preview".
export function playTheme(themeId, pattern = "preview") {
  const theme = getTheme(themeId);
  const notes = theme[pattern] || theme.preview || [];
  for (const n of notes) {
    beep(n.f, n.d, n.t, n.g, n.delay);
  }
}

// Backward-compatible helpers that respect the user's chosen theme.
export function playRequestSound(themeId) {
  playTheme(themeId || getDefaultThemeId(), "request");
}

export function playCompleteSound(themeId) {
  playTheme(themeId || getDefaultThemeId(), "complete");
}

// Small helper to read the saved theme without importing settings (avoids a
// circular dependency at module load). Falls back to "classic".
function getDefaultThemeId() {
  try {
    const raw = localStorage.getItem("sa_prefs_v1");
    if (raw) {
      const prefs = JSON.parse(raw);
      if (prefs.soundTheme) return prefs.soundTheme;
    }
  } catch {
    /* ignore */
  }
  return "classic";
}
