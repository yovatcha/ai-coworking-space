"use client";

import React, { useEffect, useRef, useState } from "react";

interface Message {
  from: "npc" | "user";
  text: string;
}

interface ChatPanelProps {
  onClose: () => void;
}

export default function ChatPanel({ onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    { from: "npc", text: "สวัสดีค่ะ ฉันคือ Secretary มีอะไรให้ช่วยไหม?" },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);


  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: Message = { from: "user", text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");

    // Build message history for API
    const apiMessages = nextMessages.map((m) => ({
      role: m.from === "user" ? "user" : "assistant",
      content: m.text,
    }));

    // Stream response from secretary API
    const res = await fetch("/api/secretary/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: apiMessages }),
    });

    if (!res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let npcText = "";

    setIsTyping(true);
    // Add empty NPC bubble first
    setMessages((prev) => [...prev, { from: "npc", text: "" }]);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      npcText += decoder.decode(value, { stream: true });
      // Update last NPC bubble with streaming text
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { from: "npc", text: npcText };
        return updated;
      });
    }
    setIsTyping(false);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") send();
    if (e.key === "Escape") { setInput(""); onClose(); }
  };

  return (
    <div style={styles.panel}>
      {/* Header */}
      <div style={styles.header}>
        <span>🗂️ Secretary {isTyping && <span style={{ color: "#88ccff", fontSize: "11px" }}>กำลังพิมพ์...</span>}</span>
        <button onClick={onClose} style={styles.closeBtn}>✕</button>
      </div>

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...styles.bubble,
              alignSelf: msg.from === "user" ? "flex-end" : "flex-start",
              backgroundColor: msg.from === "user" ? "#4f8ef7" : "#2a2a3e",
              color: "#fff",
            }}
          >
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={styles.inputRow}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Say something..."
          style={styles.input}
        />
        <button onClick={send} disabled={isTyping} style={{ ...styles.sendBtn, opacity: isTyping ? 0.5 : 1 }}>Send</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: "420px",
    height: "320px",
    backgroundColor: "#12122a",
    border: "2px solid #4f8ef7",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 12px",
    backgroundColor: "#1a1a3e",
    fontSize: "14px",
    color: "#fff",
    fontFamily: "monospace",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#aaa",
    cursor: "pointer",
    fontSize: "16px",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  bubble: {
    maxWidth: "70%",
    padding: "6px 10px",
    borderRadius: "10px",
    fontSize: "13px",
    fontFamily: "monospace",
    wordBreak: "break-word",
  },
  inputRow: {
    display: "flex",
    padding: "6px 8px",
    gap: "6px",
    borderTop: "1px solid #2a2a4e",
  },
  input: {
    flex: 1,
    backgroundColor: "#1e1e3a",
    border: "1px solid #4f8ef7",
    borderRadius: "6px",
    color: "#fff",
    padding: "6px 10px",
    fontSize: "13px",
    fontFamily: "monospace",
    outline: "none",
  },
  sendBtn: {
    backgroundColor: "#4f8ef7",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    padding: "6px 14px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "13px",
  },
};
