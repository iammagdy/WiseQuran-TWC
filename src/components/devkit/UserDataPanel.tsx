import { useEffect, useState } from "react";
import { DK } from "./devkit-utils";

interface Group {
  label: string;
  keys: string[];
}

const GROUPS: Group[] = [
  {
    label: "Reading",
    keys: [
      "wise-reading-history",
      "wise-reading-logs",
      "wise-daily-reading",
      "wise-reading-stats",
      "wise-daily-goal",
      "wise-streak",
    ],
  },
  {
    label: "Hifz",
    keys: [
      "wise-hifz",
      "wise-hifz-review",
      "wise-hifz-goal",
      "wise-hifz-streak",
    ],
  },
  {
    label: "Azkar",
    keys: ["wise-azkar-completion", "wise-azkar-expanded-sections", "wise-azkar-notifications"],
  },
  {
    label: "Prayer",
    keys: [
      "wise-prayer-today",
      "wise-prayer-log",
      "wise-prayer-method",
      "wise-prayer-notifications",
      "wise-prayer-checkoff-reminders",
      "wise-prayer-checkoff-reminders-fired",
    ],
  },
  {
    label: "Wird & Ramadan",
    keys: [
      "wise-daily-wird",
      "wise-ramadan",
      "wise-ramadan-day",
      "wise-ramadan-preview",
      "wise-ramadan-hidden",
    ],
  },
  {
    label: "Tasbeeh",
    keys: ["wise-tasbeeh-count", "wise-tasbeeh-dhikr", "wise-tasbeeh-target"],
  },
  {
    label: "Preferences",
    keys: [
      "wise-reciter",
      "wise-quran-theme",
      "wise-language",
      "wise-font-size",
      "wise-device-id",
    ],
  },
  {
    label: "Install & Updates",
    keys: [
      "wise-install-sessions",
      "wise-install-snoozed-until",
      "wise-install-dismissed",
      "wise-last-seen-version",
    ],
  },
];

function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function GroupSection({ group }: { group: Group }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Record<string, string | null>>({});
  const [msg, setMsg] = useState("");

  const load = () => {
    const d: Record<string, string | null> = {};
    for (const k of group.keys) d[k] = localStorage.getItem(k);
    setData(d);
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `load` is a stable closure over `group`; running once at mount is intentional
  }, []);

  const resetGroup = () => {
    if (!confirm(`Reset all ${group.label} keys?`)) return;
    group.keys.forEach((k) => localStorage.removeItem(k));
    load();
    setMsg(`${group.label} cleared`);
    setTimeout(() => setMsg(""), 2500);
  };

  const resetKey = (key: string) => {
    if (!confirm(`Delete "${key}"?`)) return;
    localStorage.removeItem(key);
    load();
  };

  const presentKeys = group.keys.filter((k) => data[k] != null);

  return (
    <div className={`rounded-lg ${DK.card} overflow-hidden`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-3">
          <span className={`font-mono text-xs font-semibold ${DK.text}`}>{group.label}</span>
          <span className={`font-mono text-xs ${DK.muted}`}>
            {presentKeys.length}/{group.keys.length} set
          </span>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className={`font-mono text-xs ${DK.green}`}>✓ {msg}</span>}
          <button
            onClick={(e) => { e.stopPropagation(); resetGroup(); }}
            className={`${DK.btnBase} ${DK.btnRed}`}
          >
            Reset
          </button>
          <span className={`font-mono text-xs ${DK.muted}`}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div className={`border-t ${DK.border} p-4 space-y-3`}>
          {group.keys.map((k) => {
            const raw = data[k];
            return (
              <div key={k} className={`border-b ${DK.border} last:border-0 pb-2`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-mono text-xs ${DK.blue}`}>{k}</span>
                  {raw != null && (
                    <button
                      onClick={() => resetKey(k)}
                      className={`${DK.btnBase} ${DK.btnRed}`}
                    >
                      ×
                    </button>
                  )}
                </div>
                {raw == null ? (
                  <span className={`font-mono text-xs ${DK.muted}`}>not set</span>
                ) : (
                  <pre className={`font-mono text-xs ${DK.text} bg-[#0d1117] p-2 rounded overflow-x-auto whitespace-pre-wrap break-all max-h-48`}>
                    {prettyJson(raw)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function UserDataPanel() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={() => setRefreshKey((k) => k + 1)}
          className={`${DK.btnBase} ${DK.btnGray}`}
        >
          ↻ Refresh all
        </button>
      </div>
      {GROUPS.map((g) => (
        <GroupSection key={`${g.label}-${refreshKey}`} group={g} />
      ))}
    </div>
  );
}
