import { useState, useCallback } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { enqueuedSupabaseWrite } from "@/lib/syncQueue";
import { useDeviceId } from "./useDeviceId";
import type { StrictnessLevel, PerAyahScoreResult } from "@/lib/ayah-match";

const LOCAL_HISTORY_KEY = "wise-recitation-history-local";

function loadLocalHistory(deviceId: string): RecitationRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecitationRecord[];
    return parsed.filter((item) => item.device_id === deviceId);
  } catch {
    return [];
  }
}

function saveLocalHistory(deviceId: string, nextRecord: RecitationRecord) {
  const existing = loadLocalHistory(deviceId);
  const merged = [nextRecord, ...existing].slice(0, 100);
  localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(merged));
  return merged;
}

export interface RecitationRecord {
  id: string;
  device_id: string;
  surah_number: number;
  ayah_from: number;
  ayah_to: number;
  score: number;
  total_ayahs: number;
  correct_ayahs: number;
  transcript: string;
  tested_at: string;
}

export interface SaveRecitationParams {
  surahNumber: number;
  ayahFrom: number;
  ayahTo: number;
  score: number;
  totalAyahs: number;
  correctAyahs: number;
  transcript: string;
  strictness?: StrictnessLevel;
  perAyah?: PerAyahScoreResult[];
}

export function useRecitationHistory() {
  const deviceId = useDeviceId();
  const [history, setHistory] = useState<RecitationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const saveResult = useCallback(async (params: SaveRecitationParams): Promise<void> => {
    const testedAt = new Date().toISOString();
    const recordId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${deviceId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const localRecord: RecitationRecord = {
      id: recordId,
      device_id: deviceId,
      surah_number: params.surahNumber,
      ayah_from: params.ayahFrom,
      ayah_to: params.ayahTo,
      score: params.score,
      total_ayahs: params.totalAyahs,
      correct_ayahs: params.correctAyahs,
      transcript: params.transcript,
      tested_at: testedAt,
    };

    if (!isSupabaseConfigured) {
      setHistory(saveLocalHistory(deviceId, localRecord));
      return;
    }

    const versesRange = `${params.ayahFrom}-${params.ayahTo}`;

    await Promise.all([
      enqueuedSupabaseWrite(
        "recitation_history",
        "upsert",
        {
          id: recordId,
          device_id: deviceId,
          surah_number: params.surahNumber,
          ayah_from: params.ayahFrom,
          ayah_to: params.ayahTo,
          score: params.score,
          total_ayahs: params.totalAyahs,
          correct_ayahs: params.correctAyahs,
          transcript: params.transcript,
          tested_at: testedAt,
        },
        { onConflict: "id" }
      ),
      enqueuedSupabaseWrite(
        "recitation_sessions",
        "upsert",
        {
          id: recordId,
          session_id: deviceId,
          surah_number: params.surahNumber,
          verses_range: versesRange,
          accuracy_score: params.score,
          verse_results: (params.perAyah ?? []).map((a) => ({
            numberInSurah: a.numberInSurah,
            score: a.score,
            isCorrect: a.isCorrect,
            wordDiffs: a.wordDiffs ?? [],
          })),
          strictness: params.strictness ?? "normal",
        },
        { onConflict: "id" }
      ),
    ]);
  }, [deviceId]);

  const fetchHistory = useCallback(async (surahNumber?: number): Promise<void> => {
    if (!isSupabaseConfigured) {
      const local = loadLocalHistory(deviceId);
      setHistory(surahNumber === undefined ? local : local.filter((item) => item.surah_number === surahNumber));
      return;
    }

    setLoading(true);
    let query = supabase
      .from("recitation_history")
      .select("*")
      .eq("device_id", deviceId)
      .order("tested_at", { ascending: false })
      .limit(50);

    if (surahNumber !== undefined) {
      query = query.eq("surah_number", surahNumber);
    }

    const { data, error } = await query;
    if (!error && data) {
      setHistory(data as RecitationRecord[]);
    }
    setLoading(false);
  }, [deviceId]);

  const getBestScore = useCallback(async (surahNumber: number, ayahFrom: number, ayahTo: number): Promise<number> => {
    if (!isSupabaseConfigured) {
      const local = loadLocalHistory(deviceId)
        .filter((item) => item.surah_number === surahNumber && item.ayah_from === ayahFrom && item.ayah_to === ayahTo)
        .sort((a, b) => b.score - a.score);
      return local[0]?.score ?? 0;
    }

    const { data } = await supabase
      .from("recitation_history")
      .select("score")
      .eq("device_id", deviceId)
      .eq("surah_number", surahNumber)
      .eq("ayah_from", ayahFrom)
      .eq("ayah_to", ayahTo)
      .order("score", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data?.score ?? 0;
  }, [deviceId]);

  return { saveResult, fetchHistory, getBestScore, history, loading };
}
