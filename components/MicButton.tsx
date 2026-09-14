"use client";

import { useEffect, useState } from "react";
import type { VoiceState, VoiceStatus } from "@/game/voice";

/** Border + glyph colour per state, and what the tooltip explains */
const LOOK: Record<VoiceStatus, { accent: string; title: string }> = {
  off: { accent: "#5a6988", title: "Turn on voice chat" },
  requesting: { accent: "#4f8ef7", title: "Asking for microphone access..." },
  on: { accent: "#4f8ef7", title: "Voice on — walk closer to hear people better" },
  denied: {
    accent: "#ff6b6b",
    title: "Microphone blocked. Allow it in your browser's site settings.",
  },
  nodevice: { accent: "#ff6b6b", title: "No microphone found" },
  error: { accent: "#ff6b6b", title: "Microphone unavailable — is another app using it?" },
};

/**
 * HUD toggle for proximity voice. Owns no audio itself — it dispatches
 * `voice-toggle` and renders whatever `voice-state` reports back (ADR 0003).
 */
export default function MicButton() {
  const [state, setState] = useState<VoiceState>({ status: "off", peers: 0 });

  useEffect(() => {
    const onState = (e: Event) => setState((e as CustomEvent<VoiceState>).detail);
    window.addEventListener("voice-state", onState);
    return () => window.removeEventListener("voice-state", onState);
  }, []);

  const { accent, title } = LOOK[state.status];
  const live = state.status === "on";
  const muted = !live && state.status !== "requesting";

  return (
    <button
      title={title}
      aria-label={title}
      onClick={(e) => {
        // Leaving the button focused would let SayBar's global Enter handler
        // re-activate it every time someone hits Enter to chat
        e.currentTarget.blur();
        window.dispatchEvent(new CustomEvent("voice-toggle"));
      }}
      style={{
        position: "relative",
        width: 44,
        height: 44,
        background: "#16213e",
        border: `3px solid ${accent}`,
        boxShadow: "3px 3px 0 #000, -1px -1px 0 #2a4a8a",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 8,
      }}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke={accent}
        strokeWidth="2"
        strokeLinecap="square"
        shapeRendering="crispEdges"
      >
        <rect x="9" y="2" width="6" height="11" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <line x1="12" y1="18" x2="12" y2="22" />
        {muted && <line x1="3" y1="3" x2="21" y2="21" stroke="#ff6b6b" />}
      </svg>

      {live && (
        <span
          style={{
            position: "absolute",
            bottom: -6,
            right: -6,
            minWidth: 16,
            padding: "2px 3px",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8,
            lineHeight: 1,
            color: "#000",
            background: state.peers > 0 ? "#4ade80" : "#5a6988",
            border: "2px solid #0d0f1a",
          }}
        >
          {state.peers}
        </span>
      )}
    </button>
  );
}
