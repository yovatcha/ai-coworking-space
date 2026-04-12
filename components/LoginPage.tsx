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
    <div style={styles.bg}>
      <div style={styles.box}>
        <div style={styles.title}>🏢 AI Co-working Space</div>
        <div style={styles.subtitle}>Enter password to join the room</div>
        <input
          autoFocus
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Password"
          style={{ ...styles.input, borderColor: error ? "#ff4f4f" : "#4f8ef7" }}
        />
        {error && <div style={styles.error}>Wrong password</div>}
        <button onClick={submit} style={styles.btn}>Enter</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  bg: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a2e",
  },
  box: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "32px",
    backgroundColor: "#12122a",
    border: "2px solid #4f8ef7",
    borderRadius: "12px",
    width: "320px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
  },
  title: {
    color: "#fff",
    fontSize: "18px",
    fontFamily: "monospace",
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    color: "#aaa",
    fontSize: "13px",
    fontFamily: "monospace",
    textAlign: "center",
  },
  input: {
    backgroundColor: "#1e1e3a",
    border: "1px solid #4f8ef7",
    borderRadius: "6px",
    color: "#fff",
    padding: "10px 12px",
    fontSize: "14px",
    fontFamily: "monospace",
    outline: "none",
  },
  error: {
    color: "#ff4f4f",
    fontSize: "12px",
    fontFamily: "monospace",
    textAlign: "center",
  },
  btn: {
    backgroundColor: "#4f8ef7",
    border: "none",
    borderRadius: "6px",
    color: "#fff",
    padding: "10px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: "14px",
    marginTop: "4px",
  },
};
