"use client";

import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { getGameConfig } from "@/game/config";
import ChatPanel from "./ChatPanel";

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !gameRef.current) return;
    // Small delay ensures the DOM element is fully ready before Phaser attaches
    const id = setTimeout(() => {
      if (!phaserGameRef.current && gameRef.current) {
        phaserGameRef.current = new Phaser.Game(getGameConfig(gameRef.current));
      }
    }, 0);
    return () => {
      clearTimeout(id);
      // Delay destroy so any in-flight Phaser ticks finish first
      const game = phaserGameRef.current;
      phaserGameRef.current = null;
      setTimeout(() => game?.destroy(true), 100);
    };
  }, []);

  useEffect(() => {
    const open = () => setChatOpen(true);
    window.addEventListener("npc-chat", open);
    return () => window.removeEventListener("npc-chat", open);
  }, []);

  // Notify Phaser scene when chat opens/closes so movement stops while typing
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(chatOpen ? "chat-opened" : "chat-closed"));

    if (chatOpen) {
      // Blur every focusable element inside the game canvas to release keyboard
      gameRef.current?.querySelectorAll<HTMLElement>("canvas, *[tabindex]").forEach(el => el.blur());
    }
  }, [chatOpen]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", height: "100vh", backgroundColor: "#1a1a2e", overflow: "hidden" }}
    >
      {/* Game always fills full screen */}
      <div ref={gameRef} style={{ width: "100%", height: "100%" }} />

      {/* Chat popup — centered overlay, always mounted to avoid Phaser destroy */}
      <div style={{
        position: "absolute",
        inset: 0,
        display: chatOpen ? "flex" : "none",
        alignItems: "flex-end",
        justifyContent: "center",
        paddingBottom: "24px",
        pointerEvents: chatOpen ? "all" : "none",
      }}>
        <ChatPanel onClose={() => setChatOpen(false)} />
      </div>
    </div>
  );
}
