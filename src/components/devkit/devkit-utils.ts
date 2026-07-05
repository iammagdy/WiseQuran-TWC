export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatTs(ts: number): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

export function jsonPreview(value: unknown, maxLen = 120): string {
  try {
    const s = JSON.stringify(value);
    return s.length > maxLen ? s.slice(0, maxLen) + "…" : s;
  } catch {
    return String(value);
  }
}

/** Download any object as a pretty-printed JSON file. */
export function downloadJson(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a timestamped export filename, e.g. wise-localstorage-2026-04-16.json */
export function exportFilename(prefix: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `wise-${prefix}-${date}.json`;
}

export const DK = {
  bg: "bg-[#0d1117]",
  sidebar: "bg-[#161b22]",
  card: "bg-[#161b22] border border-[#30363d]",
  text: "text-[#e6edf3]",
  muted: "text-[#8b949e]",
  subtle: "text-[#6e7681]",
  green: "text-[#3fb950]",
  yellow: "text-[#d29922]",
  red: "text-[#f85149]",
  blue: "text-[#79c0ff]",
  border: "border-[#30363d]",
  btnBase:
    "px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
  btnGreen:
    "bg-[#238636] hover:bg-[#2ea043] text-white border border-[#2ea043] shadow-sm",
  btnRed:
    "bg-[#6e1c1c] hover:bg-[#f85149]/20 text-[#f85149] border border-[#f85149]/40",
  btnGray:
    "bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] border border-[#30363d]",
  activeNav:
    "bg-[#388bfd]/15 text-[#79c0ff] border border-[#388bfd]/25",
  hoverNav:
    "hover:bg-[#21262d] hover:text-[#e6edf3]",
  ltr: "text-start",
};
