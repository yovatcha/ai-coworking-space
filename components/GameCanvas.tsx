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
    <div ref={containerRef} className="w-full h-screen flex justify-center items-center bg-[#1a1a2e]">
      {/* Game always fills full screen */}
      <div ref={gameRef} className="w-full h-full" />

      {/* Rat dialog bubble */}
      <AnimatePresence>
        {ratOpen && (
          <motion.div
            key="rat"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-auto"
          >
            <div className="bg-[#12122a] border-2 border-[#f7a84f] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] px-5 py-4 max-w-[380px] font-mono text-white text-sm flex flex-col gap-3">
              <div>🐀 <span className="text-[#f7a84f]">Rattatoiue</span></div>
              <div>ขอโทษนะพอดียุ่งอยู่ หวังว่านายจะไม่เอาฉันไปทำแกงเขียวหวานนะ</div>
              <button
                onClick={() => { setRatOpen(false); window.dispatchEvent(new CustomEvent("chat-closed")); }}
                className="self-end bg-[#f7a84f] border-none rounded-md text-black px-4 py-1.5 cursor-pointer font-mono text-[13px] hover:bg-[#e69b46] transition-colors"
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
            className="absolute inset-0 flex items-end justify-center pb-6 pointer-events-auto"
          >
            <ChatPanel onClose={() => setChatOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
