"use client";

import { useState } from "react";

const SESSION_KEY = "cowork_auth";
const USER_ID_KEY = "cowork_user_id";

export function isAuthenticated() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SESSION_KEY) === "true";
}

export function getUserId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

export default function LoginPage({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!password || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        localStorage.setItem(SESSION_KEY, "true");
        onSuccess();
      } else {
        setError(true);
        setPassword("");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .login-page-bg {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #1a1c2c;
          background-image: radial-gradient(circle, #2a2d3e 1px, transparent 1px);
          background-size: 16px 16px;
          font-family: 'Press Start 2P', monospace;
        }

        /* page-level scanlines */
        .login-page-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent, transparent 3px,
            rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px
          );
          z-index: 0;
        }

        .login-video {
          position: absolute;
          width: 120%; height: 120%;
          top: -10%; left: -10%;
          object-fit: cover;
          z-index: 0;
          opacity: 0.25;
          image-rendering: pixelated;
        }

        .login-video-overlay {
          position: absolute;
          inset: 0;
          background: rgba(10,10,26,0.55);
          z-index: 1;
        }

        /* ── Main pixel box ── */
        .login-box {
          position: relative;
          z-index: 2;
          width: 340px;
          display: flex;
          flex-direction: column;
          background: #1a1c2c;
          border: 4px solid #5a6988;
          box-shadow:
            -4px -4px 0 0 #8faabb,
             4px  4px 0 0 #0d0f1a,
             8px  8px 0 0 #000;
          overflow: hidden;
        }

        /* box-level scanlines */
        .login-box::after {
          content: '';
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(
            0deg,
            transparent, transparent 3px,
            rgba(0,0,0,0.10) 3px, rgba(0,0,0,0.10) 4px
          );
          z-index: 10;
        }

        /* ── Title bar ── */
        .login-titlebar {
          background: #0d0f1a;
          border-bottom: 4px solid #000;
          padding: 6px 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }
        .titlebar-dot {
          width: 8px; height: 8px;
          box-shadow: 1px 1px 0 #000;
        }
        .titlebar-label {
          font-size: 7px;
          color: #5a6988;
          text-shadow: 1px 1px 0 #000;
          margin-left: 6px;
          letter-spacing: 0.05em;
        }

        /* ── Banner ── */
        .login-banner {
          background: #050510;
          padding: 20px 16px 14px;
          border-bottom: 4px solid #000;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .login-banner-img {
          width: 100%;
          max-height: 120px;
          object-fit: contain;
          image-rendering: pixelated;
          opacity: 0.95;
        }
        .login-banner-stars {
          display: flex;
          gap: 10px;
        }
        .login-star {
          font-size: 8px;
          color: #f7a84f;
          text-shadow: 1px 1px 0 #000;
          animation: pixelTwinkle 1.5s step-start infinite;
        }
        .login-star.blue {
          font-size: 6px;
          color: #4f8ef7;
          animation-delay: 0.5s;
        }
        @keyframes pixelTwinkle {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.15; }
        }

        /* ── Pixel divider ── */
        .pixel-divider {
          display: flex;
          flex-direction: column;
        }
        .pixel-divider-top    { height: 3px; background: #2a3a6a; }
        .pixel-divider-mid    { height: 2px; background: #4f8ef7; opacity: 0.4; }
        .pixel-divider-bottom { height: 3px; background: #0d0f1a; }

        /* ── Body ── */
        .login-body {
          padding: 16px 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          background: #1a1c2c;
          background-image: radial-gradient(circle, #2a2d3e 1px, transparent 1px);
          background-size: 12px 12px;
        }
        .login-label {
          font-size: 8px;
          color: #88aaff;
          text-align: center;
          text-shadow: 2px 2px 0 #000;
          letter-spacing: 0.1em;
          margin: 0;
        }

        /* ── Input ── */
        .login-input-wrap { position: relative; }
        .login-input {
          width: 100%;
          padding: 11px 14px;
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          letter-spacing: 0.15em;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.05s, background 0.05s;
        }
        .login-input.normal {
          background: #050510;
          color: #e6ecff;
          border: 3px solid #2a3a6a;
          box-shadow: inset 2px 2px 0 #000, 3px 3px 0 #000;
        }
        .login-input.normal:focus {
          border-color: #4f8ef7;
          box-shadow: inset 2px 2px 0 #000, 3px 3px 0 #000, 0 0 0 3px rgba(79,142,247,0.2);
        }
        .login-input.has-error {
          background: #1a0505;
          color: #ff8888;
          border: 3px solid #c0392b;
          box-shadow: inset 2px 2px 0 #000, 3px 3px 0 #000, 0 0 0 3px rgba(192,57,43,0.25);
          animation: pixelShake 0.3s step-start;
        }
        .login-input::placeholder { color: #2a3a6a; }

        .login-input-accent {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
        }

        @keyframes pixelShake {
          0%   { transform: translateX(0); }
          20%  { transform: translateX(-4px); }
          40%  { transform: translateX(4px); }
          60%  { transform: translateX(-4px); }
          80%  { transform: translateX(4px); }
          100% { transform: translateX(0); }
        }

        /* ── Error msg ── */
        .login-error {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 2px;
        }
        .login-error-icon { font-size: 10px; }
        .login-error-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #e74c3c;
          text-shadow: 1px 1px 0 #000;
          margin: 0;
          letter-spacing: 0.05em;
        }

        /* ── Submit button ── */
        .login-btn {
          width: 100%;
          padding: 12px 0;
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          letter-spacing: 0.08em;
          background: #4f8ef7;
          color: #000;
          border: 3px solid #88aaff;
          box-shadow: 3px 3px 0 #000, -1px -1px 0 #88aaff;
          cursor: pointer;
          transition: none;
        }
        .login-btn:hover {
          transform: translate(1px, 1px);
          box-shadow: 2px 2px 0 #000;
        }
        .login-btn:active {
          transform: translate(2px, 2px);
          box-shadow: none;
        }

        /* ── Footer ── */
        .login-footer {
          background: #0d0f1a;
          border-top: 4px solid #000;
          padding: 6px 10px;
          text-align: center;
        }
        .login-footer-text {
          font-size: 6px;
          color: #2a3a6e;
          text-shadow: 1px 1px 0 #000;
          letter-spacing: 0.05em;
        }
      `}</style>

      <div className="login-page-bg">
        {/* Background video */}
        <video autoPlay loop muted playsInline className="login-video">
          <source src="/assets/video/login-bg.mp4" type="video/mp4" />
        </video>
        <div className="login-video-overlay" />

        {/* ── Pixel login box ── */}
        <div className="login-box">

          {/* Title bar */}
          <div className="login-titlebar">
            <div className="titlebar-dot" style={{ background: "#c0392b" }} />
            <div className="titlebar-dot" style={{ background: "#f7a84f" }} />
            <div className="titlebar-dot" style={{ background: "#39d353" }} />
            <span className="titlebar-label">DREAMSPACE — LOGIN</span>
          </div>

          {/* Banner */}
          <div className="login-banner">
            <img
              src="/assets/dreamspace-banner.png"
              alt="Dream Space"
              className="login-banner-img"
            />
            <div className="login-banner-stars">
              <span className="login-star">★</span>
              <span className="login-star blue">★</span>
              <span className="login-star" style={{ animationDelay: "1s" }}>★</span>
            </div>
          </div>

          {/* Pixel divider */}
          <div className="pixel-divider">
            <div className="pixel-divider-top" />
            <div className="pixel-divider-mid" />
            <div className="pixel-divider-bottom" />
          </div>

          {/* Body */}
          <div className="login-body">
            <p className="login-label">ENTER PASSWORD</p>

            {/* Input */}
            <div className="flex flex-col gap-2">
              <div className="login-input-wrap">
                <input
                  autoFocus
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(false); }}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                  placeholder="••••••••"
                  className={`login-input ${error ? "has-error" : "normal"}`}
                />
                <div
                  className="login-input-accent"
                  style={{ background: error ? "#e74c3c" : "#4f8ef7", opacity: error ? 1 : 0.8 }}
                />
              </div>

              {error && (
                <div className="login-error">
                  <span className="login-error-icon">⚠</span>
                  <p className="login-error-text">INCORRECT PASSWORD</p>
                </div>
              )}
            </div>

            {/* Button */}
            <button className="login-btn" onClick={submit} disabled={loading}>
              {loading ? "▶ CHECKING..." : "▶ ENTER ROOM"}
            </button>
          </div>

          {/* Footer */}
          <div className="login-footer">
            <span className="login-footer-text">© DREAMSPACE v0.1</span>
          </div>

        </div>
      </div>
    </>
  );
}