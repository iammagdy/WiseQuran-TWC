import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useDeviceId } from "./useDeviceId";
import type { StrictnessLevel } from "@/lib/ayah-match";

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

export interface PerAyahResult {
  numberInSurah: number;
  score: number;
  isCorrect: boolean;
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
  perAyah?: PerAyahResult[];
}

export function useRecitationHistory() {
  const deviceId = useDeviceId();
  const [history, setHistory] = useState<RecitationRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const saveResult = useCallback(async (params: SaveRecitationParams): Promise<void> => {
    const versesRange = `${params.ayahFrom}-${params.ayahTo}`;

    const [legacyResult, sessionResult] = await Promise.all([
      supabase.from("recitation_history").insert({
        device_id: deviceId,
        surah_number: params.surahNumber,
        ayah_from: params.ayahFrom,
        ayah_to: params.ayahTo,
        score: params.score,
        total_ayahs: params.totalAyahs,
        correct_ayahs: params.correctAyahs,
        transcript: params.transcript,
      }),
      supabase.from("recitation_sessions").insert({
        session_id: deviceId,
        surah_number: params.surahNumber,
        verses_range: versesRange,
        accuracy_score: params.score,
        verse_results: params.perAyah ?? [],
        strictness: params.strictness ?? "normal",
      }),
    ]);

    if (legacyResult.error) {
      console.error("Failed to save recitation result:", legacyResult.error.message);
    }
    if (sessionResult.error) {
      console.error("Failed to save recitation session:", sessionResult.error.message);
    }
  }, [deviceId]);

  const fetchHistory = useCallback(async (surahNumber?: number): Promise<void> => {
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
