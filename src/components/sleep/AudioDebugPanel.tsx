import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  clearAudioDebugEntries,
  getAudioDebugEntries,
  isAudioDebugEnabled,
  setAudioDebugEnabled,
  subscribeAudioDebug,
  type AudioDebugEntry,
} from "@/lib/audio-debug-log";

/**
 * In-app diagnostic panel for the iOS-fragile audio playback chain.
 *
 * Mounted from `SleepModePage` whenever the audio-debug flag is on
 * (`?debug=audio` in the URL, or `localStorage.audioDebug === "1"`).
 * Renders a fixed pill in the bottom-right corner that, when tapped,
 * opens a full-screen modal with the live event timeline, an
 * environment summary, and Copy / Clear actions.
 *
 * The panel is import-side only when the flag is on — but the component
 * itself is small and always-renderable, so it's safe to mount
 * unconditionally and just return null when disabled. That keeps the
 * SleepModePage call site simple and avoids a re-render storm if the
 * user toggles the flag at runtime.
 */
export function AudioDebugPanel() {
  // Re-evaluate the flag on every subscribe-fired re-render so toggling
  // it via setAudioDebugEnabled() in the panel makes the pill appear /
  // disappear without a page reload.
  const enabled = useSyncExternalStore(
    subscribeAudioDebug,
    () => isAudioDebugEnabled(),
    () => false,
  );
  const entries = useSyncExternalStore(
    subscribeAudioDebug,
    getAudioDebugEntries,
    () => [] as readonly AudioDebugEntry[],
  );
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (copyState === "idle") return;
    const t = setTimeout(() => setCopyState("idle"), 1800);
    return () => clearTimeout(t);
  }, [copyState]);

  const env = useMemo(() => collectEnvironmentSummary(), []);

  const formattedLog = useMemo(() => {
    return formatEntriesForCopy(env, entries);
  }, [env, entries]);

  const handleCopy = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(formattedLog);
        setCopyState("copied");
        return;
      }
      throw new Error("clipboard unavailable");
    } catch {
      // Fallback: select the textarea so the user can long-press → Copy
      // on iOS even if the clipboard API rejects (it does in some
      // standalone PWA contexts).
      const ta = document.getElementById("audio-debug-copy-area") as HTMLTextAreaElement | null;
      if (ta) {
        ta.focus();
        ta.select();
      }
      setCopyState("failed");
    }
  }, [formattedLog]);

  const handleClear = useCallback(() => {
    clearAudioDebugEntries();
  }, []);

  const handleDisable = useCallback(() => {
    setAudioDebugEnabled(false);
    setOpen(false);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {/* Floating pill — bottom-right, above the standard safe-area inset */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="audio-debug-pill"
        className="fixed bottom-4 right-4 z-[100] rounded-full border border-amber-400/60 bg-black/70 px-3 py-1.5 text-[11px] font-mono text-amber-200 shadow-lg backdrop-blur"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        audio · {entries.length}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[101] flex flex-col bg-[#05060c] text-white"
          data-testid="audio-debug-modal"
        >
          <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-amber-200">Audio diagnostics</span>
              <span className="text-[11px] text-white/40">{entries.length} events</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md border border-white/20 px-2 py-1 text-xs"
            >
              Close
            </button>
          </header>

          <div className="grid grid-cols-2 gap-2 border-b border-white/10 px-4 py-2 text-[11px] font-mono text-white/60">
            <div>UA: {env.userAgent}</div>
            <div>Standalone: {String(env.standalone)}</div>
            <div>Online: {String(env.online)}</div>
            <div>Visibility: {env.visibility}</div>
            <div>Bundle: {env.bundleVersion}</div>
            <div>SW: {env.swState}</div>
          </div>

          <div className="flex flex-wrap gap-2 px-4 py-2">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-md border border-amber-400/60 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-200"
            >
              {copyState === "copied" ? "Copied!" : copyState === "failed" ? "Long-press → Copy" : "Copy log"}
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-white/20 px-3 py-1.5 text-xs text-white/70"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={handleDisable}
              className="rounded-md border border-rose-400/40 px-3 py-1.5 text-xs text-rose-200"
            >
              Disable & close
            </button>
          </div>

          <div className="flex-1 overflow-auto px-4 pb-6 text-[11px] font-mono leading-snug">
            {entries.length === 0 ? (
              <p className="pt-4 text-white/40">No events yet. Tap Play to populate.</p>
            ) : (
              <ol className="space-y-1">
                {entries.map((e) => (
                  <li key={e.id} className="border-l-2 border-white/10 pl-2">
                    <div>
                      <span className="text-white/40">{e.iso.slice(11, 23)}</span>{" "}
                      <span className={e.error ? "text-rose-300" : "text-amber-200"}>{e.step}</span>
                    </div>
                    {e.payload && (
                      <pre className="whitespace-pre-wrap break-all text-white/60">
                        {safeStringify(e.payload)}
                      </pre>
                    )}
                    {e.error && (
                      <pre className="whitespace-pre-wrap break-all text-rose-300/80">
                        {e.error.name}: {e.error.message}
                        {e.error.stack ? `\n${e.error.stack}` : ""}
                      </pre>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Hidden textarea for the iOS long-press copy fallback. */}
          <textarea
            id="audio-debug-copy-area"
            readOnly
            value={formattedLog}
            className="absolute h-0 w-0 opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </div>
      )}
    </>
  );
}

interface EnvSummary {
  userAgent: string;
  standalone: boolean;
  online: boolean;
  visibility: string;
  bundleVersion: string;
  swState: string;
}

function collectEnvironmentSummary(): EnvSummary {
  if (typeof window === "undefined") {
    return {
      userAgent: "ssr",
      standalone: false,
      online: true,
      visibility: "unknown",
      bundleVersion: readBundleVersion(),
      swState: "unknown",
    };
  }
  const nav = navigator as Navigator & { standalone?: boolean };
  return {
    userAgent: nav.userAgent,
    standalone:
      Boolean(nav.standalone) ||
      window.matchMedia?.("(display-mode: standalone)").matches === true,
    online: nav.onLine,
    visibility: document.visibilityState,
    bundleVersion: readBundleVersion(),
    swState: readSwState(),
  };
}

function readBundleVersion(): string {
  try {
    const v = (import.meta.env?.VITE_APP_VERSION as string | undefined) ?? "";
    if (v) return v;
  } catch {
    /* ignore */
  }
  // Fallback: try the meta tag the SW registration writes (if any).
  if (typeof document !== "undefined") {
    const m = document.querySelector('meta[name="wise-bundle-version"]');
    if (m) return m.getAttribute("content") ?? "unknown";
  }
  return "unknown";
}

function readSwState(): string {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return "unsupported";
  }
  const reg = navigator.serviceWorker.controller;
  if (!reg) return "no-controller";
  return reg.state ?? "unknown";
}

function safeStringify(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload);
  } catch {
    return "[unserializable]";
  }
}

function formatEntriesForCopy(env: EnvSummary, entries: readonly AudioDebugEntry[]): string {
  const header = [
    "=== Wise Quran — audio diagnostics ===",
    `time: ${new Date().toISOString()}`,
    `UA: ${env.userAgent}`,
    `standalone: ${env.standalone}`,
    `online: ${env.online}`,
    `visibility: ${env.visibility}`,
    `bundle: ${env.bundleVersion}`,
    `sw: ${env.swState}`,
    `entries: ${entries.length}`,
    "",
  ].join("\n");
  const lines = entries.map((e) => {
    const parts = [`${e.iso}  ${e.step}`];
    if (e.payload) parts.push(`  payload: ${safeStringify(e.payload)}`);
    if (e.error) {
      parts.push(`  error: ${e.error.name}: ${e.error.message}`);
      if (e.error.stack) parts.push(`  stack: ${e.error.stack.split("\n").slice(0, 6).join(" | ")}`);
    }
    return parts.join("\n");
  });
  return header + lines.join("\n");
}
