"use client";

import React, { useEffect, useRef, useState } from "react";
import { getMemberId } from "@/game/identity";

interface Requirement {
  id: number;
  projectId: number;
  text: string;
  addedBy: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  docName: string;
  docText: string;
  addedBy: string;
  requirements: Requirement[];
}

interface Message {
  from: "npc" | "user";
  text: string;
  time?: string;
}

interface SecretaryPanelProps {
  onClose: () => void;
  userId?: string;
}

const PF = "'Press Start 2P', monospace";
const SF = "'Sarabun', sans-serif";
const NPC_ID = "secretary";
const GREETING = "สวัสดีค่ะ ฉันคือ Secretary เลขาของทีม ถามเรื่อง project ของทีมหรือเล่า requirement ให้ฉันจดได้เลยค่ะ";
const MAX_FILE_BYTES = 200 * 1024;

function getTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function stripMd(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/`([^`]+)`/g, "$1");
}

export default function SecretaryPanel({ onClose, userId }: SecretaryPanelProps) {
  const [view, setView] = useState<"chat" | "projects" | "add">("chat");

  // ── Chat state ──
  const [messages, setMessages] = useState<Message[]>([
    { from: "npc", text: GREETING, time: getTime() },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Projects state ──
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [descDraft, setDescDraft] = useState("");
  const [newReq, setNewReq] = useState("");
  const [detailStatus, setDetailStatus] = useState("");

  // ── Add state ──
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [newDocText, setNewDocText] = useState("");
  const [addStatus, setAddStatus] = useState("");

  // Load chat history on mount
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/chat-history?userId=${userId}&npcId=${NPC_ID}`)
      .then((r) => r.json())
      .then((data: { role: string; content: string; createdAt: string }[]) => {
        if (!Array.isArray(data) || data.length === 0) return;
        setMessages(
          data.map((m) => ({
            from: m.role === "user" ? "user" : "npc",
            text: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }))
        );
      })
      .catch(() => {});
  }, [userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const loadProjects = () => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        setProjects(data);
        setActiveProject((prev) => (prev ? data.find((p: Project) => p.id === prev.id) ?? null : null));
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (view === "projects") loadProjects();
  }, [view]);

  const saveMessage = (role: string, content: string) => {
    if (!userId || !content) return;
    fetch("/api/chat-history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, npcId: NPC_ID, role, content }),
    }).catch(() => {});
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { from: "user", text, time: getTime() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    saveMessage("user", text);

    const apiMessages = nextMessages.map((m) => ({
      role: m.from === "user" ? "user" : "assistant",
      content: m.text,
    }));

    let npcText = "";
    const npcTime = getTime();
    setIsTyping(true);
    setMessages((prev) => [...prev, { from: "npc", text: "", time: npcTime }]);

    try {
      const res = await fetch("/api/secretary/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, npcId: NPC_ID, memberId: getMemberId() }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        npcText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { from: "npc", text: npcText, time: npcTime };
          return updated;
        });
      }
      if (!npcText) {
        npcText = "บันทึกเรียบร้อยค่ะ ✓";
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { from: "npc", text: npcText, time: npcTime };
          return updated;
        });
      }
    } catch {
      npcText = "เกิดข้อผิดพลาด ลองใหม่อีกครั้งค่ะ";
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { from: "npc", text: npcText, time: npcTime };
        return updated;
      });
    }
    setIsTyping(false);
    saveMessage("assistant", npcText);
  };

  const readFile = async (
    file: File | undefined,
    onOk: (name: string, text: string) => void,
    onErr: (msg: string) => void
  ) => {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      onErr("ไฟล์ใหญ่เกิน 200KB");
      return;
    }
    onOk(file.name, await file.text());
  };

  const handleAddProject = async () => {
    if (!newName.trim()) {
      setAddStatus("กรุณาใส่ชื่อ project");
      return;
    }
    setAddStatus("กำลังบันทึก...");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc.trim(),
          docName: newDocName,
          docText: newDocText,
          addedBy: getMemberId(),
        }),
      });
      const data = await res.json();
      if (data.error) {
        setAddStatus("บันทึกไม่สำเร็จ: " + data.error);
        return;
      }
      setNewName("");
      setNewDesc("");
      setNewDocName("");
      setNewDocText("");
      setAddStatus("");
      setView("projects");
    } catch {
      setAddStatus("เชื่อมต่อไม่ได้");
    }
  };

  const handleSaveDesc = async () => {
    if (!activeProject) return;
    setDetailStatus("กำลังบันทึก...");
    try {
      await fetch("/api/projects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: activeProject.id, description: descDraft }),
      });
      setDetailStatus("บันทึกแล้ว ✓");
      setTimeout(() => setDetailStatus(""), 2000);
      loadProjects();
    } catch {
      setDetailStatus("เชื่อมต่อไม่ได้");
    }
  };

  const handleAddRequirement = async () => {
    if (!activeProject || !newReq.trim()) return;
    try {
      await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: activeProject.id, text: newReq.trim(), addedBy: getMemberId() }),
      });
      setNewReq("");
      loadProjects();
    } catch {
      setDetailStatus("เชื่อมต่อไม่ได้");
    }
  };

  const handleDeleteRequirement = async (id: number) => {
    await fetch(`/api/requirements?id=${id}`, { method: "DELETE" }).catch(() => {});
    loadProjects();
  };

  const handleUploadDoc = async (file: File | undefined) => {
    if (!activeProject) return;
    readFile(
      file,
      async (name, text) => {
        setDetailStatus("กำลังอัปโหลด...");
        try {
          await fetch("/api/projects", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: activeProject.id, docName: name, docText: text }),
          });
          setDetailStatus("อัปโหลดแล้ว ✓");
          setTimeout(() => setDetailStatus(""), 2000);
          loadProjects();
        } catch {
          setDetailStatus("เชื่อมต่อไม่ได้");
        }
      },
      setDetailStatus
    );
  };

  const handleDeleteProject = async (id: number) => {
    await fetch(`/api/projects?id=${id}`, { method: "DELETE" }).catch(() => {});
    setConfirmDeleteId(null);
    setActiveProject(null);
    loadProjects();
  };

  return (
    <>
      <style>{`
        .sc-panel {
          width: 680px; height: 420px; display: flex; flex-direction: column;
          background: #1a1c2c; font-family: ${PF}; image-rendering: pixelated;
          border: 4px solid #5a6988;
          box-shadow: -4px -4px 0 0 #8faabb, 4px 4px 0 0 #0d0f1a, 6px 6px 0 0 #000;
          position: relative;
        }
        .sc-panel::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.10) 3px,rgba(0,0,0,0.10) 4px);
          z-index: 10;
        }
        .sc-header { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #16213e; border-bottom: 4px solid #0d0f1a; flex-shrink: 0; }
        .sc-avatar { width: 32px; height: 32px; background: #0f3460; border: 3px solid #4f8ef7; box-shadow: 2px 2px 0 #000; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .sc-header-name { font-size: 9px; color: #e8f4fd; text-shadow: 2px 2px 0 #000; }
        .sc-header-status { font-size: 7px; color: #39d353; display: flex; align-items: center; gap: 5px; }
        .sc-dot { width: 6px; height: 6px; background: #39d353; box-shadow: 1px 1px 0 #000; animation: scBlink 1.4s step-start infinite; }
        @keyframes scBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        .sc-close { width: 24px; height: 24px; background: #c0392b; border: 3px solid #e74c3c; box-shadow: 2px 2px 0 #000; color: #fff; font-family: ${PF}; font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-left: auto; }
        .sc-close:hover { background: #e74c3c; transform: translate(1px,1px); box-shadow: 1px 1px 0 #000; }
        .sc-tabs { display: flex; background: #10121f; border-bottom: 3px solid #000; flex-shrink: 0; }
        .sc-tab { flex: 1; padding: 6px 4px; font-family: ${PF}; font-size: 7px; color: #4a5a8a; background: transparent; border: none; border-right: 2px solid #000; cursor: pointer; letter-spacing: 0.03em; }
        .sc-tab:last-child { border-right: none; }
        .sc-tab.active { background: #1a1c2c; color: #4f8ef7; }
        .sc-tab:hover:not(.active) { color: #88aaff; }
        .sc-body { flex: 1; overflow-y: auto; padding: 12px; background: #1a1c2c; background-image: radial-gradient(circle, #2a2d3e 1px, transparent 1px); background-size: 12px 12px; display: flex; flex-direction: column; }
        .sc-body::-webkit-scrollbar { width: 8px; }
        .sc-body::-webkit-scrollbar-track { background: #0d0f1a; }
        .sc-body::-webkit-scrollbar-thumb { background: #4f8ef7; border: 2px solid #0d0f1a; }
        .sc-label { font-family: ${PF}; font-size: 7px; color: #88aaff; margin-bottom: 4px; display: block; }
        .sc-input { width: 100%; padding: 7px 8px; margin-bottom: 10px; font-family: ${SF}; font-size: 14px; background: #0d0f1a; color: #a8d8ea; border: 3px solid #2a3a6a; box-shadow: inset 2px 2px 0 #000; outline: none; box-sizing: border-box; }
        .sc-input:focus { border-color: #4f8ef7; }
        .sc-btn { padding: 8px 14px; font-family: ${PF}; font-size: 7px; background: #16213e; color: #a8d8ea; border: 3px solid #4f8ef7; box-shadow: 3px 3px 0 #000; cursor: pointer; letter-spacing: 0.05em; }
        .sc-btn:hover { transform: translate(1px,1px); box-shadow: 2px 2px 0 #000; }
        .sc-btn:active { transform: translate(2px,2px); box-shadow: none; }
        .sc-btn.primary { background: #4f8ef7; color: #000; }
        .sc-card { padding: 8px 10px; margin-bottom: 8px; background: #10121f; border: 2px solid #2a3a6a; box-shadow: 2px 2px 0 #000; cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
        .sc-card:hover { border-color: #4f8ef7; background: #141830; }
        .sc-card-name { font-family: ${PF}; font-size: 8px; color: #e8f4fd; }
        .sc-card-sub { font-family: ${SF}; font-size: 12px; color: #4a5a8a; }
        .sc-badge { font-family: ${PF}; font-size: 6px; color: #39d353; border: 2px solid #39d353; padding: 2px 4px; margin-left: 6px; }
        .sc-status { font-family: ${SF}; font-size: 13px; color: #88aaff; margin-top: 6px; }
        .sc-text { font-family: ${SF}; font-size: 14px; color: #a8d8ea; line-height: 1.7; }
        .sc-req-row { display: flex; align-items: center; gap: 6px; padding: 5px 8px; margin-bottom: 6px; background: #10121f; border: 2px solid #2a3a6a; }
        .sc-req-text { flex: 1; font-family: ${SF}; font-size: 13px; color: #a8d8ea; line-height: 1.5; word-break: break-word; }
        .sc-req-by { font-family: ${PF}; font-size: 6px; color: #4a5a8a; flex-shrink: 0; }
        .sc-del { padding: 3px 6px; font-family: ${PF}; font-size: 6px; background: #3b0a0a; border: 2px solid #c0392b; color: #e57373; box-shadow: 2px 2px 0 #000; cursor: pointer; flex-shrink: 0; }
        .sc-del:hover { transform: translate(1px,1px); box-shadow: 1px 1px 0 #000; }
        .sc-file-btn { display: inline-block; }
        .sc-file-btn input { display: none; }
        .sc-chat-body { display: flex; flex-direction: column; height: 100%; gap: 8px; }
        .sc-chat-msgs { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; padding-bottom: 4px; }
        .sc-chat-msgs::-webkit-scrollbar { width: 6px; }
        .sc-chat-msgs::-webkit-scrollbar-thumb { background: #4f8ef7; }
        .sc-msg { padding: 7px 10px; max-width: 85%; font-family: ${SF}; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
        .sc-msg.user { background: #0f3460; color: #e8f4fd; border: 2px solid #88aaff; align-self: flex-end; box-shadow: 2px 2px 0 #000; }
        .sc-msg.npc { background: #16213e; color: #a8d8ea; border: 2px solid #4f8ef7; align-self: flex-start; box-shadow: 2px 2px 0 #000; }
        .sc-msg-time { font-size: 6px; font-family: ${PF}; color: #4a5568; margin-top: 3px; }
        .sc-chat-footer { display: flex; gap: 6px; flex-shrink: 0; }
        .sc-chat-input { flex: 1; padding: 7px 8px; font-family: ${SF}; font-size: 14px; background: #0d0f1a; color: #a8d8ea; border: 3px solid #2a3a6a; outline: none; }
        .sc-chat-input:focus { border-color: #4f8ef7; }
        .sc-typing-dot { display: inline-block; width: 6px; height: 6px; background: #4f8ef7; box-shadow: 1px 1px 0 #000; animation: scTyping 0.8s step-start infinite; }
        @keyframes scTyping { 0%,100%{opacity:0.2} 50%{opacity:1} }
      `}</style>

      <div className="sc-panel">
        <div className="sc-header">
          <div className="sc-avatar">🤖</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="sc-header-name">SECRETARY</span>
            <span className="sc-header-status"><span className="sc-dot" />ONLINE</span>
          </div>
          <button className="sc-close" onClick={onClose}>X</button>
        </div>

        <div className="sc-tabs">
          {(["chat", "projects", "add"] as const).map((t) => (
            <button key={t} className={`sc-tab${view === t ? " active" : ""}`} onClick={() => setView(t)}>
              {t === "chat" ? "CHAT" : t === "projects" ? "PROJECTS" : "+ ADD"}
            </button>
          ))}
        </div>

        <div className="sc-body">

          {view === "chat" && (
            <div className="sc-chat-body">
              <div className="sc-chat-msgs">
                {messages.map((msg, i) => {
                  const isEmpty = msg.text === "";
                  return (
                    <div key={i} className={`sc-msg ${msg.from}`}>
                      {isEmpty ? (
                        <span style={{ display: "flex", gap: 5, alignItems: "center" }}>
                          {[0, 0.3, 0.6].map((d, di) => (
                            <span key={di} className="sc-typing-dot" style={{ animationDelay: `${d}s` }} />
                          ))}
                        </span>
                      ) : (
                        <>
                          {stripMd(msg.text)}
                          {msg.time && <div className="sc-msg-time">{msg.time}</div>}
                        </>
                      )}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="sc-chat-footer">
                <input
                  className="sc-chat-input"
                  placeholder="พิมพ์ข้อความ..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send();
                    if (e.key === "Escape") { setInput(""); onClose(); }
                  }}
                  disabled={isTyping}
                />
                <button className="sc-btn primary" onClick={send} disabled={isTyping}>
                  {isTyping ? "..." : "SEND"}
                </button>
              </div>
            </div>
          )}

          {view === "add" && (
            <>
              <span className="sc-label">PROJECT NAME</span>
              <input className="sc-input" placeholder="เช่น AI Co-working" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <span className="sc-label">DESCRIPTION</span>
              <input className="sc-input" placeholder="ทำอะไร สั้นๆ" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
              <span className="sc-label">PREFILL DOC (.md / .txt — optional)</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <label className="sc-btn sc-file-btn">
                  {newDocName ? "CHANGE FILE" : "CHOOSE FILE"}
                  <input
                    type="file"
                    accept=".md,.txt"
                    onChange={(e) => {
                      readFile(e.target.files?.[0], (name, text) => {
                        setNewDocName(name);
                        setNewDocText(text);
                        setAddStatus("");
                      }, setAddStatus);
                      e.target.value = "";
                    }}
                  />
                </label>
                {newDocName && <span className="sc-text" style={{ fontSize: 12 }}>{newDocName}</span>}
              </div>
              <button className="sc-btn primary" onClick={handleAddProject}>SAVE PROJECT</button>
              {addStatus && <div className="sc-status">{addStatus}</div>}
            </>
          )}

          {view === "projects" && !activeProject && (
            <>
              {projects.length === 0 && (
                <div className="sc-text">ยังไม่มี project ค่ะ ไปที่แท็บ + ADD หรือเล่าให้ฟังในแชทได้เลย</div>
              )}
              {projects.map((p) => (
                <div key={p.id} className="sc-card" onClick={() => { setActiveProject(p); setDescDraft(p.description); setDetailStatus(""); setNewReq(""); }}>
                  <div>
                    <div className="sc-card-name">
                      {p.name}
                      {p.docName && <span className="sc-badge">DOC</span>}
                    </div>
                    <div className="sc-card-sub">
                      {p.requirements.length} requirements · {p.status} · by {p.addedBy}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: PF, fontSize: 8, color: "#4f8ef7" }}>▶</span>
                    <button className="sc-del" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }}>DEL</button>
                  </div>
                </div>
              ))}
            </>
          )}

          {view === "projects" && activeProject && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <button className="sc-btn" onClick={() => setActiveProject(null)}>◀ BACK</button>
                <span style={{ fontFamily: PF, fontSize: 8, color: "#e8f4fd" }}>{activeProject.name}</span>
                <label className="sc-btn sc-file-btn" style={{ marginLeft: "auto" }}>
                  UPLOAD .MD/.TXT
                  <input
                    type="file"
                    accept=".md,.txt"
                    onChange={(e) => { handleUploadDoc(e.target.files?.[0]); e.target.value = ""; }}
                  />
                </label>
              </div>
              {activeProject.docName && (
                <div className="sc-text" style={{ fontSize: 12, marginBottom: 8 }}>
                  📄 {activeProject.docName} ({activeProject.docText.length.toLocaleString()} chars)
                </div>
              )}
              <span className="sc-label">DESCRIPTION</span>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <input className="sc-input" style={{ marginBottom: 0 }} value={descDraft} onChange={(e) => setDescDraft(e.target.value)} />
                <button className="sc-btn" onClick={handleSaveDesc}>SAVE</button>
              </div>
              <span className="sc-label">REQUIREMENTS ({activeProject.requirements.length})</span>
              {activeProject.requirements.map((r) => (
                <div key={r.id} className="sc-req-row">
                  <span className="sc-req-text">{r.text}</span>
                  <span className="sc-req-by">{r.addedBy}</span>
                  <button className="sc-del" onClick={() => handleDeleteRequirement(r.id)}>X</button>
                </div>
              ))}
              <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                <input
                  className="sc-input"
                  style={{ marginBottom: 0 }}
                  placeholder="เพิ่ม requirement..."
                  value={newReq}
                  onChange={(e) => setNewReq(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAddRequirement(); }}
                />
                <button className="sc-btn primary" onClick={handleAddRequirement}>ADD</button>
              </div>
              {detailStatus && <div className="sc-status">{detailStatus}</div>}
            </>
          )}

        </div>
      </div>

      {confirmDeleteId !== null && (
        <div style={{
          position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.7)", zIndex: 9999,
        }}>
          <div style={{
            background: "#1a1c2c", border: "4px solid #c0392b",
            boxShadow: "4px 4px 0 #000", padding: "24px 28px", display: "flex", flexDirection: "column", gap: 16,
          }}>
            <span style={{ fontFamily: PF, fontSize: 8, color: "#e57373" }}>ลบ project นี้? (requirements จะหายด้วย)</span>
            <span style={{ fontFamily: SF, fontSize: 13, color: "#a8d8ea" }}>
              {projects.find((p) => p.id === confirmDeleteId)?.name}
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="sc-btn" style={{ background: "#3b0a0a", borderColor: "#c0392b", color: "#e57373" }}
                onClick={() => handleDeleteProject(confirmDeleteId)}>ลบ</button>
              <button className="sc-btn" onClick={() => setConfirmDeleteId(null)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
