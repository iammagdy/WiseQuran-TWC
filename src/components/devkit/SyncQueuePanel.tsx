import { useEffect, useState } from "react";
import { getAllSyncQueueEntries, type SyncQueueEntry } from "@/lib/db";
import { flushSyncQueue } from "@/lib/syncQueue";
import { getDB } from "@/lib/db";
import { DK, formatTs, jsonPreview, downloadJson, exportFilename } from "./devkit-utils";

export default function SyncQueuePanel() {
  const [entries, setEntries] = useState<SyncQueueEntry[]>([]);
  const [flushing, setFlushing] = useState(false);
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = async () => {
    try {
      const all = await getAllSyncQueueEntries();
      setEntries(all);
    } catch {
      setEntries([]);
    }
  };

  useEffect(() => {
    void load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const flush = async () => {
    setFlushing(true);
    try {
      await flushSyncQueue();
      await load();
    } finally {
      setFlushing(false);
    }
  };

  const clearQueue = async () => {
    if (!confirm("Clear all sync queue entries? They will not be sent to the server.")) return;
    try {
      const db = await getDB();
      await db.clear("syncQueue");
      await load();
    } catch {
      /* devkit best-effort: clearing IDB store may race with another writer; ignore */
    }
  };

  const exportData = () => {
    downloadJson(
      {
        exportedAt: new Date().toISOString(),
        count: entries.length,
        entries,
      },
      exportFilename("syncqueue"),
    );
  };

  const deleteEntry = async (id: number) => {
    if (!confirm(`Delete entry #${id}?`)) return;
    try {
      const db = await getDB();
      await db.delete("syncQueue", id);
      await load();
    } catch {
      /* devkit best-effort: row may have been flushed/removed concurrently; ignore */
    }
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-4 ${DK.card}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`font-mono text-xs uppercase tracking-widest ${DK.muted}`}>
              Pending
            </span>
            <span
              className={`font-mono text-sm font-bold ${entries.length > 0 ? DK.yellow : DK.green}`}
            >
              {entries.length}
            </span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void load()} className={`${DK.btnBase} ${DK.btnGray}`}>↻</button>
            <button
              onClick={exportData}
              disabled={entries.length === 0}
              className={`${DK.btnBase} ${DK.btnGray}`}
            >
              Export JSON ↓
            </button>
            <button
              onClick={() => void flush()}
              disabled={flushing || entries.length === 0 || !navigator.onLine}
              className={`${DK.btnBase} ${DK.btnGreen}`}
            >
              {flushing ? "Flushing…" : "Flush now"}
            </button>
            <button
              onClick={() => void clearQueue()}
              disabled={entries.length === 0}
              className={`${DK.btnBase} ${DK.btnRed}`}
            >
              Clear queue
            </button>
          </div>
        </div>

        {!navigator.onLine && (
          <p className={`font-mono text-xs ${DK.yellow} mb-3`}>
            ⚠ Device is offline — flush will not send data
          </p>
        )}

        {entries.length === 0 ? (
          <p className={`font-mono text-xs ${DK.green} py-4 text-center`}>
            ✓ Queue is empty
          </p>
        ) : (
          <div>
            {entries.map((e) => (
              <div key={e.id} className={`border-b ${DK.border} last:border-0`}>
                <div
                  className="flex items-center gap-3 py-2 cursor-pointer group"
                  onClick={() => setExpanded(expanded === e.id ? null : (e.id ?? null))}
                >
                  <span className={`font-mono text-xs ${DK.muted} w-8`}>#{e.id}</span>
                  <span className={`font-mono text-xs ${DK.blue} w-24 shrink-0`}>{e.table}</span>
                  <span className={`font-mono text-xs ${DK.yellow} w-14 shrink-0`}>{e.operation}</span>
                  <span className={`font-mono text-xs ${DK.muted} flex-1 truncate`}>
                    {jsonPreview(e.payload)}
                  </span>
                  <span className={`font-mono text-xs w-16 shrink-0 ${(e.retryCount ?? 0) > 0 ? DK.red : DK.muted}`}>
                    ↺{e.retryCount ?? 0}
                  </span>
                  <span className={`font-mono text-xs ${DK.muted} shrink-0`}>
                    {formatTs(e.timestamp)}
                  </span>
                  <button
                    onClick={(ev) => { ev.stopPropagation(); void deleteEntry(e.id!); }}
                    className={`${DK.btnBase} ${DK.btnRed} opacity-0 group-hover:opacity-100 shrink-0`}
                  >
                    ×
                  </button>
                </div>
                {expanded === e.id && (
                  <pre className={`font-mono text-xs ${DK.text} p-3 bg-[#0d1117] rounded mb-2 overflow-x-auto whitespace-pre-wrap`}>
                    {JSON.stringify(e, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
