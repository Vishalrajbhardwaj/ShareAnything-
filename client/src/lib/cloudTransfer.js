// Cloud file transfer helpers.
//
// Instead of always sending bytes over WebRTC peer-to-peer, files can be
// uploaded to the server (`POST /upload`) and downloaded directly from it
// (`GET /download/:filename`). This is useful for the "Anywhere" share links
// where the link owner may not be reachable via a direct peer connection.

import { triggerDownload } from "./fileTransfer.js";

// Upload a single file to the server. Returns a promise resolving to the
// server's JSON response ({ success, name, size, type, filename, url,
// downloadUrl }). `onProgress` receives a number from 0..1 as bytes are sent.
// Uses XMLHttpRequest because fetch doesn't expose upload progress events.
export function uploadFile(file, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload");
    xhr.responseType = "json";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(e.loaded / e.total);
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.success) {
        resolve(xhr.response);
      } else {
        const msg =
          (xhr.response && xhr.response.error) || `Upload failed (${xhr.status})`;
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload aborted"));

    const form = new FormData();
    form.append("file", file, file.name);
    xhr.send(form);
  });
}

// Download a file hosted on the server. `url` is the server route (e.g.
// "/download/abc123.png"). Reads the stream so we can show progress, then
// triggers a browser download. `onProgress` receives 0..1 as bytes arrive.
// `signal` (an AbortSignal) lets the caller cancel mid-download.
export async function downloadShareFile(url, filename, { onProgress, signal } = {}) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    let msg = `Download failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      // non-JSON error body — keep the generic message
    }
    throw new Error(msg);
  }

  const total = Number(res.headers.get("Content-Length")) || 0;
  if (!res.body) {
    throw new Error("Download not supported in this browser");
  }

  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      received += value.byteLength;
      if (total && onProgress) onProgress(received / total);
    }
  }

  const blob = new Blob(chunks, { type: res.headers.get("Content-Type") || "application/octet-stream" });
  triggerDownload(blob, filename);
  onProgress?.(1);
  return blob;
}
