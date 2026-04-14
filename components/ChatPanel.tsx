"use client";

import React, { useEffect, useRef, useState } from "react";

interface Message {
  from: "npc" | "user";
  text: string;
  time?: string;
}

interface ChatPanelProps {
  onClose: () => void;
  npcName?: string;
  npcId?: string;
  greeting?: string;
  userId?: string;
}

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function ChatPanel({ onClose, npcName = "SECRETARY", npcId = "secretary", greeting = "สวัสดีค่ะ ฉันคือ Secretary มีอะไรให้ช่วยไหม?", userId }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { from: "npc", text: greeting, time: getTime() },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history on mount
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/chat-history?userId=${userId}&npcId=${npcId}`)
      .then((r) => r.json())
      .then((data: { role: string; content: string; createdAt: string }[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const loaded: Message[] = data.map((m) => ({
          from: m.role === "user" ? "user" : "npc",
          text: m.content,
          time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }));
        setMessages(loaded);
      })
      .catch(() => {});
  }, [userId, npcId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const saveMessage = (role: string, content: string) => {
    if (!userId) return;
    fetch("/api/chat-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, npcId, role, content }),
    }).catch(() => {});
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { from: "user", text, time: getTime() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    saveMessage("user", text);

    const apiMessages = nextMessages.map((m) => ({
      role: m.from === "user" ? "user" : "assistant",
      content: m.text,
    }));

    const res = await fetch("/api/secretary/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages, npcId }),
    });

    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let npcText = "";
    const npcTime = getTime();

    setIsTyping(true);
    setMessages((prev) => [...prev, { from: "npc", text: "", time: npcTime }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      npcText += decoder.decode(value, { stream: true });
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { from: "npc", text: npcText, time: npcTime };
        return updated;
      });
    }
    setIsTyping(false);
    saveMessage("assistant", npcText);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") send();
    if (e.key === "Escape") {
      setInput("");
      onClose();
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        /* ── Pixel border mixin via box-shadow ── */
        /* outer highlight + inner shadow = classic inset bevel */

        .pixel-panel {
          width: 680px;
          height: 420px;
          display: flex;
          flex-direction: column;
          background: #1a1c2c;
          font-family: 'Press Start 2P', monospace;
          image-rendering: pixelated;

          /* chunky pixel border: top-left light, bottom-right dark */
          border: 4px solid #5a6988;
          box-shadow:
            /* outer bevel light */
            -4px -4px 0 0 #8faabb,
            4px  4px  0 0 #0d0f1a,
            /* deep outer shadow */
            6px  6px  0 0 #000000;
          position: relative;
        }

        /* scanline overlay */
        .pixel-panel::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 3px,
            rgba(0,0,0,0.10) 3px,
            rgba(0,0,0,0.10) 4px
          );
          z-index: 10;
        }

        /* ── Header ── */
        .pixel-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: #16213e;
          border-bottom: 4px solid #0d0f1a;
          flex-shrink: 0;
          position: relative;
        }
        .pixel-header::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 0; right: 0;
          height: 4px;
          background: #2a3a6a;
        }

        .pixel-avatar {
          width: 32px;
          height: 32px;
          background: #0f3460;
          border: 3px solid #4f8ef7;
          box-shadow: 2px 2px 0 #000, -1px -1px 0 #8ab4ff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
          image-rendering: pixelated;
        }

        .pixel-header-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .pixel-header-name {
          font-size: 9px;
          color: #e8f4fd;
          text-shadow: 2px 2px 0 #000;
          letter-spacing: 0.05em;
        }
        .pixel-header-status {
          font-size: 7px;
          color: #39d353;
          text-shadow: 1px 1px 0 #000;
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .pixel-status-dot {
          width: 6px;
          height: 6px;
          background: #39d353;
          box-shadow: 1px 1px 0 #000;
          animation: pixelBlink 1.4s step-start infinite;
        }
        @keyframes pixelBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .pixel-close-btn {
          width: 24px;
          height: 24px;
          background: #c0392b;
          border: 3px solid #e74c3c;
          box-shadow: 2px 2px 0 #000, -1px -1px 0 #ff6b6b;
          color: #fff;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: none;
        }
        .pixel-close-btn:hover {
          background: #e74c3c;
          transform: translate(1px, 1px);
          box-shadow: 1px 1px 0 #000;
        }
        .pixel-close-btn:active {
          transform: translate(2px, 2px);
          box-shadow: none;
        }

        /* ── Messages ── */
        .pixel-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #1a1c2c;
          /* dotted pixel grid bg */
          background-image: radial-gradient(circle, #2a2d3e 1px, transparent 1px);
          background-size: 12px 12px;
        }
        .pixel-messages::-webkit-scrollbar { width: 8px; }
        .pixel-messages::-webkit-scrollbar-track { background: #0d0f1a; }
        .pixel-messages::-webkit-scrollbar-thumb {
          background: #4f8ef7;
          border: 2px solid #0d0f1a;
        }

        /* ── Message row ── */
        .pixel-msg-row {
          display: flex;
          align-items: flex-end;
          gap: 6px;
        }
        .pixel-msg-row.user-row { flex-direction: row-reverse; }

        .pixel-msg-avatar {
          width: 24px;
          height: 24px;
          background: #0f3460;
          border: 2px solid #4f8ef7;
          box-shadow: 2px 2px 0 #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          flex-shrink: 0;
        }

        .pixel-msg-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 70%;
        }
        .npc-row .pixel-msg-col  { align-items: flex-start; }
        .user-row .pixel-msg-col { align-items: flex-end; }

        /* pixel bubble: flat box with hard shadow */
        .pixel-bubble {
          padding: 6px 10px;
          font-family: 'Sarabun', sans-serif;
          font-size: 15px;
          font-weight: 400;
          line-height: 1.6;
          letter-spacing: 0.01em;
          word-break: break-word;
        }
        .bubble-npc {
          background: #16213e;
          color: #a8d8ea;
          border: 3px solid #4f8ef7;
          box-shadow: 3px 3px 0 #000, -1px -1px 0 #2a4a8a;
        }
        .bubble-user {
          background: #0f3460;
          color: #e8f4fd;
          border: 3px solid #88aaff;
          box-shadow: 3px 3px 0 #000, -1px -1px 0 #4466cc;
        }

        .pixel-msg-time {
          font-size: 6px;
          color: #4a5568;
          text-shadow: 1px 1px 0 #000;
          letter-spacing: 0.05em;
        }

        /* ── Typing dots ── */
        .pixel-typing-dot {
          display: inline-block;
          width: 6px;
          height: 6px;
          background: #4f8ef7;
          box-shadow: 1px 1px 0 #000;
          animation: pixelTyping 0.8s step-start infinite;
        }
        @keyframes pixelTyping {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }

        /* ── Input bar ── */
        .pixel-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          background: #16213e;
          border-top: 4px solid #0d0f1a;
          flex-shrink: 0;
          position: relative;
        }
        .pixel-input-row::before {
          content: '';
          position: absolute;
          top: -8px;
          left: 0; right: 0;
          height: 4px;
          background: #2a3a6a;
        }

        .pixel-input {
          flex: 1;
          padding: 8px 10px;
          font-family: 'Sarabun', sans-serif;
          font-size: 15px;
          font-weight: 400;
          background: #0d0f1a;
          color: #88aaff;
          border: 3px solid #4f8ef7;
          box-shadow: inset 2px 2px 0 #000, 2px 2px 0 #000;
          outline: none;
          letter-spacing: 0.05em;
          caret-color: #4f8ef7;
        }
        .pixel-input:focus {
          border-color: #88aaff;
          color: #e8f4fd;
        }
        .pixel-input::placeholder {
          color: #2a3a6a;
          font-size: 14px;
        }

        .pixel-send-btn {
          width: 38px;
          height: 38px;
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          border: 3px solid #88aaff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: none;
          letter-spacing: 0;
        }
        .pixel-send-btn:hover {
          transform: translate(1px, 1px);
        }
        .pixel-send-btn:active {
          transform: translate(2px, 2px);
        }
        .pixel-send-btn.active {
          background: #4f8ef7;
          color: #000;
          box-shadow: 3px 3px 0 #000, -1px -1px 0 #88aaff;
        }
        .pixel-send-btn.active:hover {
          box-shadow: 2px 2px 0 #000;
        }
        .pixel-send-btn.active:active {
          box-shadow: none;
        }
        .pixel-send-btn.inactive {
          background: #1a2a4a;
          color: #2a3a6a;
          border-color: #2a3a6a;
          box-shadow: 2px 2px 0 #000;
          cursor: default;
        }
      `}</style>

      <div className="pixel-panel">
        {/* ── Header ── */}
        <div className="pixel-header">
          <div className="pixel-avatar">🤖</div>
          <div className="pixel-header-info">
            <span className="pixel-header-name">{npcName}</span>
            <span className="pixel-header-status">
              <span className="pixel-status-dot" />
              ONLINE
            </span>
          </div>
          <button className="pixel-close-btn" onClick={onClose}>X</button>
        </div>

        {/* ── Messages ── */}
        <div className="pixel-messages">
          {messages.map((msg, i) => {
            const isUser = msg.from === "user";
            const isEmpty = msg.text === "";
            return (
              <div key={i} className={`pixel-msg-row ${isUser ? "user-row" : "npc-row"}`}>
                {!isUser && <div className="pixel-msg-avatar">🤖</div>}
                <div className="pixel-msg-col">
                  <div className={`pixel-bubble ${isUser ? "bubble-user" : "bubble-npc"}`}>
                    {isEmpty ? (
                      <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
                        {[0, 0.3, 0.6].map((d, di) => (
                          <span
                            key={di}
                            className="pixel-typing-dot"
                            style={{ animationDelay: `${d}s` }}
                          />
                        ))}
                      </span>
                    ) : (
                      msg.text
                        .replace(/\*\*(.*?)\*\*/g, '$1')
                        .replace(/\*(.*?)\*/g, '$1')
                        .replace(/^#{1,6}\s+/gm, '')
                        .replace(/`([^`]+)`/g, '$1')
                    )}
                  </div>
                  {msg.time && !isEmpty && (
                    <span className="pixel-msg-time">{msg.time}</span>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div className="pixel-input-row">
          <input
            ref={inputRef}
            className="pixel-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="SEND MESSAGE..."
          />
          <button
            className={`pixel-send-btn ${input.trim() ? "active" : "inactive"}`}
            onClick={send}
          >
            ▶
          </button>
        </div>
      </div>
    </>
  );
}