<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# 🤖 AGENTS.md – AI Coding Guidelines

## 🎯 Purpose

This file defines how AI coding assistants (Cursor, Copilot, Qoder, etc.) should behave when working on this project.

The goal is to:

* Keep code clean and consistent
* Avoid over-engineering
* Focus on MVP delivery

---

## 🧠 Project Context

This is a:

* 2D pixel (8-bit) co-working platform
* Built with Phaser + Next.js
* Multiplayer using Socket.IO
* AI agents (starting with Secretary)

---

## ⚙️ General Rules

### 1. Keep It Simple

* Always prefer simple solutions
* Do NOT introduce complex patterns unless explicitly asked
* MVP first, optimization later

---

### 2. Follow Existing Structure

* Reuse existing folders and patterns
* Do not create new abstractions unless necessary

---

### 3. Small Iterations Only

* Implement ONE feature at a time
* Do not modify unrelated files

---

### 4. No Assumptions

* If unclear, ASK before implementing
* Do not invent requirements

---

## 🎮 Game Layer Rules (Phaser)

### Player

* Only control local player
* Movement uses basic velocity (no physics engine complexity)

### Remote Players

* Sync ONLY:

  * x
  * y
* No prediction, no interpolation (MVP)

### NPC

* Static position (no movement in MVP)
* Trigger interaction via key ("E")

---

## 🔌 Realtime Rules (Socket.IO)

### Allowed Events

* "move" → send player position
* "playerMove" → receive other players

### Restrictions

* Do NOT send data every frame
* Only send when position changes

---

## 🤖 AI Agent Rules

### Role: Secretary (MVP)

Responsibilities:

* Create tasks
* Answer simple questions

### Behavior

* Be concise
* Be helpful
* Do not hallucinate data

---

## 🗄️ Backend Rules

### API Routes

* Keep logic minimal
* No heavy business logic inside route

### Database

* Use Prisma only
* Do not write raw SQL unless needed

---

## 🧩 UI Rules

* Keep UI minimal
* No complex design system
* Focus on functionality

---

## ❌ What NOT To Do

* Do not add authentication flows beyond NextAuth setup
* Do not introduce Redux, Zustand, or global state libraries
* Do not add animations unless required
* Do not optimize prematurely

---

## ✅ Preferred Coding Style

* Functional components (React)
* Clear variable names
* Short functions
* Minimal comments (only when necessary)

---

## 📌 Task Execution Format

When implementing a task, AI should:

1. Restate the task briefly
2. Provide only necessary code
3. Avoid long explanations

---

## 🚀 Current Priority

1. Player movement (DONE)
2. Multiplayer sync (IN PROGRESS)
3. NPC interaction
4. AI chat

---

## 🧠 Key Principle

> This is NOT a full game.
> This is a productivity tool with a game interface.

Focus on interaction, not game complexity.

---

## 🎯 End Goal

A simple, fun environment where:

* Users walk to AI agents
* Talk to them
* Get work done

---

## 💬 Instruction to AI

If you are unsure about anything:
👉 ASK BEFORE CODING

Do not guess.
