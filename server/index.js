import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import multer from "multer";
import { randomIdentity } from "./lib/names.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Cloud file transfer (Multer)
// ---------------------------------------------------------------------------
// Files uploaded via the "Upload & Share" flow are stored on the server in an
// `uploads/` directory so visitors can download them directly by URL. Files are
// automatically deleted after 30 minutes (see cleanOldUploads below).
const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const FILE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // every 5 minutes

// Ensure the uploads directory exists (create it if missing).
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer disk storage: store under a random unique filename (keeping the
// original extension) so multiple uploads with the same name never collide.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1 GB per file cap
});

// Optional TURN relay for restrictive networks (corporate NATs, symmetric NATs, etc.)
// where a direct/STUN-negotiated path can't be found. Set these env vars to enable it;
// the app works fine without them for the vast majority of home/office networks.
//   TURN_URL      e.g. turn:turn.example.com:3478
//   TURN_USERNAME
//   TURN_CREDENTIAL
const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }];
if (process.env.TURN_URL && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
  ICE_SERVERS.push({
    urls: process.env.TURN_URL,
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
  });
}

const app = express();
app.set("trust proxy", true); // respect X-Forwarded-For when deployed behind a proxy/load balancer
app.disable("x-powered-by"); // don't advertise Express to the outside world

// ---------------------------------------------------------------------------
// Security & production hardening
// ---------------------------------------------------------------------------

// Simple in-memory request logger + rate limiter. Keeps things dependency-free
// so the deploy stays a single `npm install`. In-memory state is fine here:
// the server is stateless apart from active rooms/transfers, and a restart
// resets the counters (acceptable for this app's threat model).
const REQUEST_LOG = new Map(); // ip -> { count, windowStart }
const rateLimiter = ({ windowMs = 60_000, max = 60, message = "Too many requests" } = {}) => {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const entry = REQUEST_LOG.get(ip) || { count: 0, windowStart: now };
    if (now - entry.windowStart > windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }
    entry.count += 1;
    REQUEST_LOG.set(ip, entry);
    // Occasionally prune the map so a flood of unique IPs can't grow it unboundedly.
    if (REQUEST_LOG.size > 10_000) {
      for (const [key, value] of REQUEST_LOG) {
        if (now - value.windowStart > windowMs) REQUEST_LOG.delete(key);
      }
    }
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil(windowMs / 1000)));
      return res.status(429).json({ error: message });
    }
    next();
  };
};

// Track per-IP upload bytes so one client can't fill the disk through repeated
// 1 GB uploads. Simple in-memory counter; resets on restart (acceptable here).
const uploadBytesByIp = new Map(); // ip -> { bytes, updatedAt }
const IP_UPLOAD_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB per IP per hour
const IP_UPLOAD_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// Total bytes currently sitting in the uploads dir (used by /health and the
// upload guard). Cheap: one readdir + stat per call; uploads are bounded and
// auto-expire, so this stays small.
function countUploads() {
  let total = 0;
  try {
    for (const entry of fs.readdirSync(UPLOAD_DIR)) {
      try {
        total += fs.statSync(path.join(UPLOAD_DIR, entry)).size;
      } catch {
        // ignore files that vanish between listing and stat
      }
    }
  } catch {
    // ignore missing dir
  }
  return total;
}

// Security response headers for every request.
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  res.set("X-Frame-Options", "DENY");
  res.set("Referrer-Policy", "no-referrer");
  res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.set("X-XSS-Protection", "0"); // modern browsers ignore this; kept for legacy
  // Allow connecting to public STUN servers + the configured TURN server for
  // WebRTC. `connect-src` must permit the TURN relay host (wildcarded here since
  // the ICE config is dynamic). Fonts/styles come from Google Fonts + self.
  res.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self' ws: wss: https://fonts.googleapis.com https://fonts.gstatic.com stun: turn:",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; ")
  );
  if (req.app.get("env") === "production") {
    res.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  next();
});

// Request logging (method, path, status, duration) — cheap and useful for
// debugging upload/download issues in the Render logs.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check for uptime monitors (Render, UptimeRobot, etc.).
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    rooms: rooms?.size ?? 0,
    uploads: countUploads(),
  });
});

// ---- Upload/dowload rate limiting (stricter than general API limit) ----
app.use("/upload", rateLimiter({ windowMs: 60_000, max: 30, message: "Too many upload attempts" }));
app.use("/download", rateLimiter({ windowMs: 60_000, max: 300, message: "Too many download requests" }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }, // signaling payloads only — no file data ever passes through this server
  // Detect a vanished tab (closed lid, dead Wi-Fi, killed browser) quickly so it
  // disappears off other people's radar instead of lingering as a ghost peer.
  pingInterval: 10_000,
  pingTimeout: 8_000,
  maxHttpBufferSize: 64 * 1024, // signaling payloads are tiny; file bytes never touch this server
});

// Let the client fetch the current ICE server list (including TURN, if configured)
// instead of hardcoding it, so a deploy can add TURN via env vars with no client changes.
app.get("/ice-servers", (req, res) => {
  res.json({ iceServers: ICE_SERVERS });
});

// roomId -> Map<socketId, { id, name, avatar }>
const rooms = new Map();

// requestId -> timeout handle, so an unanswered transfer request doesn't hang forever
// on the sender's screen if the receiver never responds (e.g. they navigated away
// without the tab properly disconnecting yet).
const pendingRequestTimeouts = new Map();
const REQUEST_TIMEOUT_MS = 45_000;

// roomId -> { senderId, senderName, files: [{name,size,type}] }
// Lets anyone who opens a ?net=CODE share link see the files the link owner has
// queued, and download them directly — no prior peer selection required.
const pendingShares = new Map();

function roomFor(socket) {
  const codeParam = socket.handshake.query.net;
  const code = typeof codeParam === "string" ? codeParam.trim() : "";
  if (code) return `code:${code.toLowerCase()}`;
  // Group by IP so devices on the same local/NAT network find each other automatically,
  // the same way LocalSend uses mDNS on a physical LAN. Prefer X-Forwarded-For when the
  // server sits behind a reverse proxy/load balancer.
  const forwarded = socket.handshake.headers["x-forwarded-for"];
  const ip = (forwarded ? forwarded.split(",")[0].trim() : socket.handshake.address) || "unknown";
  return `lan:${ip}`;
}

function peerList(roomId, excludeId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.values()].filter((p) => p.id !== excludeId);
}

// Limit concurrent sockets per IP so one bot can't open thousands of WebSocket
// connections and exhaust the server's file descriptors. In-memory counters.
const socketConnections = new Map(); // ip -> { count, windowStart }
const MAX_SOCKETS_PER_IP = 20;

io.on("connection", (socket) => {
  const socketIp = socket.handshake.headers["x-forwarded-for"]
    ? socket.handshake.headers["x-forwarded-for"].split(",")[0].trim()
    : socket.handshake.address || "unknown";

  const now = Date.now();
  const conn = socketConnections.get(socketIp) || { count: 0, windowStart: now };
  if (now - conn.windowStart > 60_000) {
    conn.count = 0;
    conn.windowStart = now;
  }
  conn.count += 1;
  socketConnections.set(socketIp, conn);
  if (conn.count > MAX_SOCKETS_PER_IP) {
    console.warn(`Socket connection limit reached for ${socketIp}`);
    socket.disconnect(true);
    return;
  }

  socket.on("disconnect", () => {
    const existing = socketConnections.get(socketIp);
    if (existing) existing.count = Math.max(0, existing.count - 1);
  });

  const roomId = roomFor(socket);
  const { name, avatar } = randomIdentity();
  const self = { id: socket.id, name, avatar };

  socket.data.roomId = roomId;

  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  const room = rooms.get(roomId);
  room.set(socket.id, self);
  socket.join(roomId);

socket.emit("joined", { self, roomId, peers: peerList(roomId, socket.id), pendingShare: pendingShares.get(roomId) || null });
  socket.to(roomId).emit("peer-joined", self);

  socket.on("update-profile", ({ name, avatar } = {}) => {
    const cleanName = String(name ?? "").trim().slice(0, 24);
    if (cleanName) self.name = cleanName;
    if (typeof avatar === "string" && avatar) self.avatar = avatar;
    room.set(socket.id, self);
    io.to(roomId).emit("peer-updated", self);
  });

  // Sender asks a peer for permission before any bytes move.
  socket.on("transfer-request", ({ toId, requestId, files }) => {
    if (!toId || !requestId || !Array.isArray(files) || files.length === 0 || files.length > 50) return;
    io.to(toId).emit("transfer-request", {
      fromId: socket.id,
      fromName: self.name,
      fromAvatar: self.avatar,
      requestId,
      files,
    });

    // If the receiver never answers (closed tab mid-request, app backgrounded, etc.),
    // tell the sender it timed out instead of leaving their UI stuck on "awaiting approval".
    const timeout = setTimeout(() => {
      pendingRequestTimeouts.delete(requestId);
      io.to(socket.id).emit("transfer-response", { fromId: toId, requestId, accepted: false, timedOut: true });
    }, REQUEST_TIMEOUT_MS);
    pendingRequestTimeouts.set(requestId, timeout);
  });

  socket.on("transfer-response", ({ toId, requestId, accepted }) => {
    const timeout = pendingRequestTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      pendingRequestTimeouts.delete(requestId);
    }
    io.to(toId).emit("transfer-response", { fromId: socket.id, requestId, accepted });
  });

  // Sender cancels a request/transfer they started before or during approval —
  // tell the receiver so their incoming-request modal/card disappears too.
  socket.on("transfer-cancel", ({ toId, requestId }) => {
    if (!toId || !requestId) return;
    const timeout = pendingRequestTimeouts.get(requestId);
    if (timeout) {
      clearTimeout(timeout);
      pendingRequestTimeouts.delete(requestId);
    }
    io.to(toId).emit("transfer-cancel", { requestId });
  });

// Generic relay for WebRTC SDP offers/answers and ICE candidates.
  // The server only forwards this envelope; it never inspects file contents.
  socket.on("signal", ({ toId, data }) => {
    io.to(toId).emit("signal", { fromId: socket.id, data });
  });

  // The link owner publishes the files they've queued so anyone who opens the
  // share link can download them directly. Stored per-room so late joiners
  // (e.g. someone who opens the link after the files were queued) still see them.
  socket.on("share-files", ({ files }) => {
    if (!Array.isArray(files) || files.length === 0 || files.length > 50) return;
const normalized = files.slice(0, 50).map((f) => ({
      name: String(f.name ?? "file").slice(0, 200),
      size: Number(f.size) || 0,
      type: String(f.type ?? "application/octet-stream"),
      // Optional server-hosted URL so visitors can download directly from the
      // server instead of requiring a WebRTC peer connection to the owner.
      ...(typeof f.url === "string" && f.url ? { url: f.url } : {}),
      ...(typeof f.downloadUrl === "string" && f.downloadUrl ? { downloadUrl: f.downloadUrl } : {}),
      ...(typeof f.filename === "string" && f.filename ? { filename: f.filename } : {}),
    }));
    pendingShares.set(roomId, { senderId: socket.id, senderName: self.name, files: normalized });
    socket.to(roomId).emit("share-updated", pendingShares.get(roomId));
  });

// A visitor who opened the share link asks for the current queued files.
  socket.on("request-share-files", () => {
    const share = pendingShares.get(roomId);
    if (share) socket.emit("share-updated", share);
  });

// A visitor clicked "Download" on the share modal. Forward the request to the
  // link owner (the one who queued the files) so they can send the actual bytes.
  socket.on("share-download-request", () => {
    const share = pendingShares.get(roomId);
    if (!share || share.senderId === socket.id) return;
    io.to(share.senderId).emit("share-download-request", { fromId: socket.id, fromName: self.name });
  });

  // Chat message relay — the server only forwards the small JSON envelope between
  // two peers; it never stores or inspects message content.
  socket.on("chat-message", ({ toId, text }) => {
    if (!toId || typeof text !== "string") return;
    const clean = String(text).slice(0, 2000);
    if (!clean.trim()) return;
    io.to(toId).emit("chat-message", { fromId: socket.id, fromName: self.name, fromAvatar: self.avatar, text: clean });
  });

  // "Typing" indicator relay (best-effort, tiny payload).
  socket.on("chat-typing", ({ toId }) => {
    if (!toId) return;
    io.to(toId).emit("chat-typing", { fromId: socket.id, fromName: self.name });
  });

  socket.on("disconnect", () => {
    room.delete(socket.id);
    if (room.size === 0) {
      rooms.delete(roomId);
      pendingShares.delete(roomId);
    } else if (pendingShares.get(roomId)?.senderId === socket.id) {
      // The link owner left — clear their queued share so visitors don't see stale files.
      pendingShares.delete(roomId);
    }
    // Tell everyone in the room right away — including anyone mid-handshake or
    // mid-transfer with this peer — so their UI can fail gracefully instead of
    // waiting on a connection that will never complete.
    socket.to(roomId).emit("peer-left", { id: socket.id });
  });
});

// ---------------------------------------------------------------------------
// Cloud file endpoints
// ---------------------------------------------------------------------------

// POST /upload — accept a single file (field name "file") and store it in
// uploads/. Returns JSON describing the stored file including its download URL.
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const stored = req.file;

  // Per-IP upload budget: reject the file if this IP has already uploaded more
  // than the hourly cap, and delete the just-written file so the disk isn't
  // wasted on a rejected upload.
  const ip = req.ip || req.socket?.remoteAddress || "unknown";
  const now = Date.now();
  const budget = uploadBytesByIp.get(ip) || { bytes: 0, updatedAt: now };
  if (now - budget.updatedAt > IP_UPLOAD_WINDOW_MS) {
    budget.bytes = 0;
    budget.updatedAt = now;
  }
  if (budget.bytes + stored.size > IP_UPLOAD_LIMIT_BYTES) {
    fs.unlink(path.join(UPLOAD_DIR, stored.filename), () => {});
    return res.status(429).json({ error: "Upload limit reached for this network. Try again later." });
  }
  budget.bytes += stored.size;
  budget.updatedAt = now;
  uploadBytesByIp.set(ip, budget);

  res.json({
    success: true,
    name: stored.originalname,
    size: stored.size,
    type: stored.mimetype || "application/octet-stream",
    filename: stored.filename,
    url: `/download/${encodeURIComponent(stored.filename)}`,
    downloadUrl: `/download/${encodeURIComponent(stored.filename)}`,
  });
});

// Multer error handler (e.g. file too large) -> clean JSON response.
app.post("/upload", (err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || "Upload failed" });
  }
  next();
});

// GET /download/:filename — stream the stored file to the visitor with a
// proper Content-Disposition so browsers save it with the original name.
app.get("/download/:filename", (req, res) => {
  const requested = req.params.filename;
  // Prevent path traversal — only allow plain filenames.
  if (!requested || requested.includes("..") || path.basename(requested) !== requested) {
    return res.status(400).json({ error: "Invalid filename" });
  }
  const filePath = path.join(UPLOAD_DIR, requested);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found or expired" });
  }
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    return res.status(404).json({ error: "File not found or expired" });
  }
  res.setHeader("Content-Disposition", `attachment; filename="${requested}"`);
  res.setHeader("Content-Length", stat.size);
  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) res.status(500).json({ error: "Download failed" });
  });
  stream.pipe(res);
});

// ---------------------------------------------------------------------------
// Automatic file cleanup
// ---------------------------------------------------------------------------
// Files uploaded to the server are only meant to live briefly. Every 5 minutes
// we delete any file in uploads/ that is older than 30 minutes, so the disk
// never fills up and old share links don't point at stale data forever.
function cleanOldUploads() {
  let entries;
  try {
    entries = fs.readdirSync(UPLOAD_DIR);
  } catch {
    return;
  }
  const now = Date.now();
  for (const entry of entries) {
    const full = path.join(UPLOAD_DIR, entry);
    try {
      const stat = fs.statSync(full);
      if (stat.isFile() && now - stat.mtimeMs > FILE_TTL_MS) {
        fs.unlinkSync(full);
      }
    } catch {
      // ignore files that vanish between listing and stat/unlink
    }
  }
}

// Run the cleanup immediately on startup, then every 5 minutes.
cleanOldUploads();
setInterval(cleanOldUploads, CLEANUP_INTERVAL_MS);

// In production, serve the built client so the whole app is a single process.
const clientDist = path.join(__dirname, "..", "client", "dist");

// Serve the manifest with an explicit charset so Lighthouse/browsers are happy.
app.get("/manifest.webmanifest", (req, res) => {
  res.set("Content-Type", "application/manifest+json; charset=utf-8");
  res.sendFile(path.join(clientDist, "manifest.webmanifest"));
});

app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/socket.io")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

httpServer.listen(PORT, () => {
  console.log(`Share Anything Anywhere signaling server running on :${PORT}`);
});