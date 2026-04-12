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
    <div className="w-[420px] h-[320px] bg-[#12122a] border-2 border-[#4f8ef7] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-1.5 bg-[#1a1a3e] text-sm text-white font-mono">
        <span>🗂️ Secretary {isTyping && <span className="text-[#88ccff] text-[11px]">กำลังพิมพ์...</span>}</span>
        <button onClick={onClose} className="bg-transparent border-none text-[#aaa] cursor-pointer text-base hover:text-white transition-colors">✕</button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1.5">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[70%] px-2.5 py-1.5 rounded-[10px] text-[13px] font-mono break-words text-white ${
              msg.from === "user" ? "self-end bg-[#4f8ef7]" : "self-start bg-[#2a2a3e]"
            }`}
          >
            {msg.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex px-2 py-1.5 gap-1.5 border-t border-[#2a2a4e]">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Say something..."
          className="flex-1 bg-[#1e1e3a] border border-[#4f8ef7] rounded-md text-white px-2.5 py-1.5 text-[13px] font-mono outline-none"
        />
        <button 
          onClick={send} 
          disabled={isTyping} 
          className={`bg-[#4f8ef7] border-none rounded-md text-white px-3.5 py-1.5 cursor-pointer font-mono text-[13px] hover:bg-[#3d7be3] transition-colors ${
            isTyping ? "opacity-50 cursor-not-allowed" : "opacity-100"
          }`}
        >
          Send
        </button>
      </div>
    </div>
  );
}
