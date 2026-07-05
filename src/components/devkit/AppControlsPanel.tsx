import { useState, useEffect, useRef } from "react";
import { DK } from "./devkit-utils";
import { clearAllAudio, recalculateAudioBytes } from "@/lib/db";
import { DEVKIT_FORCE_CHANGELOG_KEY } from "@/hooks/usePostUpdateChangelog";
import { exportBackup, downloadBackupFile, parseBackupFile, restoreBackup } from "@/lib/backup";

const THEMES = ["light", "dark"] as const;
const LANGS = ["ar", "en"] as const;
const THEME_KEY = "wise-quran-theme";
const LANG_KEY = "wise-language";
const LS_SYNC_EVENT = "local-storage-sync";

function lsRead(key: string, fallback: string): string {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string) : fallback;
  } catch {
    return fallback;
  }
}

function lsWrite(key: string, value: string) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(LS_SYNC_EVENT, { detail: { key, newValue: value } }));
}

function readTheme() {
  return lsRead(THEME_KEY, "light");
}
function readLang() {
  return lsRead(LANG_KEY, "ar");
}

export default function AppControlsPanel() {
  const [theme, setTheme] = useState(readTheme);
  const [lang, setLang] = useState(readLang);
  const [msg, setMsg] = useState("");
  const [offlineMode, setOfflineMode] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [recalcBusy, setRecalcBusy] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    setTheme(readTheme());
    setLang(readLang());
  };

  useEffect(() => {
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 2500);
  };

  const applyTheme = (t: string) => {
    lsWrite(THEME_KEY, t);
    setTheme(t);
    document.documentElement.classList.remove("dark");
    if (t === "dark") document.documentElement.classList.add("dark");
    flash(`Theme → ${t}`);
  };

  const applyLang = (l: string) => {
    lsWrite(LANG_KEY, l);
    setLang(l);
    flash(`Language → ${l} (reload the main app to see changes)`);
  };

  const resetInstallBanner = () => {
    localStorage.removeItem("wise-install-sessions");
    localStorage.removeItem("wise-install-snoozed-until");
    localStorage.removeItem("wise-install-dismissed");
    flash("Install banner reset — visit the app again to re-trigger");
  };

  const forceChangelog = () => {
    sessionStorage.setItem(DEVKIT_FORCE_CHANGELOG_KEY, "1");
    window.location.href = "/";
  };

  const clearCaches = async () => {
    if (!confirm("Clear Cache API caches + IDB audio? App will re-fetch assets and audio on next visit.")) return;
    let cacheCount = 0;
    if ("caches" in window) {
      const keys = await caches.keys();
      cacheCount = keys.length;
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    await clearAllAudio();
    flash(`Cleared ${cacheCount} Cache API cache(s) + IDB audio store`);
  };

  const toggleOffline = () => {
    const next = !offlineMode;
    setOfflineMode(next);
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "DEVKIT_SIMULATE_OFFLINE",
        value: next,
      });
      flash(`Offline simulation ${next ? "ON" : "OFF"} — SW message sent`);
    } else {
      flash(`Offline simulation ${next ? "ON" : "OFF"} — no active SW controller`);
    }
  };

  const clearReading = () => {
    if (!confirm("Reset all reading progress (history, logs, streak, daily reading)?")) return;
    [
      "wise-reading-history",
      "wise-reading-logs",
      "wise-daily-reading",
      "wise-reading-stats",
      "wise-streak",
    ].forEach((k) => localStorage.removeItem(k));
    flash("Reading progress cleared");
  };

  const clearHifz = () => {
    if (!confirm("Reset all Hifz data?")) return;
    [
      "wise-hifz",
      "wise-hifz-review",
      "wise-hifz-goal",
      "wise-hifz-streak",
    ].forEach((k) => localStorage.removeItem(k));
    flash("Hifz data cleared");
  };

  const handleRecalcAudio = async () => {
    setRecalcBusy(true);
    try {
      const bytes = await recalculateAudioBytes();
      const mb = (bytes / (1024 * 1024)).toFixed(2);
      flash(`Recalculated audio storage: ${mb} MB (${bytes.toLocaleString()} bytes)`);
    } catch (err) {
      flash(`Recalculate failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRecalcBusy(false);
    }
  };

  const handleExport = async () => {
    setBackupBusy(true);
    try {
      const data = await exportBackup();
      downloadBackupFile(data);
      const lsCount = Object.keys(data.localStorage).length;
      flash(`Exported ${lsCount} keys · surahs:${data.idb.surahCount} audio:${data.idb.audioCount} tafsir:${data.idb.tafsirCount}`);
    } catch (err) {
      flash(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBackupBusy(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!confirm(`Restore from "${file.name}"? This will overwrite current localStorage and azkar data.`)) return;
    setBackupBusy(true);
    try {
      const data = await parseBackupFile(file);
      const result = await restoreBackup(data);
      flash(`Restored ${result.lsKeysRestored} LS keys · ${result.azkarRestored} azkar · ${result.syncQueueRestored} sync queue entries — reloading…`);
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      flash(`Import failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button onClick={refresh} className={`${DK.btnBase} ${DK.btnGray}`}>↻ Refresh</button>
      </div>
      {msg && (
        <div className={`rounded p-3 bg-[#238636]/20 border border-[#238636] font-mono text-xs ${DK.green}`}>
          ✓ {msg}
        </div>
      )}

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h3 className={`font-mono text-xs uppercase tracking-widest ${DK.muted} mb-3`}>Theme</h3>
        <div className="flex gap-2 flex-wrap">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => applyTheme(t)}
              className={`${DK.btnBase} ${theme === t ? DK.btnGreen : DK.btnGray}`}
            >
              {t}
            </button>
          ))}
        </div>
        <p className={`font-mono text-xs ${DK.muted} mt-2`}>
          Current: <span className={DK.blue}>{theme}</span> · applies immediately + persists via {THEME_KEY}
        </p>
      </div>

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h3 className={`font-mono text-xs uppercase tracking-widest ${DK.muted} mb-3`}>Language</h3>
        <div className="flex gap-2">
          {LANGS.map((l) => (
            <button
              key={l}
              onClick={() => applyLang(l)}
              className={`${DK.btnBase} ${lang === l ? DK.btnGreen : DK.btnGray}`}
            >
              {l === "ar" ? "العربية (ar)" : "English (en)"}
            </button>
          ))}
        </div>
        <p className={`font-mono text-xs ${DK.muted} mt-2`}>
          Current: <span className={DK.blue}>{lang}</span> · reload main app after change
        </p>
      </div>

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h3 className={`font-mono text-xs uppercase tracking-widest ${DK.muted} mb-4`}>Reset controls</h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Install banner</p>
              <p className={`font-mono text-xs ${DK.muted}`}>Clears session count + snooze so banner shows again</p>
            </div>
            <button onClick={resetInstallBanner} className={`${DK.btnBase} ${DK.btnGray} shrink-0`}>
              Reset
            </button>
          </div>
          <div className={`border-t ${DK.border} pt-3 flex items-center justify-between`}>
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Changelog modal</p>
              <p className={`font-mono text-xs ${DK.muted}`}>Navigates to / and immediately opens the changelog modal</p>
            </div>
            <button onClick={forceChangelog} className={`${DK.btnBase} ${DK.btnGreen} shrink-0`}>
              Open now ↗
            </button>
          </div>
          <div className={`border-t ${DK.border} pt-3 flex items-center justify-between`}>
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Reading progress</p>
              <p className={`font-mono text-xs ${DK.muted}`}>history, logs, streak, daily reading</p>
            </div>
            <button onClick={clearReading} className={`${DK.btnBase} ${DK.btnRed} shrink-0`}>
              Clear
            </button>
          </div>
          <div className={`border-t ${DK.border} pt-3 flex items-center justify-between`}>
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Hifz data</p>
              <p className={`font-mono text-xs ${DK.muted}`}>memorization status, SRS data, goals, streaks</p>
            </div>
            <button onClick={clearHifz} className={`${DK.btnBase} ${DK.btnRed} shrink-0`}>
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h3 className={`font-mono text-xs uppercase tracking-widest ${DK.muted} mb-3`}>Network simulation</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className={`font-mono text-xs ${DK.text}`}>Simulate offline</p>
            <p className={`font-mono text-xs ${DK.muted}`}>Sends DEVKIT_SIMULATE_OFFLINE message to active service worker</p>
          </div>
          <button
            onClick={toggleOffline}
            className={`${DK.btnBase} ${offlineMode ? DK.btnRed : DK.btnGray} shrink-0`}
          >
            {offlineMode ? "Online ↺" : "Go offline"}
          </button>
        </div>
      </div>

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h3 className={`font-mono text-xs uppercase tracking-widest ${DK.muted} mb-3`}>Caches</h3>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Clear all caches</p>
              <p className={`font-mono text-xs ${DK.muted}`}>
                Wipes Cache API entries + IDB audio store. App refetches on next load.
              </p>
            </div>
            <button
              onClick={() => void clearCaches()}
              className={`${DK.btnBase} ${DK.btnRed} shrink-0 ms-4`}
            >
              Clear
            </button>
          </div>
          <div className={`border-t ${DK.border} pt-3 flex items-center justify-between`}>
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Recalculate audio storage</p>
              <p className={`font-mono text-xs ${DK.muted}`}>
                Rebuilds the cached audio-bytes total by re-scanning IDB. Fixes drift from aborted downloads.
              </p>
            </div>
            <button
              onClick={() => void handleRecalcAudio()}
              disabled={recalcBusy}
              className={`${DK.btnBase} ${DK.btnGray} shrink-0 ms-4`}
            >
              {recalcBusy ? "…" : "Recalculate"}
            </button>
          </div>
        </div>
      </div>

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <h3 className={`font-mono text-xs uppercase tracking-widest ${DK.muted} mb-3`}>Backup</h3>
        <p className={`font-mono text-xs ${DK.muted} mb-4`}>
          Export all wise-* localStorage keys + IDB azkar + sync queue to a JSON file. Import restores localStorage, azkar, and sync queue. Audio and downloaded text are not included (re-downloadable).
        </p>
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Export all data</p>
              <p className={`font-mono text-xs ${DK.muted}`}>Downloads wise-quran-backup-YYYY-MM-DD.json</p>
            </div>
            <button
              onClick={() => void handleExport()}
              disabled={backupBusy}
              className={`${DK.btnBase} ${DK.btnGreen} shrink-0`}
            >
              {backupBusy ? "…" : "Export ↓"}
            </button>
          </div>
          <div className={`border-t ${DK.border} pt-3 flex items-center justify-between`}>
            <div>
              <p className={`font-mono text-xs ${DK.text}`}>Import backup</p>
              <p className={`font-mono text-xs ${DK.muted}`}>Restore from a previously exported .json file</p>
            </div>
            <button
              onClick={() => importRef.current?.click()}
              disabled={backupBusy}
              className={`${DK.btnBase} ${DK.btnGray} shrink-0`}
            >
              {backupBusy ? "…" : "Import ↑"}
            </button>
          </div>
        </div>
        <input
          ref={importRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => void handleImport(e)}
        />
      </div>
    </div>
  );
}
