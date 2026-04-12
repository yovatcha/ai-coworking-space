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
        className="relative z-20 flex flex-col gap-5 p-6 w-[340px]
             bg-[#0b0f1a]/90 backdrop-blur-md
             border border-[#2a3a6a]
             rounded-2xl"
        style={{
          boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
        }}
      >
        {/* subtle glow border */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-[#4f8ef7]/20 pointer-events-none" />

        <img
          src="/assets/dreamspace-banner.png"
          alt="Dream Space"
          className="w-full max-h-[160px] object-contain opacity-90"
          style={{ imageRendering: "pixelated" }}
        />

        {/* modern divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-[#4f8ef7]/40 to-transparent" />

        <p
          className="text-[#88aaff] text-[10px] text-center tracking-widest uppercase"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          Enter Password
        </p>

        {/* INPUT */}
        <div className="flex flex-col gap-2">
          <div className="relative">
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
              className={`
          w-full px-4 py-3 text-sm
          bg-[#050510] text-[#e6ecff]
          rounded-lg border
          outline-none transition-all duration-200
          placeholder:text-[#2a3a6e]
          ${
            error
              ? "border-red-500 focus:ring-2 focus:ring-red-500/30"
              : "border-[#2a3a6a] focus:border-[#4f8ef7] focus:ring-2 focus:ring-[#4f8ef7]/30"
          }
        `}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                letterSpacing: "0.05em",
              }}
            />

            {/* tiny pixel accent */}
            <div
              className={`absolute top-0 left-0 h-[2px] w-full rounded-t-lg
        ${error ? "bg-red-500" : "bg-[#4f8ef7]"} opacity-70`}
            />
          </div>

          {error && (
            <p
              className="text-red-400 text-[9px] text-center"
              style={{ fontFamily: "'Press Start 2P', monospace" }}
            >
              Incorrect password
            </p>
          )}
        </div>

        {/* BUTTON */}
        <button
          onClick={submit}
          className="
      w-full py-3 text-[11px]
      rounded-lg
      bg-gradient-to-b from-[#5fa0ff] to-[#4f8ef7]
      text-[#0a0a1a]
      border border-[#88ccff]/40
      transition-all duration-150
      hover:brightness-110
      active:scale-[0.98]
    "
          style={{
            fontFamily: "'Press Start 2P', monospace",
          }}
        >
          ENTER ROOM
        </button>

        <p
          className="text-[#2a3a6e] text-[8px] text-center"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          © DREAMSPACE v0.1
        </p>
      </div>
    </div>
  );
}
