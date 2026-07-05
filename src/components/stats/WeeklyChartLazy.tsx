import { lazy, Suspense } from "react";

/**
 * Lazy boundary for the Stats weekly chart. The actual chart pulls in
 * Recharts (~292 KB unminified), so we keep it out of the home / Quran /
 * Sleep critical paths and only load it once the user opens /stats.
 *
 * The skeleton mirrors the chart's outer card so the page doesn't
 * shift when the lazy chunk arrives.
 */

const WeeklyChartReal = lazy(() =>
  import("./WeeklyChart").then((m) => ({ default: m.WeeklyChart })),
);

interface WeeklyChartLazyProps {
  data: { dayName: string; ayahCount: number; date: string }[];
}

export function WeeklyChart({ data }: WeeklyChartLazyProps) {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl glass-card p-4 shadow-soft">
          <div className="h-4 w-24 rounded bg-muted/50 mb-4" />
          <div className="h-40 rounded bg-muted/30 animate-pulse" />
        </div>
      }
    >
      <WeeklyChartReal data={data} />
    </Suspense>
  );
}
