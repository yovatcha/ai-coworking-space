"use client";

import { useEffect, useState } from "react";
import type { Workload, WorkloadUser } from "@/lib/taskBoard";
import { memberColorForName } from "@/lib/taskBoard";

interface Props {
  onClose: () => void;
}

// Full read of the announce board: every irin-task-board user and the
// checklist items still open in their hands. Read-only.
export default function TaskBoardPanel({ onClose }: Props) {
  const [data, setData] = useState<Workload | null>(null);
  // Captured when the data lands, so "overdue" is not recomputed on every render
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/task-board")
      .then(async (r) => {
        if (!r.ok) throw new Error(`upstream ${r.status}`);
        return (await r.json()) as Workload;
      })
      .then((d) => { if (!cancelled) { setNow(Date.now()); setData(d); } })
      .catch((e: Error) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const users = data?.users ?? [];
  const busy = users.filter((u) => u.tasks.length > 0);
  const idle = users.filter((u) => u.tasks.length === 0);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .tb-panel {
          width: 680px; height: 420px; display: flex; flex-direction: column;
          background: #1a1c2c; font-family: 'Press Start 2P', monospace;
          border: 4px solid #5a6988; position: relative;
          box-shadow: -4px -4px 0 0 #8faabb, 4px 4px 0 0 #0d0f1a, 6px 6px 0 0 #000;
        }
        .tb-header {
          display: flex; align-items: center; gap: 8px; padding: 8px 10px;
          background: #16213e; border-bottom: 4px solid #0d0f1a; flex-shrink: 0;
        }
        .tb-avatar {
          width: 32px; height: 32px; background: #3b2a1a; border: 3px solid #c89b5a;
          box-shadow: 2px 2px 0 #000; display: flex; align-items: center; justify-content: center; font-size: 16px;
        }
        .tb-name { flex: 1; font-size: 9px; color: #f3e9d2; letter-spacing: 1px; }
        .tb-sub { font-size: 7px; color: #8faabb; margin-top: 5px; display: block; }
        .tb-close {
          font-family: inherit; font-size: 9px; color: #f3e9d2; background: #8a2b2b;
          border: 3px solid #0d0f1a; box-shadow: 2px 2px 0 #000; padding: 4px 8px; cursor: pointer;
        }
        .tb-close:hover { background: #b23a3a; }
        .tb-body { flex: 1; overflow-y: auto; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
        .tb-body::-webkit-scrollbar { width: 10px; }
        .tb-body::-webkit-scrollbar-thumb { background: #5a6988; border: 2px solid #1a1c2c; }
        .tb-person { background: #22253a; border: 3px solid #0d0f1a; box-shadow: 3px 3px 0 #000; padding: 8px; }
        .tb-person-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .tb-dot { width: 10px; height: 10px; border: 2px solid #0d0f1a; }
        .tb-person-name { font-size: 9px; flex: 1; }
        .tb-count { font-size: 8px; color: #1a1c2c; background: #f7d794; padding: 3px 6px; border: 2px solid #0d0f1a; }
        .tb-task { font-size: 8px; color: #e8e8e8; line-height: 1.7; padding-left: 12px; position: relative; }
        .tb-task::before { content: '▸'; position: absolute; left: 0; color: #8faabb; }
        .tb-task small { color: #8faabb; font-size: 7px; display: block; }
        .tb-due { color: #f7a84f; }
        .tb-overdue { color: #e74c3c; }
        .tb-idle { font-size: 8px; color: #8faabb; line-height: 1.8; }
        .tb-msg { font-size: 9px; color: #8faabb; text-align: center; margin-top: 60px; line-height: 2; }
        .tb-msg.err { color: #e74c3c; }
      `}</style>

      <div className="tb-panel">
        <div className="tb-header">
          <div className="tb-avatar">📋</div>
          <div className="tb-name">
            TEAM TASKS
            <span className="tb-sub">
              {data ? `from irin-task-board · ${new Date(data.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "irin-task-board"}
            </span>
          </div>
          <button className="tb-close" onClick={onClose}>X</button>
        </div>

        <div className="tb-body">
          {error && <div className="tb-msg err">BOARD OFFLINE<br />{error}</div>}
          {!error && !data && <div className="tb-msg">loading...</div>}
          {data && users.length === 0 && <div className="tb-msg">no one on the board yet</div>}
          {data && users.length > 0 && busy.length === 0 && (
            <div className="tb-msg">all clear — nothing in anyone&apos;s hands</div>
          )}

          {busy.map((u) => <Person key={u.id} user={u} now={now} />)}

          {idle.length > 0 && (
            <div className="tb-idle">
              FREE: {idle.map((u) => u.name).join(", ")}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Person({ user, now }: { user: WorkloadUser; now: number }) {
  const color = memberColorForName(user.name) ?? "#9aa5b1";
  return (
    <div className="tb-person">
      <div className="tb-person-head">
        <span className="tb-dot" style={{ background: color }} />
        <span className="tb-person-name" style={{ color }}>{user.name.toUpperCase()}</span>
        <span className="tb-count">{user.tasks.length}</span>
      </div>
      {user.tasks.map((t) => (
        <div key={t.id} className="tb-task">
          {t.text}
          <small>
            {t.boardName} › {t.cardTitle}
            {t.dueDate && <Due iso={t.dueDate} now={now} />}
          </small>
        </div>
      ))}
    </div>
  );
}

function Due({ iso, now }: { iso: string; now: number }) {
  const due = new Date(iso);
  const overdue = due.getTime() < now;
  const label = due.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  return <span className={overdue ? "tb-overdue" : "tb-due"}> · due {label}{overdue ? " !" : ""}</span>;
}
