"use client";

import { useEffect, useRef, useState } from "react";

const MAX_LEN = 100;

/** Bottom-of-screen input that broadcasts a speech balloon over your character */
export default function SayBar() {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Enter focuses the bar from anywhere in the game (unless another field is active)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      // Unmounting while focused skips onBlur — release the movement lock
      window.dispatchEvent(new CustomEvent("say-blur"));
    };
  }, []);

  const send = () => {
    const msg = text.trim();
    if (msg) {
      window.dispatchEvent(new CustomEvent("player-say", { detail: msg }));
      setText("");
    }
    inputRef.current?.blur();
  };

  return (
    <div
      style={{
        position: "absolute",
        bottom: 16,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(520px, calc(100vw - 2rem))",
        display: "flex",
        alignItems: "stretch",
        gap: 8,
        padding: 8,
        background: "#16213e",
        border: `4px solid ${focused ? "#4f8ef7" : "#5a6988"}`,
        boxShadow: "-4px -4px 0 0 #8faabb, 4px 4px 0 0 #0d0f1a, 6px 6px 0 0 #000",
        zIndex: 40,
      }}
    >
      <span
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          color: "#88aaff",
          textShadow: "1px 1px 0 #000",
          alignSelf: "center",
          padding: "0 4px",
          letterSpacing: "0.05em",
          flexShrink: 0,
        }}
      >
        SAY
      </span>

      <input
        ref={inputRef}
        value={text}
        maxLength={MAX_LEN}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => {
          setFocused(true);
          window.dispatchEvent(new CustomEvent("say-focus"));
        }}
        onBlur={() => {
          setFocused(false);
          window.dispatchEvent(new CustomEvent("say-blur"));
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") send();
          if (e.key === "Escape") inputRef.current?.blur();
        }}
        placeholder="Press Enter to talk..."
        style={{
          flex: 1,
          minWidth: 0,
          padding: "10px 12px",
          fontFamily: "'Sarabun', sans-serif",
          fontSize: 15,
          background: "#050510",
          color: "#e6ecff",
          border: "3px solid #2a3a6a",
          boxShadow: "inset 2px 2px 0 #000",
          outline: "none",
        }}
      />

      <button
        onClick={send}
        style={{
          padding: "0 14px",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 8,
          letterSpacing: "0.05em",
          background: "#4f8ef7",
          color: "#000",
          border: "3px solid #88aaff",
          boxShadow: "3px 3px 0 #000, -1px -1px 0 #88aaff",
          cursor: "pointer",
          flexShrink: 0,
        }}
        onMouseDown={(e) => {
          e.preventDefault(); // keep focus so blur doesn't fire before the click
          e.currentTarget.style.transform = "translate(2px,2px)";
          e.currentTarget.style.boxShadow = "none";
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "3px 3px 0 #000, -1px -1px 0 #88aaff";
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "3px 3px 0 #000, -1px -1px 0 #88aaff";
        }}
      >
        SEND
      </button>
    </div>
  );
}
