import { useEffect, useState } from "react";
import { loadWbwSurah, loadWbwManifest, type WbwSurahData } from "@/lib/wbw";

interface State {
  data: WbwSurahData | null;
  loading: boolean;
  /** True when the surah is in the bundled manifest (data should arrive). */
  supported: boolean;
}

const supportedCache = new Map<number, boolean>();

/**
 * Lazy-load WBW data for a surah when `enabled` is true.
 * Idle (no fetch) when disabled, so the typical reader pays nothing.
 */
export function useWbwSurah(surah: number, enabled: boolean): State {
  const [data, setData] = useState<WbwSurahData | null>(null);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState<boolean>(supportedCache.get(surah) ?? true);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const manifest = await loadWbwManifest();
      const isSupported = manifest.supportedSurahs.includes(surah);
      supportedCache.set(surah, isSupported);
      if (cancelled) return;
      setSupported(isSupported);
      if (!isSupported) {
        setData(null);
        setLoading(false);
        return;
      }
      const result = await loadWbwSurah(surah);
      if (cancelled) return;
      setData(result);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [surah, enabled]);

  return { data, loading, supported };
}
