// A minimal protocol for streaming files over a single ordered, reliable RTCDataChannel:
//   {type:"meta", fileId, name, size, mime}  -- JSON string
//   <binary chunk> <binary chunk> ...        -- ArrayBuffer
//   {type:"done", fileId}                    -- JSON string
//   {type:"all-done"}                        -- JSON string, sent once the whole batch finishes
//
// Files in a batch are sent strictly one after another, so a fileId is enough
// to keep sender and receiver in sync without a more complex framing format.

export const CHUNK_SIZE = 128 * 1024; // 128KB — good throughput on LAN without over-buffering
const MAX_BUFFERED_AMOUNT = 4 * 1024 * 1024; // pause sending once 4MB is queued, to bound memory growth
const PROGRESS_INTERVAL_MS = 120; // throttle progress callbacks so React isn't re-rendered per-chunk

export async function sendFiles(channel, files, { onFileStart, onProgress, onFileDone, onAllDone } = {}) {
  for (const file of files) {
    const fileId = crypto.randomUUID();
    channel.send(
      JSON.stringify({
        type: "meta",
        fileId,
        name: file.name,
        size: file.size,
        mime: file.type || "application/octet-stream",
      })
    );
    onFileStart?.({ fileId, name: file.name, size: file.size });

    let offset = 0;
    let lastReported = 0;
    let lastReportedAt = 0;
    while (offset < file.size) {
      // Bail out cleanly if the channel died mid-file (peer disconnected, network dropped).
      if (channel.readyState !== "open") {
        throw new Error("channel-closed");
      }
      while (channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        await new Promise((resolve) => setTimeout(resolve, 20));
        if (channel.readyState !== "open") throw new Error("channel-closed");
      }
      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const buffer = await slice.arrayBuffer();
      channel.send(buffer);
      offset += buffer.byteLength;

      const now = performance.now();
      const isLast = offset >= file.size;
      if (isLast || now - lastReportedAt >= PROGRESS_INTERVAL_MS) {
        onProgress?.(fileId, offset, file.size, now);
        lastReported = offset;
        lastReportedAt = now;
      }
    }
    if (lastReported < file.size) onProgress?.(fileId, file.size, file.size, performance.now());

    channel.send(JSON.stringify({ type: "done", fileId }));
    onFileDone?.(fileId);
  }
  channel.send(JSON.stringify({ type: "all-done" }));
  onAllDone?.();
}

// Returns a handler to feed every channel.onmessage event into. Call it with event.data.
export function createReceiver({ onFileStart, onProgress, onFileComplete, onAllDone } = {}) {
  let current = null; // { fileId, name, size, mime, chunks, received }
  let lastReportedAt = 0;

  return function handleMessage(data) {
    if (typeof data === "string") {
      const msg = JSON.parse(data);

      if (msg.type === "meta") {
        current = { fileId: msg.fileId, name: msg.name, size: msg.size, mime: msg.mime, chunks: [], received: 0 };
        lastReportedAt = 0;
        onFileStart?.({ fileId: current.fileId, name: current.name, size: current.size });
      } else if (msg.type === "done" && current?.fileId === msg.fileId) {
        const blob = new Blob(current.chunks, { type: current.mime });
        onProgress?.(current.fileId, current.received, current.size, performance.now());
        onFileComplete?.({ fileId: current.fileId, name: current.name, size: current.size, blob });
        current = null;
      } else if (msg.type === "all-done") {
        onAllDone?.();
      }
      return;
    }

    // Binary chunk belonging to the file currently in flight.
    if (current) {
      current.chunks.push(data);
      current.received += data.byteLength ?? 0;
      const now = performance.now();
      if (now - lastReportedAt >= PROGRESS_INTERVAL_MS) {
        onProgress?.(current.fileId, current.received, current.size, now);
        lastReportedAt = now;
      }
    }
  };
}

export function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const exp = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exp);
  return `${exp === 0 ? value : value.toFixed(1)} ${units[exp]}`;
}

// bytesPerSecond -> "3.2 MB/s"
export function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0) return "";
  return `${formatBytes(bytesPerSecond)}/s`;
}

// Rough remaining time given bytes left and current throughput -> "12s left" / "2m left"
export function formatEta(bytesRemaining, bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond <= 0 || bytesRemaining <= 0) return "";
  const seconds = Math.ceil(bytesRemaining / bytesPerSecond);
  if (seconds < 60) return `${seconds}s left`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes}m left`;
}

export function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
