"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import LoginPage, { isAuthenticated } from "@/components/LoginPage";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#1a1a2e", color: "white" }}>
      Loading game engine...
    </div>
  ),
});

export default function Home() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

  // Avoid flash before localStorage is checked
  if (authed === null) return null;

  if (!authed) return <LoginPage onSuccess={() => setAuthed(true)} />;

  return <main><GameCanvas /></main>;
}
