const KEY = "sa_favorites_v1";

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
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage unavailable — fail silently */
  }
}

// Devices are identified by name since socket ids are ephemeral per session.
// Not perfect (two people could share a name) but matches how LocalSend-style
// "Favorites" quick-save is scoped in practice.
export function getFavorites() {
  return read();
}

export function isFavorite(name) {
  return read().includes(name);
}

export function toggleFavorite(name) {
  const list = read();
  const idx = list.indexOf(name);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(name);
  }
  write(list);
  return list;
}
