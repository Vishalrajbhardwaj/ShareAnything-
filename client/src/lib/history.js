const KEY = "sa_history_v1";
const MAX_ENTRIES = 200;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  } catch {
    /* storage unavailable — fail silently */
  }
}

export function getHistory() {
  return read();
}

export function addHistoryEntry(entry) {
  const list = read();
  list.unshift({ ...entry, at: entry.at ?? Date.now() });
  write(list);
  return list;
}

export function clearHistory() {
  write([]);
}
