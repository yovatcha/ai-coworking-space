"use client";
import dynamic from "next/dynamic";

const GameCanvas = dynamic(() => import("@/components/GameCanvas"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a1a2e",
        color: "white",
      }}
    >
      Loading game engine...
    </div>
  ),
});

export default function Home() {
  return (
    <main>
      <GameCanvas />
    </main>
  );
}
