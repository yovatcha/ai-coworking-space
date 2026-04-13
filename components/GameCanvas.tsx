"use client";

import { useEffect, useRef, useState } from "react";
import * as Phaser from "phaser";
import { AnimatePresence, motion } from "framer-motion";
import { getGameConfig } from "@/game/config";
import ChatPanel from "./ChatPanel";
import { logout } from "./LoginPage";

export default function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [ratOpen, setRatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [exitConfirm, setExitConfirm] = useState(false);

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

  useEffect(() => {
    const handle = () => { setExitConfirm(true); };
    window.addEventListener("exit-door", handle);
    return () => window.removeEventListener("exit-door", handle);
  }, []);

  // Notify Phaser scene when chat opens/closes so movement stops while typing
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent(chatOpen || ratOpen ? "chat-opened" : "chat-closed"),
    );
    if (chatOpen || ratOpen) {
      gameRef.current
        ?.querySelectorAll<HTMLElement>("canvas, *[tabindex]")
        .forEach((el) => el.blur());
    }
  }, [chatOpen, ratOpen]);

  return (
    <div
      ref={containerRef}
      className="w-full h-screen flex justify-center items-center bg-[#1a1a2e]"
    >
      {/* Game always fills full screen */}
      <div ref={gameRef} className="w-full h-full" />

      {/* Rat dialog bubble */}
      <AnimatePresence>
        {ratOpen && (
          <motion.div
            key="rat"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 pointer-events-auto z-50"
            style={{ width: "min(360px, 100vw - 2rem)" }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "#1a1c2c",
                fontFamily: "'Press Start 2P', monospace",
                border: "4px solid #5a6988",
                boxShadow:
                  "-4px -4px 0 0 #8faabb, 4px 4px 0 0 #0d0f1a, 6px 6px 0 0 #000",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* scanlines */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  zIndex: 10,
                  background:
                    "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.10) 3px,rgba(0,0,0,0.10) 4px)",
                }}
              />

              {/* title bar */}
              <div
                style={{
                  background: "#2a1a00",
                  borderBottom: "4px solid #0d0f1a",
                  padding: "8px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    background: "#3d2200",
                    border: "3px solid #f7a84f",
                    boxShadow: "2px 2px 0 #000, -1px -1px 0 #ffcc88",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  🐀
                </div>
                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 9,
                      color: "#f7d794",
                      textShadow: "2px 2px 0 #000",
                    }}
                  >
                    RATTATOIUE
                  </span>
                  <span
                    style={{
                      fontSize: 6,
                      color: "#f7a84f",
                      textShadow: "1px 1px 0 #000",
                    }}
                  >
                    INCOMING MESSAGE
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 6,
                    color: "#5a6988",
                    textShadow: "1px 1px 0 #000",
                  }}
                >
                  NOW
                </span>
              </div>

              {/* message body */}
              <div
                style={{
                  padding: "14px 12px",
                  background: "#1a1c2c",
                  backgroundImage:
                    "radial-gradient(circle, #2a2d3e 1px, transparent 1px)",
                  backgroundSize: "12px 12px",
                  position: "relative",
                }}
              >
                {/* pixel speaker nub */}
                <div
                  style={{
                    position: "absolute",
                    top: -1,
                    left: 18,
                    width: 12,
                    height: 4,
                    background: "#f7a84f",
                  }}
                />
                <p
                  style={{
                    fontFamily: "'Sarabun', sans-serif",
                    fontSize: 16,
                    fontWeight: 400,
                    lineHeight: 1.6,
                    color: "#e6d4aa",
                    textShadow: "1px 1px 0 #000",
                    margin: 0,
                    letterSpacing: "0.03em",
                  }}
                >
                  ขอโทษนะ พอดียุ่งอยู่ หวังว่านายจะไม่เอาฉันไปทำแกงเขียวหวานนะ
                </p>
              </div>

              {/* pixel divider */}
              <div style={{ height: 4, background: "#0d0f1a" }} />
              <div style={{ height: 3, background: "#2a3a6a" }} />
              <div style={{ height: 4, background: "#0d0f1a" }} />

              {/* actions */}
              <div
                style={{
                  padding: "10px 12px",
                  background: "#2a1a00",
                  borderTop: "4px solid #0d0f1a",
                  display: "flex",
                  gap: 8,
                }}
              >
                {[
                  {
                    label: "OK",
                    primary: true,
                    action: () => {
                      setRatOpen(false);
                      window.dispatchEvent(new CustomEvent("chat-closed"));
                    },
                  },
                  {
                    label: "IGNORE",
                    primary: false,
                    action: () => setRatOpen(false),
                  },
                ].map(({ label, primary, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      flex: 1,
                      padding: "9px 0",
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 8,
                      letterSpacing: "0.05em",
                      background: primary ? "#f7a84f" : "#1a1c2c",
                      color: primary ? "#0a0a1a" : "#f7a84f",
                      border: `3px solid ${primary ? "#ffcc88" : "#5a4020"}`,
                      boxShadow: primary
                        ? "3px 3px 0 #000, -1px -1px 0 #ffcc88"
                        : "3px 3px 0 #000, -1px -1px 0 #3a2a10",
                      cursor: "pointer",
                    }}
                    onMouseOver={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "translate(1px,1px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "2px 2px 0 #000";
                    }}
                    onMouseOut={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        primary
                          ? "3px 3px 0 #000, -1px -1px 0 #ffcc88"
                          : "3px 3px 0 #000, -1px -1px 0 #3a2a10";
                    }}
                    onMouseDown={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "translate(2px,2px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "none";
                    }}
                    onMouseUp={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.transform =
                        "translate(1px,1px)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow =
                        "1px 1px 0 #000";
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Secretary chat popup */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{
              type: "spring",
              stiffness: 340,
              damping: 30,
              mass: 0.8,
            }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto z-50"
          >
            <ChatPanel onClose={() => setChatOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Exit confirmation dialog */}
      <AnimatePresence>
        {exitConfirm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.55)",
              zIndex: 200,
            }}
          >
            <div
              style={{
                background: "#16213e",
                border: "4px solid #4f8ef7",
                boxShadow: "-4px -4px 0 0 #8faabb, 4px 4px 0 0 #0d0f1a, 6px 6px 0 0 #000",
                fontFamily: "'Press Start 2P', monospace",
                minWidth: 280,
                overflow: "hidden",
              }}
            >
              {/* title bar */}
              <div style={{ background: "#0d0f1a", borderBottom: "4px solid #000", padding: "10px 14px" }}>
                <span style={{ fontSize: 9, color: "#e8f4fd", textShadow: "2px 2px 0 #000", letterSpacing: "0.05em" }}>
                  EXIT ROOM
                </span>
              </div>

              {/* body */}
              <div style={{ padding: "20px 16px", background: "#1a1c2c", backgroundImage: "radial-gradient(circle, #2a2d3e 1px, transparent 1px)", backgroundSize: "12px 12px" }}>
                <p style={{ fontFamily: "'Sarabun', sans-serif", fontSize: 15, color: "#a8d8ea", margin: 0, lineHeight: 1.6 }}>
                  Are you sure you want to leave?
                </p>
              </div>

              {/* actions */}
              <div style={{ display: "flex", gap: 8, padding: "10px 12px", background: "#0d0f1a", borderTop: "4px solid #000" }}>
                {[
                  { label: "LOGOUT", primary: true, action: () => { logout(); window.location.reload(); } },
                  { label: "CANCEL", primary: false, action: () => setExitConfirm(false) },
                ].map(({ label, primary, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      flex: 1,
                      padding: "10px 0",
                      fontFamily: "'Press Start 2P', monospace",
                      fontSize: 8,
                      letterSpacing: "0.05em",
                      background: primary ? "#4f8ef7" : "#1a1c2c",
                      color: primary ? "#000" : "#88aaff",
                      border: `3px solid ${primary ? "#88aaff" : "#2a3a6a"}`,
                      boxShadow: "3px 3px 0 #000",
                      cursor: "pointer",
                    }}
                    onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translate(1px,1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "2px 2px 0 #000"; }}
                    onMouseOut={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; (e.currentTarget as HTMLButtonElement).style.boxShadow = "3px 3px 0 #000"; }}
                    onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = "translate(2px,2px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings button */}
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 100 }}>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          style={{
            width: 44,
            height: 44,
            background: "#16213e",
            border: "3px solid #4f8ef7",
            boxShadow: "3px 3px 0 #000, -1px -1px 0 #2a4a8a",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          <img src="/assets/icons/setting.svg" alt="Settings" style={{ width: 22, height: 22, imageRendering: "pixelated", filter: "invert(60%) sepia(80%) saturate(400%) hue-rotate(190deg)" }} />
        </button>

        <AnimatePresence>
          {settingsOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.12 }}
              style={{
                position: "absolute",
                top: 52,
                right: 0,
                background: "#16213e",
                border: "3px solid #4f8ef7",
                boxShadow: "3px 3px 0 #000, -1px -1px 0 #2a4a8a",
                minWidth: 140,
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => { setSettingsOpen(false); setExitConfirm(true); }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: 8,
                  color: "#ff6b6b",
                  background: "transparent",
                  border: "none",
                  borderBottom: "2px solid #0d0f1a",
                  cursor: "pointer",
                  textAlign: "left",
                  letterSpacing: "0.05em",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#1a2a4a")}
                onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
              >
                LOGOUT
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
