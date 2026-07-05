import { enqueuedSupabaseWrite } from "@/lib/syncQueue";

export const PRAYER_IDS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
export type PrayerId = (typeof PRAYER_IDS)[number];

export type PrayerDay = Partial<Record<PrayerId, boolean>>;
export type PrayerLog = Record<string, PrayerDay>;

const LOG_KEY = "wise-prayer-log";
const TODAY_KEY = "wise-prayer-today";
const MAX_DAYS = 365;

export function todayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function loadPrayerLog(): PrayerLog {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PrayerLog;
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {
    /* ignore */
  }
  // Backward-compat: migrate from `wise-prayer-today`
  try {
    const raw = localStorage.getItem(TODAY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { date: string; completed: string[] };
      if (parsed?.date && Array.isArray(parsed.completed)) {
        const day: PrayerDay = {};
        for (const p of parsed.completed) {
          if ((PRAYER_IDS as readonly string[]).includes(p)) {
            day[p as PrayerId] = true;
          }
        }
        const log: PrayerLog = { [parsed.date]: day };
        savePrayerLog(log);
        return log;
      }
    }
  } catch {
    /* ignore */
  }
  return {};
}

export function savePrayerLog(log: PrayerLog) {
  // Cap to last MAX_DAYS keys to limit storage growth
  const dates = Object.keys(log).sort();
  let pruned = log;
  if (dates.length > MAX_DAYS) {
    pruned = {};
    for (const d of dates.slice(-MAX_DAYS)) pruned[d] = log[d];
  }
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(pruned));
  } catch {
    /* ignore */
  }
}

export function setPrayerStatus(
  log: PrayerLog,
  date: string,
  prayerId: PrayerId,
  completed: boolean,
): PrayerLog {
  const day: PrayerDay = { ...(log[date] ?? {}) };
  if (completed) day[prayerId] = true;
  else delete day[prayerId];
  const next: PrayerLog = { ...log };
  if (Object.keys(day).length === 0) delete next[date];
  else next[date] = day;
  return next;
}

export function getCompletedToday(log: PrayerLog, date: string = todayKey()): PrayerId[] {
  const day = log[date] ?? {};
  return PRAYER_IDS.filter((p) => day[p]);
}

/**
 * Per-prayer streak: number of consecutive days ending at "today" where
 * `prayerId` was marked. If today is not yet marked, the streak is computed
 * up to yesterday so an unmarked-today doesn't visually break the chain.
 */
export function getPrayerStreak(
  log: PrayerLog,
  prayerId: PrayerId,
  today: Date = new Date(),
): number {
  const todayK = todayKey(today);
  let streak = 0;
  const cursor = new Date(today);
  if (!log[todayK]?.[prayerId]) {
    cursor.setDate(cursor.getDate() - 1);
  }
  // Hard cap at MAX_DAYS to bound iteration
  for (let i = 0; i < MAX_DAYS; i++) {
    const k = todayKey(cursor);
    if (log[k]?.[prayerId]) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Sync today's per-prayer change to Supabase (no-op if user is not signed in).
 */
export function syncPrayerStatus(
  userId: string | null | undefined,
  date: string,
  prayerId: PrayerId,
  completed: boolean,
) {
  if (!userId) return;
  void enqueuedSupabaseWrite(
    "user_prayer_history",
    "upsert",
    {
      user_id: userId,
      date,
      prayer_name: prayerId,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,date,prayer_name" },
  );
}

/**
 * Mirror today's status into the legacy `wise-prayer-today` key so older
 * code paths (e.g. streak hook, devkit) continue to work.
 */
export function writeLegacyToday(date: string, completed: PrayerId[]) {
  try {
    localStorage.setItem(TODAY_KEY, JSON.stringify({ date, completed }));
  } catch {
    /* ignore */
  }
}
