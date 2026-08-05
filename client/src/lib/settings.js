// Simple persisted app preferences (sound, auto-accept, notifications).
// Keeps UI toggles synced across reloads without a backend.

const KEY = "sa_prefs_v1";

const DEFAULTS = {
  sound: true,
  soundTheme: "classic",
  autoAccept: false,
  notifications: true,
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable — fail silently */
  }
}

export function getPrefs() {
  return read();
}

export function setPref(key, value) {
  const prefs = read();
  prefs[key] = value;
  write(prefs);
  return prefs;
}
