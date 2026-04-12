"use client";

import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { AnimatePresence, motion } from "framer-motion";
import { getGameConfig } from "@/game/config";
import ChatPanel from "./ChatPanel";

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [ratOpen, setRatOpen] = useState(false);

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

  useEffect(() => {
    const open = () => setRatOpen(true);
    window.addEventListener("rat-chat", open);
    return () => window.removeEventListener("rat-chat", open);
  }, []);

  // Notify Phaser scene when chat opens/closes so movement stops while typing
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(chatOpen || ratOpen ? "chat-opened" : "chat-closed"));
    if (chatOpen || ratOpen) {
      gameRef.current?.querySelectorAll<HTMLElement>("canvas, *[tabindex]").forEach(el => el.blur());
    }
  }, [chatOpen, ratOpen]);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", height: "100vh", backgroundColor: "#1a1a2e", overflow: "hidden" }}
    >
      {/* Game always fills full screen */}
      <div ref={gameRef} style={{ width: "100%", height: "100%" }} />

      {/* Rat dialog bubble */}
      <AnimatePresence>
        {ratOpen && (
          <motion.div
            key="rat"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: "24px",
              pointerEvents: "all",
            }}
          >
            <div style={{
              backgroundColor: "#12122a",
              border: "2px solid #f7a84f",
              borderRadius: "12px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              padding: "16px 20px",
              maxWidth: "380px",
              fontFamily: "monospace",
              color: "#fff",
              fontSize: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}>
              <div>🐀 <span style={{ color: "#f7a84f" }}>Rattatoiue</span></div>
              <div>ขอโทษนะพอดียุ่งอยู่ หวังว่านายจะไม่เอาฉันไปทำแกงเขียวหวานนะ</div>
              <button
                onClick={() => { setRatOpen(false); window.dispatchEvent(new CustomEvent("chat-closed")); }}
                style={{ alignSelf: "flex-end", backgroundColor: "#f7a84f", border: "none", borderRadius: "6px", color: "#000", padding: "6px 16px", cursor: "pointer", fontFamily: "monospace", fontSize: "13px" }}
              >
                โอเค...
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secretary chat popup */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              paddingBottom: "24px",
              pointerEvents: "all",
            }}
          >
            <ChatPanel onClose={() => setChatOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
