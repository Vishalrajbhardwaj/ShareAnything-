import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { iconForFile } from "../lib/fileIcons.js";
import { formatBytes } from "../lib/fileTransfer.js";
import "./InviteView.css";

function randomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function createTextFile(fileName, text) {
  return new File([text], fileName, { type: "text/plain;charset=utf-8" });
}

export default function InviteView({
  netCode,
  onSetNetworkMode,
  onShareFiles,
  hasPendingShare = false,
  isLinkVisitor = false,
}) {
const [joinDraft, setJoinDraft] = useState("");
  const [queuedFiles, setQueuedFiles] = useState([]);
  const [showTextModal, setShowTextModal] = useState(false);
  const [messageText, setMessageText] = useState("Hello from Share Anywhere");
  const [copied, setCopied] = useState(false);
// Tracks whether the user has explicitly clicked "Upload & Share". The QR/link
  // step only appears AFTER this is clicked, even if a netCode already exists.
  // Starts false so the Upload button always appears after file selection.
  const [shared, setShared] = useState(false);
  const copyTimer = useRef(null);
  const qrRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

// Publish queued files to the server so anyone who opens the link can download them.
  // Re-publish whenever the room changes (netCode) so files selected while on the
  // local network are also available on the new Anywhere (code) room when the user
  // switches modes — otherwise the visitor opening the link won't see the modal.
  useEffect(() => {
    onShareFiles?.(queuedFiles);
  }, [queuedFiles, onShareFiles, netCode]);

  const inviteUrl = (() => {
    const url = new URL(window.location.href);
    if (netCode) url.searchParams.set("net", netCode);
    return url.toString();
  })();

  const addFiles = (fileList) => {
    if (!fileList?.length) return;
    const next = Array.from(fileList).filter(Boolean);
    if (!next.length) return;
    setQueuedFiles((prev) => {
      const merged = [...prev, ...next];
      return merged.filter(
        (file, index, array) =>
          index === array.findIndex(
            (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified
          )
      );
    });
  };

  const sendText = () => {
    if (!messageText.trim()) return;
    const file = createTextFile("message", messageText.trim());
    setQueuedFiles((prev) => [...prev, file]);
    setShowTextModal(false);
    setMessageText("Hello from Share Anywhere");
  };

  const downloadQr = () => {
    const svg = qrRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `share-anywhere-${netCode || "network"}.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = inviteUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

// QR is only the final step — shown only after the user explicitly clicks
  // "Upload & Share", AND files are selected, AND a netCode exists.
  const showQr = !!shared && !!netCode && queuedFiles.length > 0;

// The app was opened via someone else's share link (?net=CODE) and the user
  // hasn't selected any files themselves. This is a visitor, not the owner, so
  // show a clear waiting/download state instead of the owner's file picker.
  const isVisitorWaiting = isLinkVisitor && queuedFiles.length === 0 && !hasPendingShare;
  const isVisitorReady = isLinkVisitor && queuedFiles.length === 0 && hasPendingShare;

  return (
    <div className="invite-view">
      <div className="page-card invite-view__card">
        {isVisitorReady ? (
          <div className="invite-visitor">
            <span className="invite-visitor__icon">📥</span>
            <h3 className="invite-visitor__title">Files are ready to download</h3>
            <p className="invite-visitor__sub">
              The sender has shared files with this link. Use the Download button below.
            </p>
          </div>
        ) : isVisitorWaiting ? (
          <div className="invite-visitor">
            <span className="invite-visitor__icon invite-visitor__icon--pulse">⏳</span>
            <h3 className="invite-visitor__title">Waiting for files…</h3>
            <p className="invite-visitor__sub">
              The sender hasn't uploaded files to this link yet. Please wait — the download will appear automatically.
            </p>
          </div>
        ) : (
        <>
        <div className="mode-toggle">
          <button
            type="button"
            className={`mode-toggle__opt ${!netCode ? "mode-toggle__opt--active" : ""}`}
            onClick={() => onSetNetworkMode("")}
          >
            This Network
          </button>
          <button
            type="button"
            className={`mode-toggle__opt ${netCode ? "mode-toggle__opt--active" : ""}`}
            onClick={() => onSetNetworkMode(netCode || randomCode())}
          >
            Anywhere
          </button>
        </div>

        <p className="invite-view__hint">
          Step 1: Pick the files you want to share. {netCode ? "" : "Then switch to Anywhere to create a link."}
        </p>

        {/* Step 1 — File selection (always shown first) */}
        <div className="invite-select">
          <div className="invite-select__actions">
            <button type="button" className="invite-select__action" onClick={() => fileInputRef.current?.click()}>
              <span>📄</span> File
            </button>
            <button type="button" className="invite-select__action" onClick={() => folderInputRef.current?.click()}>
              <span>📁</span> Folder
            </button>
            <button type="button" className="invite-select__action" onClick={() => setShowTextModal(true)}>
              <span>📝</span> Text
            </button>
            <button
              type="button"
              className="invite-select__action"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  setMessageText(text || "Paste your message here");
                } catch {
                  setMessageText("Paste your message here");
                }
                setShowTextModal(true);
              }}
            >
              <span>📋</span> Paste
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            webkitdirectory="true"
            directory="true"
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {queuedFiles.length > 0 && (
            <div className="invite-select__list">
              {queuedFiles.map((file, index) => (
                <div key={`${file.name}-${file.size}-${index}`} className="invite-select__file">
                  <span className="invite-select__file-ic">{iconForFile(file.name)}</span>
                  <span className="invite-select__file-name">{file.name}</span>
                  <span className="invite-select__file-size mono">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    className="invite-select__file-rm"
                    onClick={() => setQueuedFiles((prev) => prev.filter((_, i) => i !== index))}
                    aria-label={`Remove ${file.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

{/* If files selected but not in Anywhere mode yet — prompt to upload & create link */}
{queuedFiles.length > 0 && !showQr && (
          <div className="invite-view__cta-row">
            <button
              type="button"
              className="btn-solid"
              onClick={() => {
                // Switch to Anywhere mode (creates a code if none yet) and mark
                // the share as "uploaded" so the QR/link step appears.
                onSetNetworkMode(netCode || randomCode());
                setShared(true);
              }}
            >
              📤 Upload & Share
            </button>
          </div>
        )}

        {/* Step 3 — QR / Link (final step, only in Anywhere mode with files) */}
        {showQr && (
          <div className="invite-view__content">
            <div className="invite-ready">
              <span className="invite-ready__count">
                {queuedFiles.length} file{queuedFiles.length === 1 ? "" : "s"} ready
              </span>
            </div>

            <p className="invite-view__hint">
              Share this link or scan the QR. The other device opens the download modal — the code refreshes after 30
              minutes.
            </p>

            <div className="invite-view__code-block">
              <span className="invite-view__code">{netCode}</span>
            </div>

            <div className="invite-view__qr-wrap">
              <div className="invite-view__qr">
                <QRCodeSVG ref={qrRef} value={inviteUrl} size={180} bgColor="#ffffff" fgColor="#101a34" />
              </div>
            </div>

<div className="invite-view__actions">
              <button type="button" className={`btn-solid ${copied ? "btn-solid--copied" : ""}`} onClick={copyLink}>
                {copied ? "✓ Link Copied!" : "Copy Link"}
              </button>
              <button type="button" className="btn-ghost" onClick={downloadQr}>
                Download QR
              </button>
              <button type="button" className="btn-ghost" onClick={() => onSetNetworkMode(randomCode())}>
                New Code
              </button>
            </div>

<div className="join-row">
              <input
                className="mono"
                placeholder="Join another code…"
                value={joinDraft}
                onChange={(e) => setJoinDraft(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && joinDraft.trim() && onSetNetworkMode(joinDraft.trim())
                }
                maxLength={16}
              />
              <button
                type="button"
                className="btn-ghost"
                disabled={!joinDraft.trim()}
                onClick={() => onSetNetworkMode(joinDraft.trim())}
              >
                Join
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {showTextModal && (
        <div className="modal-backdrop" onClick={() => setShowTextModal(false)}>
          <div className="modal-card modal-card--text" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <p className="modal-card__eyebrow">Send text message</p>
            <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} rows={6} placeholder="Type your message here..." />
            <div className="modal-card__actions">
              <button type="button" className="btn-ghost" onClick={() => setShowTextModal(false)}>
                Cancel
              </button>
              <button type="button" className="btn-primary" onClick={sendText} disabled={!messageText.trim()}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
