import { useEffect, useState } from "react";
import { useAudioPlayerState, useAudioPlayerTime, useAudioPlayerAyah } from "@/hooks/useAudioPlayer";
import { getAllAudioEntries, audioByteLength } from "@/lib/db";
import { DK, formatBytes } from "./devkit-utils";

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={`flex items-start gap-4 py-2 border-b ${DK.border} last:border-0`}>
      <span className={`w-40 shrink-0 font-mono text-xs ${DK.muted}`}>{label}</span>
      <span className={`font-mono text-xs break-all ${accent ?? DK.text}`}>{value}</span>
    </div>
  );
}

export default function AudioPanel() {
  const stable = useAudioPlayerState();
  const { currentTime, duration } = useAudioPlayerTime();
  const { currentAyahInSurah } = useAudioPlayerAyah();
  const [audioEntries, setAudioEntries] = useState<{ id: string; surahNumber: number; reciterId: string; bytes: number }[]>([]);

  const loadAudio = async () => {
    const all = await getAllAudioEntries();
    setAudioEntries(
      all.map((a) => ({ id: a.id, surahNumber: a.surahNumber, reciterId: a.reciterId, bytes: audioByteLength(a.data) }))
        .sort((a, b) => a.surahNumber - b.surahNumber)
    );
  };

  useEffect(() => {
    void loadAudio();
    const id = setInterval(loadAudio, 5000);
    return () => clearInterval(id);
  }, []);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-4 ${DK.card}`}>
        <div className="flex items-center justify-between mb-3">
          <span className={`font-mono text-xs uppercase tracking-widest ${DK.muted}`}>Player state</span>
          <div className="flex gap-2">
            <button onClick={() => void loadAudio()} className={`${DK.btnBase} ${DK.btnGray}`}>↻</button>
            {stable.playing && (
              <button
                onClick={stable.stop}
                className={`${DK.btnBase} ${DK.btnRed}`}
              >
                ■ Stop
              </button>
            )}
          </div>
        </div>

        <Row
          label="status"
          value={stable.loading ? "loading" : stable.playing ? "playing" : "stopped"}
          accent={stable.playing ? DK.green : stable.loading ? DK.yellow : DK.muted}
        />
        <Row
          label="surah"
          value={stable.surahNumber != null ? `#${stable.surahNumber} ${stable.surahName}` : "—"}
          accent={DK.blue}
        />
        <Row label="reciter" value={stable.playingReciterId || "—"} />
        <Row
          label="time / duration"
          value={`${fmt(currentTime)} / ${fmt(duration)}`}
        />
        <Row
          label="current ayah"
          value={currentAyahInSurah != null ? String(currentAyahInSurah) : "—"}
          accent={DK.blue}
        />
        <Row
          label="ayah mode"
          value={stable.isAyahMode ? `yes (${stable.currentAyahIndex + 1}/${stable.totalAyahs})` : "no"}
        />
        <Row label="offline flag" value={stable.offline ? "yes" : "no"} accent={stable.offline ? DK.red : DK.muted} />
        <Row label="has prev/next" value={`prev: ${stable.hasPrev} · next: ${stable.hasNext}`} />
      </div>

      {audioEntries.length > 0 && (
        <div className={`rounded-lg p-4 ${DK.card}`}>
          <h3 className={`font-mono text-xs uppercase tracking-widest ${DK.muted} mb-3`}>
            Cached audio ({audioEntries.length} files · {formatBytes(audioEntries.reduce((s, a) => s + a.bytes, 0))})
          </h3>
          <div className="max-h-72 overflow-y-auto">
            {audioEntries.map((a) => (
              <div key={a.id} className={`flex gap-3 py-1.5 border-b ${DK.border} last:border-0`}>
                <span className={`font-mono text-xs ${DK.muted} w-8`}>#{a.surahNumber}</span>
                <span className={`font-mono text-xs ${DK.text} flex-1 truncate`}>{a.reciterId}</span>
                <span className={`font-mono text-xs ${DK.green}`}>{formatBytes(a.bytes)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {audioEntries.length === 0 && (
        <div className={`rounded-lg p-4 ${DK.card}`}>
          <p className={`font-mono text-xs ${DK.muted} text-center py-4`}>No audio cached in IndexedDB</p>
        </div>
      )}
    </div>
  );
}
