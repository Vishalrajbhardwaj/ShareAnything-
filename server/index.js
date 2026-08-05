import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { randomIdentity } from "./lib/names.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;

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

io.on("connection", (socket) => {
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

// In production, serve the built client so the whole app is a single process.
const clientDist = path.join(__dirname, "..", "client", "dist");

// Security & response headers for every request.
app.use((req, res, next) => {
  res.set("X-Content-Type-Options", "nosniff");
  next();
});

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