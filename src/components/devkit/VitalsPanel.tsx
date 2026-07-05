import { useEffect, useState } from "react";
import { DK } from "./devkit-utils";
import { getSessionVitals, clearSessionVitals, type VitalSample } from "@/lib/vitals";

/**
 * Read-only DevKit panel that surfaces the current session's
 * captured Core Web Vitals (LCP / CLS / INP / TTFB). Lets us verify
 * the RUM pipeline is working without opening DevTools.
 */
export default function VitalsPanel() {
  const [samples, setSamples] = useState<VitalSample[]>(() => getSessionVitals());

  useEffect(() => {
    const refresh = () => setSamples(getSessionVitals());
    window.addEventListener("wise-vitals", refresh);
    window.addEventListener("wise-vitals-cleared", refresh);
    const id = setInterval(refresh, 2000);
    return () => {
      window.removeEventListener("wise-vitals", refresh);
      window.removeEventListener("wise-vitals-cleared", refresh);
      clearInterval(id);
    };
  }, []);

  // Only the most-recent sample per metric name is meaningful (LCP /
  // CLS / INP all fire repeatedly with monotonically updating values
  // until the page is hidden). Keep the full ring for the table below.
  const latest = new Map<string, VitalSample>();
  for (const s of samples) latest.set(s.name, s);
  const summary = Array.from(latest.values()).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-4 ${DK.card}`}>
        <p className={`font-mono text-xs ${DK.muted} mb-3`}>
          Latest value per metric in this session
        </p>
        {summary.length === 0 ? (
          <p className={`font-mono text-xs ${DK.subtle}`}>
            No samples captured yet — interact with the page or wait for first paint.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {summary.map((s) => (
              <div
                key={s.name}
                className={`rounded-md p-3 bg-[#0d1117] border ${DK.border}`}
              >
                <p className={`font-mono text-[10px] ${DK.subtle} uppercase tracking-wider`}>
                  {s.name}
                </p>
                <p className={`font-mono text-lg font-bold ${DK.text} mt-0.5`}>
                  {formatVitalValue(s.name, s.value)}
                </p>
                <p className={`font-mono text-[10px] mt-0.5 ${ratingColor(s.rating)}`}>
                  {s.rating}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={`rounded-lg p-4 ${DK.card}`}>
        <div className="flex items-center justify-between mb-2">
          <p className={`font-mono text-xs ${DK.muted}`}>
            Sample log ({samples.length})
          </p>
          <button
            onClick={() => clearSessionVitals()}
            className={`${DK.btnBase} ${DK.btnGray} text-[11px] px-2 py-1`}
          >
            Clear
          </button>
        </div>
        {samples.length === 0 ? (
          <p className={`font-mono text-xs ${DK.subtle}`}>—</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className={`text-start ${DK.subtle}`}>
                  <th className="py-1 pe-3">Time</th>
                  <th className="py-1 pe-3">Metric</th>
                  <th className="py-1 pe-3">Value</th>
                  <th className="py-1 pe-3">Rating</th>
                  <th className="py-1 pe-3">Path</th>
                </tr>
              </thead>
              <tbody>
                {samples
                  .slice()
                  .reverse()
                  .map((s, i) => (
                    <tr key={`${s.id}-${i}`} className={`border-t ${DK.border}`}>
                      <td className={`py-1 pe-3 ${DK.muted}`}>
                        {new Date(s.ts).toLocaleTimeString()}
                      </td>
                      <td className={`py-1 pe-3 ${DK.text}`}>{s.name}</td>
                      <td className={`py-1 pe-3 ${DK.text}`}>
                        {formatVitalValue(s.name, s.value)}
                      </td>
                      <td className={`py-1 pe-3 ${ratingColor(s.rating)}`}>{s.rating}</td>
                      <td className={`py-1 pe-3 ${DK.muted} truncate max-w-[160px]`}>
                        {s.path}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function formatVitalValue(name: string, value: number): string {
  if (name === "CLS") return value.toFixed(3);
  return `${Math.round(value)} ms`;
}

function ratingColor(rating: string): string {
  switch (rating) {
    case "good":
      return "text-[#3fb950]";
    case "needs-improvement":
      return "text-[#d29922]";
    case "poor":
      return "text-[#f85149]";
    default:
      return DK.subtle;
  }
}
