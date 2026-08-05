import { useEffect, useRef, useState } from "react";
import { getChat, addChatMessage, clearChat } from "../lib/chat.js";
import "./ChatView.css";

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatView({ peers, self, onSendChatMessage, onSendChatTyping, onNotify }) {
  const [selectedPeerId, setSelectedPeerId] = useState(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingFrom, setTypingFrom] = useState(null);
  const listRef = useRef(null);
  const typingTimerRef = useRef(null);

  const selectedPeer = peers.find((p) => p.id === selectedPeerId) ?? null;
  const peerName = selectedPeer?.name ?? "";

  // Load persisted messages when switching peer.
  useEffect(() => {
    setMessages(peerName ? getChat(peerName) : []);
  }, [peerName]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Clear typing indicator after 2.5s of no activity.
  useEffect(() => {
    if (!typingTimerRef.current) return;
    return () => clearTimeout(typingTimerRef.current);
  }, []);

  function send() {
    const text = draft.trim();
    if (!text || !selectedPeer) return;
    onSendChatMessage?.(selectedPeer.id, text);
    const next = addChatMessage(peerName, { text, from: "me" });
    setMessages([...next]);
    setDraft("");
  }

  function handleTyping() {
    if (!selectedPeer) return;
    onSendChatTyping?.(selectedPeer.id);
  }

  return (
    <div className="chat-view">
      <div className="chat-layout">
        {/* Peer list */}
        <aside className="chat-sidebar">
          <p className="chat-sidebar__title">Chats</p>
          {peers.length === 0 ? (
            <p className="chat-sidebar__empty">No devices available yet.</p>
          ) : (
            <div className="chat-peer-list">
              {peers.map((peer) => (
                <button
                  key={peer.id}
                  type="button"
                  className={`chat-peer ${selectedPeerId === peer.id ? "chat-peer--active" : ""}`}
                  onClick={() => setSelectedPeerId(peer.id)}
                >
                  <span className="chat-peer__avatar">{peer.avatar ?? "◇"}</span>
                  <span className="chat-peer__name">{peer.name}</span>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Conversation */}
        <div className="chat-main">
          {!selectedPeer ? (
            <div className="chat-empty">
              <span className="chat-empty__icon">💬</span>
              <p>Select a device to start chatting</p>
            </div>
          ) : (
            <>
              <div className="chat-header">
                <span className="chat-header__avatar">{selectedPeer.avatar ?? "◇"}</span>
                <div className="chat-header__mid">
                  <span className="chat-header__name">{selectedPeer.name}</span>
                  <span className="chat-header__status">Online</span>
                </div>
                <button
                  type="button"
                  className="chat-header__clear"
                  onClick={() => {
                    clearChat(peerName);
                    setMessages([]);
                    onNotify?.("Chat cleared");
                  }}
                  title="Clear chat history"
                >
                  🗑️
                </button>
              </div>

              <div className="chat-messages" ref={listRef}>
                {messages.length === 0 && (
                  <p className="chat-messages__empty">Say hello to {selectedPeer.name} 👋</p>
                )}
                {messages.map((m, i) => (
                  <div key={`${m.at}-${i}`} className={`chat-bubble chat-bubble--${m.from === "me" ? "me" : "them"}`}>
                    <div className="chat-bubble__text">{m.text}</div>
                    <div className="chat-bubble__time">{formatTime(m.at)}</div>
                  </div>
                ))}
                {typingFrom && <p className="chat-typing">{typingFrom} is typing…</p>}
              </div>

              <div className="chat-composer">
                <input
                  className="chat-composer__input"
                  value={draft}
                  placeholder={`Message ${selectedPeer.name}…`}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    handleTyping();
                    clearTimeout(typingTimerRef.current);
                    typingTimerRef.current = setTimeout(() => setTypingFrom(null), 2500);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                />
                <button type="button" className="btn-primary chat-composer__send" onClick={send} disabled={!draft.trim()}>
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
