"use client";

import React, { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { getGameConfig } from "@/game/config";
import ChatPanel from "./ChatPanel";

const CHAT_HEIGHT = 220;
const TRANSITION_MS = 300;

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !gameRef.current || phaserGameRef.current) return;
    phaserGameRef.current = new Phaser.Game(getGameConfig(gameRef.current));
    return () => {
      phaserGameRef.current?.destroy(true);
      phaserGameRef.current = null;
    };
  }, []);

  // Refresh Phaser after the CSS transition finishes
  useEffect(() => {
    const id = setTimeout(() => {
      phaserGameRef.current?.scale.refresh();
    }, TRANSITION_MS + 20);
    return () => clearTimeout(id);
  }, [chatOpen]);

  useEffect(() => {
    const open = () => setChatOpen(true);
    window.addEventListener("npc-chat", open);
    return () => window.removeEventListener("npc-chat", open);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#1a1a2e", overflow: "hidden" }}
    >
      {/* Game shrinks smoothly */}
      <div
        ref={gameRef}
        style={{
          width: "100%",
          flex: "none",
          height: chatOpen ? `calc(100vh - ${CHAT_HEIGHT}px)` : "100vh",
          transition: `height ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          overflow: "hidden",
        }}
      />

      {/* Chat panel slides up from bottom — always mounted, height animates */}
      <div
        style={{
          height: chatOpen ? `${CHAT_HEIGHT}px` : "0px",
          overflow: "hidden",
          transition: `height ${TRANSITION_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          flexShrink: 0,
        }}
      >
        <ChatPanel onClose={() => setChatOpen(false)} />
      </div>
    </div>
  );
}
