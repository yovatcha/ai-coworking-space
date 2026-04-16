"use client";

import { useEffect, useState } from "react";

interface SheetEntry {
  id: number;
  name: string;
  sheetId: string;
  columns: string[];
  scriptUrl: string;
}

interface SheetBroPanelProps {
  onClose: () => void;
  onOpenGoogleBro?: () => void;
  userId?: string;
}

const PF = "'Press Start 2P', monospace";
const SF = "'Sarabun', sans-serif";

const APPS_SCRIPT_CODE = `// Deploy as Web App (Execute as: Me, Who has access: Anyone)
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.openById(data.sheetId);
  const sheet = ss.getSheets()[0];
  sheet.appendRow(data.row);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const sheetId = e.parameter.sheetId;
  const ss = SpreadsheetApp.openById(sheetId);
  const sheet = ss.getSheets()[0];
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return ContentService.createTextOutput(JSON.stringify({ headers }))
    .setMimeType(ContentService.MimeType.JSON);
}`;

export default function SheetBroPanel({ onClose, onOpenGoogleBro, userId }: SheetBroPanelProps) {
  const [view, setView] = useState<"chat" | "sheets" | "add" | "script">("chat");
  const [sheets, setSheets] = useState<SheetEntry[]>([]);
  const [activeSheet, setActiveSheet] = useState<SheetEntry | null>(null);

  const [newName, setNewName] = useState("");
  const [newId, setNewId] = useState("");
  const [newScriptUrl, setNewScriptUrl] = useState("");
  const [fetchStatus, setFetchStatus] = useState("");

  const [rowValues, setRowValues] = useState<Record<string, string>>({});
  const [sendStatus, setSendStatus] = useState("");
  const [refreshStatus, setRefreshStatus] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/sheets?userId=${userId}`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setSheets(data); })
      .catch(() => {});
  }, [userId]);

  const fetchColumns = async (sheetId: string, scriptUrl: string): Promise<string[]> => {
    const res = await fetch(`/api/sheets-proxy?scriptUrl=${encodeURIComponent(scriptUrl)}&sheetId=${encodeURIComponent(sheetId)}`);
    const data = await res.json();
    return data.headers ?? [];
  };

  const handleAddSheet = async () => {
    if (!newName.trim() || !newId.trim() || !newScriptUrl.trim()) {
      setFetchStatus("กรุณากรอกข้อมูลให้ครบ"); return;
    }
    setFetchStatus("กำลังดึง columns...");
    try {
      const columns = await fetchColumns(newId.trim(), newScriptUrl.trim());
      if (!columns.length) { setFetchStatus("ไม่พบ columns ใน row แรก"); return; }
      const res = await fetch("/api/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, name: newName.trim(), sheetId: newId.trim(), scriptUrl: newScriptUrl.trim(), columns }),
      });
      const entry = await res.json();
      if (entry.error) { setFetchStatus("บันทึกไม่สำเร็จ: " + entry.error); return; }
      setSheets(prev => [...prev, entry]);
      setNewName(""); setNewId(""); setNewScriptUrl(""); setFetchStatus("");
      setView("sheets");
    } catch {
      setFetchStatus("เชื่อมต่อไม่ได้ ตรวจสอบ Script URL");
    }
  };

  const handleRefreshColumns = async () => {
    if (!activeSheet) return;
    setRefreshStatus("กำลังดึง columns...");
    try {
      const columns = await fetchColumns(activeSheet.sheetId, activeSheet.scriptUrl);
      if (!columns.length) { setRefreshStatus("ไม่พบ columns"); return; }
      const updated = { ...activeSheet, columns };
      setActiveSheet(updated);
      setSheets(prev => prev.map(s => s.id === updated.id ? updated : s));
      setRowValues({});
      setRefreshStatus("อัปเดตแล้ว ✓");
      setTimeout(() => setRefreshStatus(""), 2000);
    } catch {
      setRefreshStatus("เชื่อมต่อไม่ได้");
    }
  };

  const handleSendRow = async () => {
    if (!activeSheet) return;
    setSendStatus("กำลังส่ง...");
    try {
      const row = activeSheet.columns.map(col => rowValues[col] ?? "");
      const res = await fetch("/api/sheets-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scriptUrl: activeSheet.scriptUrl, sheetId: activeSheet.sheetId, row }),
      });
      const data = await res.json();
      if (data.ok) { setSendStatus("ส่งสำเร็จ ✓"); setRowValues({}); }
      else setSendStatus("เกิดข้อผิดพลาด");
    } catch {
      setSendStatus("เชื่อมต่อไม่ได้");
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <style>{`
        .sb-panel {
          width: 680px; height: 420px; display: flex; flex-direction: column;
          background: #0d1f0d; font-family: ${PF}; image-rendering: pixelated;
          border: 4px solid #2d6a2d;
          box-shadow: -4px -4px 0 0 #4caf50, 4px 4px 0 0 #051005, 6px 6px 0 0 #000;
          position: relative;
        }
        .sb-panel::after {
          content: ''; position: absolute; inset: 0; pointer-events: none;
          background: repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,0,0,0.10) 3px,rgba(0,0,0,0.10) 4px);
          z-index: 10;
        }
        .sb-header { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #051005; border-bottom: 4px solid #000; flex-shrink: 0; }
        .sb-avatar { width: 32px; height: 32px; background: #1a3d1a; border: 3px solid #4caf50; box-shadow: 2px 2px 0 #000; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
        .sb-header-name { font-size: 9px; color: #a5d6a7; text-shadow: 2px 2px 0 #000; }
        .sb-header-status { font-size: 7px; color: #4caf50; display: flex; align-items: center; gap: 5px; }
        .sb-dot { width: 6px; height: 6px; background: #4caf50; box-shadow: 1px 1px 0 #000; animation: sbBlink 1.4s step-start infinite; }
        @keyframes sbBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        .sb-close { width: 24px; height: 24px; background: #c0392b; border: 3px solid #e74c3c; box-shadow: 2px 2px 0 #000; color: #fff; font-family: ${PF}; font-size: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; margin-left: auto; }
        .sb-close:hover { background: #e74c3c; transform: translate(1px,1px); box-shadow: 1px 1px 0 #000; }
        .sb-tabs { display: flex; background: #0a1a0a; border-bottom: 3px solid #000; flex-shrink: 0; }
        .sb-tab { flex: 1; padding: 6px 4px; font-family: ${PF}; font-size: 7px; color: #4a7a4a; background: transparent; border: none; border-right: 2px solid #000; cursor: pointer; letter-spacing: 0.03em; }
        .sb-tab:last-child { border-right: none; }
        .sb-tab.active { background: #0d1f0d; color: #4caf50; }
        .sb-tab:hover:not(.active) { color: #81c784; }
        .sb-body { flex: 1; overflow-y: auto; padding: 12px; background: #0d1f0d; background-image: radial-gradient(circle, #1a2d1a 1px, transparent 1px); background-size: 12px 12px; }
        .sb-body::-webkit-scrollbar { width: 8px; }
        .sb-body::-webkit-scrollbar-track { background: #051005; }
        .sb-body::-webkit-scrollbar-thumb { background: #4caf50; border: 2px solid #051005; }
        .sb-label { font-family: ${PF}; font-size: 7px; color: #81c784; margin-bottom: 4px; display: block; }
        .sb-input { width: 100%; padding: 7px 8px; margin-bottom: 10px; font-family: ${SF}; font-size: 14px; background: #051005; color: #a5d6a7; border: 3px solid #2d6a2d; box-shadow: inset 2px 2px 0 #000; outline: none; box-sizing: border-box; }
        .sb-input:focus { border-color: #4caf50; }
        .sb-btn { padding: 8px 14px; font-family: ${PF}; font-size: 7px; background: #1b5e20; color: #a5d6a7; border: 3px solid #4caf50; box-shadow: 3px 3px 0 #000; cursor: pointer; letter-spacing: 0.05em; }
        .sb-btn:hover { transform: translate(1px,1px); box-shadow: 2px 2px 0 #000; }
        .sb-btn:active { transform: translate(2px,2px); box-shadow: none; }
        .sb-btn.primary { background: #4caf50; color: #000; }
        .sb-sheet-card { padding: 8px 10px; margin-bottom: 8px; background: #0a1a0a; border: 2px solid #2d6a2d; box-shadow: 2px 2px 0 #000; cursor: pointer; display: flex; align-items: center; justify-content: space-between; }
        .sb-sheet-card:hover { border-color: #4caf50; background: #0d200d; }
        .sb-sheet-name { font-family: ${PF}; font-size: 8px; color: #a5d6a7; }
        .sb-sheet-cols { font-family: ${SF}; font-size: 12px; color: #4a7a4a; }
        .sb-code { font-family: monospace; font-size: 11px; color: #a5d6a7; background: #051005; border: 2px solid #2d6a2d; padding: 10px; white-space: pre-wrap; word-break: break-all; max-height: 160px; overflow-y: auto; margin-bottom: 10px; }
        .sb-status { font-family: ${SF}; font-size: 13px; color: #81c784; margin-top: 6px; }
        .sb-text { font-family: ${SF}; font-size: 14px; color: #a5d6a7; line-height: 1.7; }
      `}</style>

      <div className="sb-panel">
        <div className="sb-header">
          <div className="sb-avatar">🟩</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="sb-header-name">SHEET BRO</span>
            <span className="sb-header-status"><span className="sb-dot" />ONLINE</span>
          </div>
          <button className="sb-close" onClick={onClose}>X</button>
        </div>

        <div className="sb-tabs">
          {(["chat", "sheets", "add", "script"] as const).map(t => (
            <button key={t} className={`sb-tab${view === t ? " active" : ""}`} onClick={() => setView(t)}>
              {t === "chat" ? "CHAT" : t === "sheets" ? "MY SHEETS" : t === "add" ? "+ ADD" : "SCRIPT"}
            </button>
          ))}
        </div>

        <div className="sb-body">

          {view === "chat" && (
            <div className="sb-text">
              สวัสดีครับ ผมคือ Sheet Bro 🟩<br /><br />
              ผมช่วยคุณเชื่อมต่อกับ Google Sheets ได้โดยตรงครับ<br /><br />
              วิธีใช้งาน:<br />
              1. แท็บ SCRIPT — คัดลอก Apps Script แล้ว deploy เป็น Web App<br />
              2. แท็บ + ADD — เพิ่ม Sheet ID และ Script URL<br />
              3. แท็บ MY SHEETS — เลือก sheet แล้วกรอกข้อมูล<br /><br />
              {onOpenGoogleBro && (
                <span>ต้องการคุยกับ Google Bro?{" "}
                  <button onClick={onOpenGoogleBro} style={{ fontFamily: SF, fontSize: 14, color: "#4caf50", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>คลิกที่นี่</button>
                </span>
              )}
            </div>
          )}

          {view === "script" && (
            <>
              <span className="sb-label">APPS SCRIPT — deploy as Web App (Anyone can access)</span>
              <div className="sb-code">{APPS_SCRIPT_CODE}</div>
              <button className="sb-btn primary" onClick={copyScript}>{copied ? "COPIED ✓" : "COPY SCRIPT"}</button>
              <div className="sb-status" style={{ marginTop: 8, fontSize: 12 }}>หลัง deploy แล้ว นำ Web App URL มาใส่ในแท็บ + ADD ครับ</div>
            </>
          )}

          {view === "add" && (
            <>
              <span className="sb-label">SHEET NAME</span>
              <input className="sb-input" placeholder="เช่น งบประมาณ Q1" value={newName} onChange={e => setNewName(e.target.value)} />
              <span className="sb-label">SPREADSHEET ID</span>
              <input className="sb-input" placeholder="จาก URL: /d/[ID]/edit" value={newId} onChange={e => setNewId(e.target.value)} />
              <span className="sb-label">APPS SCRIPT WEB APP URL</span>
              <input className="sb-input" placeholder="https://script.google.com/macros/s/.../exec" value={newScriptUrl} onChange={e => setNewScriptUrl(e.target.value)} />
              <button className="sb-btn primary" onClick={handleAddSheet}>FETCH COLUMNS</button>
              {fetchStatus && <div className="sb-status">{fetchStatus}</div>}
            </>
          )}

          {view === "sheets" && !activeSheet && (
            <>
              {sheets.length === 0 && <div className="sb-text">ยังไม่มี sheet ครับ ไปที่แท็บ + ADD เพื่อเพิ่มครับ</div>}
              {sheets.map((s, i) => (
                <div key={i} className="sb-sheet-card" onClick={() => { setActiveSheet(s); setRowValues({}); setSendStatus(""); }}>
                  <div>
                    <div className="sb-sheet-name">{s.name}</div>
                    <div className="sb-sheet-cols">{s.columns.join(" · ")}</div>
                  </div>
                  <span style={{ fontFamily: PF, fontSize: 8, color: "#4caf50" }}>▶</span>
                </div>
              ))}
            </>
          )}

          {view === "sheets" && activeSheet && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <button className="sb-btn" onClick={() => setActiveSheet(null)}>◀ BACK</button>
                <span style={{ fontFamily: PF, fontSize: 8, color: "#a5d6a7" }}>{activeSheet.name}</span>
                <button className="sb-btn" style={{ marginLeft: "auto" }} onClick={handleRefreshColumns}>↻ REFRESH</button>
              </div>
              {refreshStatus && <div className="sb-status" style={{ marginBottom: 8 }}>{refreshStatus}</div>}
              {activeSheet.columns.map(col => (
                <div key={col}>
                  <span className="sb-label">{col.toUpperCase()}</span>
                  <input className="sb-input" value={rowValues[col] ?? ""} onChange={e => setRowValues(prev => ({ ...prev, [col]: e.target.value }))} />
                </div>
              ))}
              <button className="sb-btn primary" onClick={handleSendRow}>SEND TO SHEET</button>
              {sendStatus && <div className="sb-status">{sendStatus}</div>}
            </>
          )}

        </div>
      </div>
    </>
  );
}
