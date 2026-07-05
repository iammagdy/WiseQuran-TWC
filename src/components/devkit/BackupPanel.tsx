import { useState, useRef } from "react";
import { DK, downloadJson, exportFilename } from "./devkit-utils";
import { getFeatureFlags, DEFAULT_FLAGS, FEATURE_FLAGS_KEY, type FeatureFlags } from "@/lib/feature-flags";
import {
  getDevkitChangelog,
  setDevkitChangelog,
  getEffectiveVersion,
  setEffectiveVersion,
  clearEffectiveVersionOverride,
  DEVKIT_CURRENT_VERSION_KEY,
} from "@/lib/changelog-overrides";
import { type ChangelogEntry } from "@/data/changelog";

interface DevKitBackup {
  _type: "devkit-backup";
  exportedAt: string;
  featureFlags: FeatureFlags;
  changelogEntries: ChangelogEntry[];
  effectiveVersionOverride: string | null;
}

interface PendingBackupImport {
  featureFlags: FeatureFlags;
  changelogEntries: ChangelogEntry[];
  effectiveVersionOverride: string | null;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function countCatItems(cat: { features?: string[]; improvements?: string[]; fixes?: string[] }): number {
  return (cat.features?.length ?? 0) + (cat.improvements?.length ?? 0) + (cat.fixes?.length ?? 0);
}

function countItems(entry: Partial<ChangelogEntry>): number {
  return countCatItems(entry.en ?? {}) + countCatItems(entry.ar ?? {});
}

function formatFlagValue(v: unknown): string {
  if (typeof v === "boolean") return v ? "ON" : "OFF";
  if (typeof v === "string") return v.length > 48 ? v.slice(0, 48) + "…" : `"${v}"`;
  return String(v);
}

/* ─── Diff sub-components ─────────────────────────────────────────────────── */

function FlagDiffRow({ flagKey, current, incoming }: { flagKey: string; current: unknown; incoming: unknown }) {
  return (
    <div className={`py-2 border-b ${DK.border} last:border-0`}>
      <p className={`font-mono text-[10px] ${DK.muted} mb-1`}>{flagKey}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#6e1c1c]/30 border border-[#f85149]/20 ${DK.red}`}>
          {formatFlagValue(current)}
        </span>
        <span className={`font-mono text-[10px] ${DK.muted}`}>→</span>
        <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded bg-[#2ea043]/20 border border-[#3fb950]/20 ${DK.green}`}>
          {formatFlagValue(incoming)}
        </span>
      </div>
    </div>
  );
}

interface FlagDiffProps {
  incoming: FeatureFlags;
  current: FeatureFlags;
}

function FlagsDiff({ incoming, current }: FlagDiffProps) {
  const allKeys = Array.from(new Set([...Object.keys(current), ...Object.keys(incoming)])) as (keyof FeatureFlags)[];
  const changed = allKeys.filter((k) => JSON.stringify(current[k]) !== JSON.stringify(incoming[k]));
  const unchanged = allKeys.filter((k) => JSON.stringify(current[k]) === JSON.stringify(incoming[k]));

  if (changed.length === 0) {
    return (
      <p className={`font-mono text-xs ${DK.green} px-1`}>✓ No flag changes — all values match current state</p>
    );
  }

  return (
    <div>
      <p className={`font-mono text-[10px] ${DK.yellow} mb-2`}>
        ⚡ {changed.length} flag{changed.length !== 1 ? "s" : ""} will change:
      </p>
      <div>
        {changed.map((k) => (
          <FlagDiffRow
            key={k}
            flagKey={String(k)}
            current={current[k]}
            incoming={incoming[k]}
          />
        ))}
      </div>
      {unchanged.length > 0 && (
        <p className={`font-mono text-[10px] ${DK.muted} mt-2`}>
          {unchanged.length} flag{unchanged.length !== 1 ? "s" : ""} unchanged
        </p>
      )}
    </div>
  );
}

interface ChangelogDiffProps {
  incoming: ChangelogEntry[];
  current: ChangelogEntry[];
}

function ChangelogDiff({ incoming, current }: ChangelogDiffProps) {
  const currentByVersion = new Map(current.map((e) => [e.version, e]));
  const incomingByVersion = new Map(incoming.map((e) => [e.version, e]));

  const overwritten = incoming.filter((e) => currentByVersion.has(e.version));
  const added = incoming.filter((e) => !currentByVersion.has(e.version));
  const removed = current.filter((e) => !incomingByVersion.has(e.version));

  const countDelta = incoming.length - current.length;

  return (
    <div className="space-y-3">
      {/* Count summary */}
      <div className="flex flex-wrap gap-3 items-center">
        <span className={`font-mono text-xs ${DK.muted}`}>
          Current: <span className={DK.blue}>{current.length}</span>
        </span>
        <span className={`font-mono text-xs ${DK.muted}`}>→</span>
        <span className={`font-mono text-xs ${DK.muted}`}>
          Incoming: <span className={DK.blue}>{incoming.length}</span>
          {countDelta !== 0 && (
            <span className={countDelta > 0 ? DK.green : DK.red}>
              {" "}({countDelta > 0 ? "+" : ""}{countDelta})
            </span>
          )}
        </span>
      </div>

      {/* Overwritten versions with item-count delta */}
      {overwritten.length > 0 && (
        <div>
          <p className={`font-mono text-[10px] ${DK.yellow} mb-1.5`}>
            ⚡ {overwritten.length} version{overwritten.length !== 1 ? "s" : ""} will be overwritten:
          </p>
          <div className="rounded bg-[#0d1117] divide-y divide-[#30363d]">
            {overwritten.map((e) => {
              const currentItems = countItems(currentByVersion.get(e.version)!);
              const incomingItems = countItems(e);
              const delta = incomingItems - currentItems;
              return (
                <div key={e.version} className="flex items-center gap-3 px-3 py-2 flex-wrap">
                  <span className={`font-mono text-xs font-semibold ${DK.blue} w-16 shrink-0`}>
                    v{e.version}
                  </span>
                  <span className={`font-mono text-[10px] ${DK.muted}`}>
                    was {currentItems} item{currentItems !== 1 ? "s" : ""} →{" "}
                    {incomingItems} item{incomingItems !== 1 ? "s" : ""}
                  </span>
                  {delta !== 0 ? (
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${delta > 0 ? `${DK.green} bg-[#2ea043]/10` : `${DK.red} bg-[#f85149]/10`}`}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  ) : (
                    <span className={`font-mono text-[10px] ${DK.muted}`}>(same content)</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New versions */}
      {added.length > 0 && (
        <div>
          <p className={`font-mono text-[10px] ${DK.green} mb-1.5`}>
            + {added.length} new version{added.length !== 1 ? "s" : ""}:
          </p>
          <div className="rounded bg-[#0d1117] divide-y divide-[#30363d]">
            {added.map((e) => (
              <div key={e.version} className="flex items-center gap-3 px-3 py-2">
                <span className={`font-mono text-xs font-semibold ${DK.blue} w-16 shrink-0`}>
                  v{e.version}
                </span>
                <span className={`font-mono text-[11px] ${DK.muted} w-24 shrink-0`}>{e.date}</span>
                <span className={`font-mono text-[11px] ${DK.green}`}>+{countItems(e)} items</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed versions */}
      {removed.length > 0 && (
        <div>
          <p className={`font-mono text-[10px] ${DK.red} mb-1.5`}>
            − {removed.length} version{removed.length !== 1 ? "s" : ""} will be removed:
          </p>
          <div className="rounded bg-[#0d1117] divide-y divide-[#30363d]">
            {removed.map((e) => (
              <div key={e.version} className="flex items-center gap-3 px-3 py-2">
                <span className={`font-mono text-xs font-semibold ${DK.blue} w-16 shrink-0`}>
                  v{e.version}
                </span>
                <span className={`font-mono text-[11px] ${DK.muted} w-24 shrink-0`}>{e.date}</span>
                <span className={`font-mono text-[11px] ${DK.red}`}>−{countItems(e)} items</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No changes */}
      {overwritten.length === 0 && added.length === 0 && removed.length === 0 && (
        <p className={`font-mono text-xs ${DK.green} px-1`}>✓ No changelog changes — entries match current state</p>
      )}
    </div>
  );
}

/* ─── Main panel ──────────────────────────────────────────────────────────── */

export default function BackupPanel() {
  const [toast, setToast] = useState("");
  const [pendingImport, setPendingImport] = useState<PendingBackupImport | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  const handleExport = () => {
    const versionOverride = localStorage.getItem(DEVKIT_CURRENT_VERSION_KEY);
    const backup: DevKitBackup = {
      _type: "devkit-backup",
      exportedAt: new Date().toISOString(),
      featureFlags: getFeatureFlags(),
      changelogEntries: getDevkitChangelog(),
      effectiveVersionOverride: versionOverride,
    };
    downloadJson(backup, exportFilename("devkit-backup"));
    flash(`✓ Backup exported (flags + ${backup.changelogEntries.length} changelog entr${backup.changelogEntries.length === 1 ? "y" : "ies"})`);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          flash("❌ Invalid file: expected a JSON object");
          return;
        }
        if (parsed._type !== "devkit-backup") {
          flash("❌ Not a DevKit backup file (missing _type: devkit-backup)");
          return;
        }
        if (typeof parsed.featureFlags !== "object" || parsed.featureFlags === null || Array.isArray(parsed.featureFlags)) {
          flash("❌ Invalid file: featureFlags must be an object");
          return;
        }
        if (!Array.isArray(parsed.changelogEntries)) {
          flash("❌ Invalid file: changelogEntries must be an array");
          return;
        }
        const validEntries = (parsed.changelogEntries as unknown[])
          .filter(
            (item): item is ChangelogEntry =>
              typeof item === "object" &&
              item !== null &&
              typeof (item as Record<string, unknown>).version === "string" &&
              typeof (item as Record<string, unknown>).date === "string"
          )
          .map((item) => ({
            ...item,
            en: {
              features: [],
              improvements: [],
              fixes: [],
              ...((item.en && typeof item.en === "object" ? item.en : {}) as object),
            },
            ar: {
              features: [],
              improvements: [],
              fixes: [],
              ...((item.ar && typeof item.ar === "object" ? item.ar : {}) as object),
            },
          })) as ChangelogEntry[];
        const mergedFlags: FeatureFlags = { ...DEFAULT_FLAGS, ...(parsed.featureFlags as object) };
        const rawVersionOverride = parsed.effectiveVersionOverride;
        const effectiveVersionOverride =
          typeof rawVersionOverride === "string" ? rawVersionOverride : null;
        setPendingImport({ featureFlags: mergedFlags, changelogEntries: validEntries, effectiveVersionOverride });
      } catch {
        flash("❌ Failed to parse JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmImport = () => {
    if (!pendingImport) return;
    const { featureFlags, changelogEntries, effectiveVersionOverride } = pendingImport;
    localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(featureFlags));
    window.dispatchEvent(new CustomEvent("local-storage-sync", { detail: { key: FEATURE_FLAGS_KEY } }));
    setDevkitChangelog(changelogEntries);
    if (effectiveVersionOverride !== null) {
      setEffectiveVersion(effectiveVersionOverride);
    } else {
      clearEffectiveVersionOverride();
    }
    setPendingImport(null);
    flash(`✓ Backup applied — flags + ${changelogEntries.length} changelog entr${changelogEntries.length === 1 ? "y" : "ies"} restored`);
  };

  const cancelImport = () => {
    setPendingImport(null);
  };

  const currentFlags = getFeatureFlags();
  const currentChangelog = getDevkitChangelog();

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {toast ? (
          <div
            className={`flex-1 rounded px-3 py-1.5 font-mono text-xs ${
              toast.startsWith("❌")
                ? `bg-[#6e1c1c]/30 border border-[#f85149] ${DK.red}`
                : `bg-[#238636]/20 border border-[#238636] ${DK.green}`
            }`}
          >
            {toast}
          </div>
        ) : (
          <p className={`flex-1 font-mono text-xs ${DK.muted}`}>
            One file containing both feature flags and custom changelog entries.
          </p>
        )}
        <div className="flex gap-2 shrink-0">
          <button onClick={handleExport} className={`${DK.btnBase} ${DK.btnGreen}`}>
            Export backup
          </button>
          <button onClick={() => importRef.current?.click()} className={`${DK.btnBase} ${DK.btnGray}`}>
            Import backup
          </button>
        </div>
        <input
          ref={importRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>

      {/* Import diff preview */}
      {pendingImport && (
        <div className={`rounded-lg ${DK.card} p-4 space-y-4`}>
          <div className={`rounded p-2.5 bg-[#d29922]/10 border border-[#d29922]/30`}>
            <p className={`font-mono text-xs font-semibold ${DK.yellow}`}>
              ⚠ Review changes before applying
            </p>
            <p className={`font-mono text-[10px] ${DK.muted} mt-0.5`}>
              Highlighted differences against your current state
            </p>
          </div>

          {/* Feature flags diff */}
          <div className="space-y-2">
            <p className={`font-mono text-[11px] uppercase tracking-widest ${DK.muted}`}>
              Feature Flags
            </p>
            <FlagsDiff incoming={pendingImport.featureFlags} current={currentFlags} />
          </div>

          {/* Version override preview */}
          <div className="space-y-1">
            <p className={`font-mono text-[11px] uppercase tracking-widest ${DK.muted}`}>
              Effective Version Override
            </p>
            <p className={`font-mono text-xs px-3 py-2 bg-[#0d1117] rounded ${pendingImport.effectiveVersionOverride ? DK.blue : DK.muted}`}>
              {pendingImport.effectiveVersionOverride ?? "None (will clear override)"}
            </p>
          </div>

          {/* Changelog entries diff */}
          <div className="space-y-2">
            <p className={`font-mono text-[11px] uppercase tracking-widest ${DK.muted}`}>
              Changelog Entries
            </p>
            <ChangelogDiff incoming={pendingImport.changelogEntries} current={currentChangelog} />
          </div>

          <p className={`font-mono text-[11px] ${DK.muted}`}>
            Applying will overwrite your current feature flags, version override, and custom changelog entries.
          </p>
          <div className="flex gap-2">
            <button onClick={confirmImport} className={`${DK.btnBase} ${DK.btnGreen}`}>
              Apply backup
            </button>
            <button onClick={cancelImport} className={`${DK.btnBase} ${DK.btnGray}`}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Current snapshot */}
      <div className={`rounded-lg ${DK.card} p-4 space-y-4`}>
        <p className={`font-mono text-[11px] uppercase tracking-widest ${DK.muted}`}>
          Current snapshot (what will be exported)
        </p>

        <div className="space-y-1">
          <p className={`font-mono text-[11px] ${DK.muted} mb-1`}>Effective Version Override</p>
          <p className={`font-mono text-xs px-3 py-2 bg-[#0d1117] rounded ${localStorage.getItem(DEVKIT_CURRENT_VERSION_KEY) ? DK.blue : DK.muted}`}>
            {localStorage.getItem(DEVKIT_CURRENT_VERSION_KEY) ?? `None (using APP_VERSION: ${getEffectiveVersion()})`}
          </p>
        </div>

        <div className="space-y-1">
          <p className={`font-mono text-[11px] ${DK.muted} mb-1`}>Feature Flags</p>
          <pre className={`font-mono text-xs ${DK.text} whitespace-pre-wrap break-all bg-[#0d1117] rounded p-3`}>
            {JSON.stringify(currentFlags, null, 2)}
          </pre>
        </div>

        <div className="space-y-1">
          <p className={`font-mono text-[11px] ${DK.muted} mb-1`}>
            Custom Changelog Entries ({currentChangelog.length})
          </p>
          {currentChangelog.length === 0 ? (
            <p className={`font-mono text-xs ${DK.muted} px-3 py-2 bg-[#0d1117] rounded`}>
              No custom entries.
            </p>
          ) : (
            <div className="rounded bg-[#0d1117] divide-y divide-[#30363d]">
              {currentChangelog.map((e) => {
                const total = countItems(e);
                return (
                  <div key={e.version} className="flex items-center gap-3 px-3 py-2">
                    <span className={`font-mono text-xs font-semibold ${DK.blue} w-16 shrink-0`}>
                      v{e.version}
                    </span>
                    <span className={`font-mono text-[11px] ${DK.muted} w-24 shrink-0`}>
                      {e.date}
                    </span>
                    <span className={`font-mono text-[11px] ${DK.muted}`}>{total} items</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
