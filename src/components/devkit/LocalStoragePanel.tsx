import { useEffect, useState, useRef } from "react";
import { DK, downloadJson, exportFilename } from "./devkit-utils";

interface LSEntry {
  key: string;
  raw: string;
}

function parseValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function EditRow({
  entry,
  onSave,
  onDelete,
}: {
  entry: LSEntry;
  onSave: (key: string, val: string) => void;
  onDelete: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.raw);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const pretty = (() => {
    try {
      return JSON.stringify(JSON.parse(entry.raw), null, 2);
    } catch {
      return entry.raw;
    }
  })();

  const save = () => {
    onSave(entry.key, draft);
    setEditing(false);
  };

  return (
    <div className={`border-b ${DK.border} last:border-0`}>
      <div
        className="flex items-center gap-2 py-2 cursor-pointer group"
        onClick={() => !editing && setExpanded((v) => !v)}
      >
        <span className={`font-mono text-xs ${DK.blue} flex-1 min-w-0 truncate`}>{entry.key}</span>
        <span className={`font-mono text-xs ${DK.muted} shrink-0`}>
          {entry.raw.length} chars
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditing(true);
            setExpanded(true);
            setDraft(pretty);
            setTimeout(() => taRef.current?.focus(), 50);
          }}
          className={`${DK.btnBase} ${DK.btnGray} opacity-0 group-hover:opacity-100 shrink-0`}
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete "${entry.key}"?`)) onDelete(entry.key);
          }}
          className={`${DK.btnBase} ${DK.btnRed} opacity-0 group-hover:opacity-100 shrink-0`}
        >
          ×
        </button>
      </div>
      {expanded && (
        <div className="pb-3">
          {editing ? (
            <>
              <textarea
                ref={taRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={save}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    save();
                  }
                }}
                rows={Math.min(20, draft.split("\n").length + 2)}
                className={`w-full font-mono text-xs p-2 rounded bg-[#0d1117] ${DK.text} ${DK.border} border resize-y outline-none focus:border-[#388bfd] focus:ring-1 focus:ring-[#388bfd]`}
              />
              <div className="flex gap-2 mt-2 items-center">
                <button onClick={save} className={`${DK.btnBase} ${DK.btnGreen}`}>
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setDraft(pretty);
                  }}
                  className={`${DK.btnBase} ${DK.btnGray}`}
                >
                  Cancel
                </button>
                <span className={`font-mono text-xs ${DK.muted} ms-auto`}>blur or Ctrl+Enter to save</span>
              </div>
            </>
          ) : (
            <pre className={`font-mono text-xs ${DK.text} p-2 rounded bg-[#0d1117] overflow-x-auto whitespace-pre-wrap break-all`}>
              {pretty}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export default function LocalStoragePanel() {
  const [entries, setEntries] = useState<LSEntry[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [filter, setFilter] = useState("");

  const load = () => {
    const result: LSEntry[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("wise-")) {
        result.push({ key, raw: localStorage.getItem(key) ?? "" });
      }
    }
    result.sort((a, b) => a.key.localeCompare(b.key));
    setEntries(result);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  const save = (key: string, val: string) => {
    localStorage.setItem(key, val);
    load();
  };

  const del = (key: string) => {
    localStorage.removeItem(key);
    load();
  };

  const nukeAll = () => {
    if (!confirm("Delete ALL wise-* keys? This cannot be undone.")) return;
    entries.forEach((e) => localStorage.removeItem(e.key));
    load();
  };

  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      count: entries.length,
      keys: entries.map((e) => ({ key: e.key, value: parseValue(e.raw) })),
    };
    downloadJson(payload, exportFilename("localstorage"));
  };

  const addKey = () => {
    if (!newKey.trim()) return;
    const k = newKey.startsWith("wise-") ? newKey.trim() : `wise-${newKey.trim()}`;
    localStorage.setItem(k, newVal);
    setNewKey("");
    setNewVal("");
    load();
  };

  const filtered = filter
    ? entries.filter((e) => e.key.includes(filter) || e.raw.includes(filter))
    : entries;

  const totalBytes = entries.reduce((s, e) => s + e.key.length + e.raw.length, 0);

  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-4 ${DK.card}`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`font-mono text-xs ${DK.muted}`}>
            {entries.length} keys · {totalBytes.toLocaleString()} chars
          </span>
          <div className="flex gap-2">
            <button onClick={load} className={`${DK.btnBase} ${DK.btnGray}`}>↻</button>
            <button
              onClick={exportData}
              disabled={entries.length === 0}
              className={`${DK.btnBase} ${DK.btnGray}`}
            >
              Export JSON ↓
            </button>
            <button onClick={nukeAll} className={`${DK.btnBase} ${DK.btnRed}`}>
              Nuke all wise-*
            </button>
          </div>
        </div>

        <input
          placeholder="Filter keys or values…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className={`w-full font-mono text-xs px-3 py-1.5 rounded bg-[#0d1117] ${DK.text} border ${DK.border} outline-none focus:border-[#388bfd] mb-3`}
        />

        <div>
          {filtered.length === 0 ? (
            <p className={`font-mono text-xs ${DK.muted} py-4 text-center`}>No keys found</p>
          ) : (
            filtered.map((e) => (
              <EditRow key={e.key} entry={e} onSave={save} onDelete={del} />
            ))
          )}
        </div>
      </div>

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h3 className={`font-mono text-xs ${DK.muted} uppercase tracking-widest mb-3`}>Add key</h3>
        <div className="flex gap-2">
          <input
            placeholder="key (wise- prefix added)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className={`flex-1 font-mono text-xs px-3 py-1.5 rounded bg-[#0d1117] ${DK.text} border ${DK.border} outline-none focus:border-[#388bfd]`}
          />
          <input
            placeholder="value"
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            className={`flex-1 font-mono text-xs px-3 py-1.5 rounded bg-[#0d1117] ${DK.text} border ${DK.border} outline-none focus:border-[#388bfd]`}
          />
          <button onClick={addKey} className={`${DK.btnBase} ${DK.btnGreen}`}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
