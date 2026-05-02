import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import {
  subscribeAudioDebug,
  getAudioDebugEntries,
  clearAudioDebugEntries,
  isAudioDebugEnabled,
  setAudioDebugEnabled,
  type AudioDebugEntry,
} from "@/lib/audio-debug-log";
import { ChevronDown, Bug } from "lucide-react";

/**
 * Settings → Diagnostics.
 *
 * Reads the always-on diagnostics ring buffer (see `audio-debug-log.ts`)
 * and renders a collapsible disclosure with copy/clear/toggle controls.
 *
 * Crucially, this is reachable WITHOUT enabling the floating debug pill —
 * a user who hits "tap Play, nothing happens" can navigate here, expand
 * the section, and copy the trace. That's the value of capture being
 * always-on regardless of the URL/localStorage flag.
 */
export function DiagnosticsSection() {
  const entries = useSyncExternalStore(
    subscribeAudioDebug,
    getAudioDebugEntries,
    getAudioDebugEntries,
  );
  // Subscribe to the enabled flag separately so toggling the console
  // mirror reliably refreshes the button label even when the entries
  // buffer didn't change. Booleans compare by value, so React's bailout
  // only fires on actual transitions.
  const consoleEnabled = useSyncExternalStore(
    subscribeAudioDebug,
    isAudioDebugEnabled,
    isAudioDebugEnabled,
  );
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const formattedLog = useMemo(() => formatEntriesForCopy(entries), [entries]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedLog);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 2400);
    }
  }, [formattedLog]);

  const handleToggleConsole = useCallback(() => {
    setAudioDebugEnabled(!consoleEnabled);
  }, [consoleEnabled]);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-3">
      <CollapsibleTrigger asChild>
        <button
          type="button"
          data-testid="diagnostics-disclosure"
          className="w-full flex items-center justify-between rounded-xl border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
        >
          <span className="inline-flex items-center gap-1.5">
            <Bug className="h-3.5 w-3.5" />
            Diagnostics ({entries.length})
          </span>
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <div className="rounded-xl border border-border/40 bg-background/40 p-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              data-testid="diagnostics-copy"
              disabled={entries.length === 0}
            >
              {copyState === "copied"
                ? "Copied!"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy log"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => clearAudioDebugEntries()}
              disabled={entries.length === 0}
            >
              Clear
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleToggleConsole}
              data-testid="diagnostics-toggle-console"
            >
              {consoleEnabled ? "Disable console mirror" : "Enable console mirror"}
            </Button>
          </div>

          <div
            className="max-h-72 overflow-auto rounded-lg bg-black/5 dark:bg-white/5 p-2 font-mono text-[11px] leading-snug"
            data-testid="diagnostics-buffer"
          >
            {entries.length === 0 ? (
              <p className="text-muted-foreground">
                No events captured yet. Trigger an action (Play, download, sleep
                session) and any failure or notable transition will be recorded
                here automatically.
              </p>
            ) : (
              <ol className="space-y-1">
                {entries.slice(-50).map((e) => (
                  <li
                    key={e.id}
                    className="border-l-2 border-border/30 pl-2 break-all"
                  >
                    <div>
                      <span className="text-muted-foreground">
                        {e.iso.slice(11, 23)}
                      </span>{" "}
                      <span
                        className={
                          e.error
                            ? "text-rose-500 dark:text-rose-300"
                            : "text-amber-600 dark:text-amber-300"
                        }
                      >
                        {e.step}
                      </span>
                    </div>
                    {e.payload && (
                      <pre className="whitespace-pre-wrap break-all text-muted-foreground/90">
                        {safeStringify(e.payload)}
                      </pre>
                    )}
                    {e.error && (
                      <pre className="whitespace-pre-wrap break-all text-rose-500/90 dark:text-rose-300/80">
                        {e.error.name}: {e.error.message}
                      </pre>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {entries.length > 50 && (
            <p className="text-[10px] text-muted-foreground">
              Showing the latest 50 of {entries.length} events. Use “Copy log” to
              capture all of them (up to the 200-entry ring-buffer cap).
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function safeStringify(payload: Record<string, unknown>): string {
  try {
    return JSON.stringify(payload);
  } catch {
    return "[unserializable]";
  }
}

function formatEntriesForCopy(entries: readonly AudioDebugEntry[]): string {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "ssr";
  const standalone =
    typeof window !== "undefined" &&
    window.matchMedia?.("(display-mode: standalone)")?.matches === true;
  const header = [
    "=== Wise Quran — diagnostics ===",
    `time: ${new Date().toISOString()}`,
    `UA: ${ua}`,
    `standalone: ${standalone}`,
    `entries: ${entries.length}`,
    "",
  ].join("\n");
  const lines = entries.map((e) => {
    const parts = [`${e.iso}  ${e.step}`];
    if (e.payload) parts.push(`  payload: ${safeStringify(e.payload)}`);
    if (e.error) {
      parts.push(`  error: ${e.error.name}: ${e.error.message}`);
      if (e.error.stack) {
        parts.push(`  stack: ${e.error.stack.split("\n").slice(0, 6).join(" | ")}`);
      }
    }
    return parts.join("\n");
  });
  return header + lines.join("\n");
}
