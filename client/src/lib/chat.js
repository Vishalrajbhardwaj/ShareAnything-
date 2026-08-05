// Persist a lightweight chat log per peer (by name) so sent/received messages
// survive reloads. Kept intentionally small/local — no backend involved.

const KEY = "sa_chat_v1";
const MAX_PER_PEER = 200;

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function write(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* storage unavailable — fail silently */
  }
}

export function getChat(peerName) {
  const map = read();
  return Array.isArray(map[peerName]) ? map[peerName] : [];
}

export function addChatMessage(peerName, msg) {
  const map = read();
  const list = Array.isArray(map[peerName]) ? map[peerName] : [];
  list.push({ ...msg, at: msg.at ?? Date.now() });
  if (list.length > MAX_PER_PEER) list.splice(0, list.length - MAX_PER_PEER);
  map[peerName] = list;
  write(map);
  return list;
}

export function clearChat(peerName) {
  const map = read();
  delete map[peerName];
  write(map);
}
