"use client";

import { useState } from "react";

const CORRECT_PASSWORD = "1212312121";
const SESSION_KEY = "cowork_auth";

export function isAuthenticated() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_KEY) === "true";
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export default function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (password === CORRECT_PASSWORD) {
      localStorage.setItem(SESSION_KEY, "true");
      onSuccess();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden bg-[#1a1a2e]">
      {/* Background video — zoomed 20% */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute w-[120%] h-[120%] -top-[10%] -left-[10%] object-cover z-0"
      >
        <source src="/assets/video/login-bg.mp4" type="video/mp4" />
      </video>

      {/* 30% black overlay */}
      <div className="absolute inset-0 bg-black/30 z-10" />

      {/* Login box */}
      <div
        className="relative z-20 flex flex-col gap-4 p-8 w-[340px] bg-[#0a0a1a] border-4 border-[#4f8ef7]"
        style={{
          imageRendering: "pixelated",
          boxShadow: "6px 6px 0px #1a2a6e, inset 0 0 0 2px #0a0a1a",
        }}
      >
        {/* Corner pixels */}
        <div className="absolute top-0 left-0 w-2 h-2 bg-[#4f8ef7]" />
        <div className="absolute top-0 right-0 w-2 h-2 bg-[#4f8ef7]" />
        <div className="absolute bottom-0 left-0 w-2 h-2 bg-[#4f8ef7]" />
        <div className="absolute bottom-0 right-0 w-2 h-2 bg-[#4f8ef7]" />

        <img
          src="/assets/dreamspace-banner.png"
          alt="Dream Space"
          className="w-full max-h-[200px] object-contain"
          style={{ imageRendering: "pixelated" }}
        />

        {/* Pixel divider */}
        <div className="flex gap-1 justify-center">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="w-2 h-1 bg-[#4f8ef7] opacity-60" />
          ))}
        </div>

        <p
          className="text-[#88aaff] text-[9px] p-8 text-center tracking-widest uppercase"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          Enter Password
        </p>

        <div className="flex flex-col gap-2 items-center">
          <div className="relative w-full">
            {/* Outer pixel frame */}
            <div className={`p-[3px] ${error ? "bg-red-500" : "bg-[#4f8ef7]"}`}>
              <div className="bg-[#050510] p-[2px]">
                <input
                  autoFocus
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  className="w-full bg-[#050510] text-[#4f8ef7] px-3 py-3 text-[10px] outline-none placeholder-[#1a2a5e]"
                  style={{
                    fontFamily: "'Press Start 2P', monospace",
                    caretColor: "#4f8ef7",
                    textShadow: "0 0 4px #4f8ef7",
                  }}
                />
              </div>
            </div>

            {/* Glow effect */}
            <div
              className={`absolute inset-0 blur-md opacity-30 ${error ? "bg-red-500" : "bg-[#4f8ef7]"}`}
            />
          </div>

          {/* Error message */}
          {error && (
            <p
              className="text-red-400 text-[8px] text-center animate-pulse"
              style={{
                fontFamily: "'Press Start 2P', monospace",
                textShadow: "0 0 4px red",
              }}
            >
              ✕ ACCESS DENIED
            </p>
          )}
        </div>

        <button
          onClick={submit}
          className="relative bg-[#4f8ef7] text-[#0a0a1a] text-[10px] py-3 px-4 border-2 border-[#88ccff] active:translate-y-1 transition-transform w-full"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            boxShadow: "0 4px 0 #1a2a6e",
          }}
        >
          ▶ ENTER ROOM
        </button>

        <p
          className="text-[#2a3a6e] text-[7px] text-center"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          © DREAMSPACE v0.1
        </p>
      </div>
    </div>
  );
}
