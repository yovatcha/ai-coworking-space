# 🚀 AI Co-Working 8-bit Platform (MVP)

## 🧠 Project Vision

Create a browser-based 2D pixel (8-bit) co-working space where:

- Users control avatars in a virtual office
- NPCs represent AI agents (Secretary first)
- Users walk to NPCs and interact via chat
- Multiple teammates can be present in real-time

---

## ✅ Decisions (Locked)

- Multiplayer in MVP: **YES**
- Platform: **Web only**
- Auth: **NextAuth**
- First AI role: **Secretary**
- Persistence: **YES (PostgreSQL + Prisma)**

---

## 🎯 MVP Scope (Updated)

- Single map (office room)
- Multiplayer avatars (basic presence + movement)
- 1 NPC (Secretary)
- Chat interaction with AI
- Create & list tasks (persisted)

---

## 🏗️ Tech Stack

### Frontend

- Next.js (App Router)
- React
- Phaser (game canvas)

### Backend

- Next.js API routes
- Socket.IO server (for realtime)

### Database

- PostgreSQL
- Prisma ORM

### AI

- OpenAI API

### Realtime (Required)

- Socket.IO (movement, presence, simple chat)

### Auth

- NextAuth (Google or Credentials)

---

## 📁 Project Structure

```
root/
├── app/
│   ├── page.tsx
│   ├── api/
│   │   ├── chat/route.ts
│   │   ├── tasks/route.ts
│   │   └── auth/[...nextauth]/route.ts
│
├── components/
│   ├── GameCanvas.tsx
│   ├── ChatPanel.tsx
│   └── UI/
│
├── game/
│   ├── scenes/
│   │   └── MainScene.ts
│   ├── entities/
│   │   ├── Player.ts
│   │   ├── RemotePlayer.ts
│   │   └── NPC.ts
│   └── config.ts
│
├── server/
│   └── socket.ts
│
├── lib/
│   ├── prisma.ts
│   └── ai.ts
│
├── prisma/
│   └── schema.prisma
│
└── public/
    ├── assets/
```

---

## ⚙️ Setup Steps

### 1. Create Next.js App

```
npx create-next-app@latest ai-cowork --typescript
cd ai-cowork
```

### 2. Install Dependencies

```
npm install phaser prisma @prisma/client openai socket.io socket.io-client next-auth
```

---

### 3. Setup Prisma

```
npx prisma init
```

.env

```
DATABASE_URL="postgresql://user:password@localhost:5432/aicowork"
```

---

### 4. Prisma Schema

```
model User {
  id    String @id @default(cuid())
  email String @unique
}

model Task {
  id        String   @id @default(cuid())
  title     String
  status    String
  createdAt DateTime @default(now())
}
```

Run:

```
npx prisma migrate dev
```

---

### 5. Socket.IO Server (Basic)

`server/socket.ts`

```ts
import { Server } from "socket.io";

export function initSocket(server: any) {
  const io = new Server(server);

  io.on("connection", (socket) => {
    socket.on("move", (data) => {
      socket.broadcast.emit("playerMove", {
        id: socket.id,
        ...data,
      });
    });
  });
}
```

---

### 6. Phaser + Multiplayer Hook (Concept)

- Emit movement on update
- Listen for other players

---

### 7. AI API Route

`app/api/chat/route.ts`

```ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { message } = await req.json();

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful secretary" },
      { role: "user", content: message },
    ],
  });

  return NextResponse.json({
    reply: completion.choices[0].message.content,
  });
}
```

---

## 🎮 Interaction Flow

1. Player moves (emit via socket)
2. Others receive and render
3. Walk to NPC
4. Press "E"
5. Open Chat Panel
6. AI responds
7. Save task to DB

---

## 🎯 MVP Milestone Checklist

- [ ] Multiplayer movement sync
- [ ] Player + remote players render
- [ ] NPC interaction works
- [ ] Chat UI works
- [ ] AI responds
- [ ] Task saved to DB

---

## 🚀 Next Steps

- Room system (multiple spaces)
- Voice chat
- More AI roles
- Task dashboard UI

---

## 💡 Dev Tips

- Sync only position (x,y) for MVP
- Avoid physics engine
- Keep map tiny

---

## 🎉 Start

```
npm run dev
```

👉 First goal: see 2 players moving in same room.
