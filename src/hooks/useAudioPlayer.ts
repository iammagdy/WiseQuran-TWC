import { createContext, useContext } from "react";
import type { Ayah } from "@/lib/quran-api";

/**
 * Hook + context surface for the global audio player.
 *
 * Lives in its own non-`.tsx` module so the provider component file
 * (`src/contexts/AudioPlayerContext.tsx`) exports only React components.
 * That's what unblocks Vite Fast Refresh — co-locating non-component
 * exports (hooks, contexts, types) with a component used to trigger a
 * full-page reload on every save and tank in-progress audio state
 * during development.
 */

export interface AudioPlayerStableState {
  surahNumber: number | null;
  surahName: string;
  playing: boolean;
  loading: boolean;
  offline: boolean;
  playingReciterId: string;
  currentAyahNumber: number | null;
  isAyahMode: boolean;
  currentAyahIndex: number;
  totalAyahs: number;
}

export interface AudioPlayerVolatileState {
  currentTime: number;
  duration: number;
  currentAyahInSurah: number | null;
}

export interface AudioPlayerActions {
  reciterId: string;
  play: (surahNumber: number, surahName: string, ayahs?: Ayah[], reciterIdOverride?: string) => void;
  togglePlayPause: () => Promise<void>;
  seek: (time: number) => void;
  seekToAyah: (ayahNumber: number) => void;
  stop: () => void;
  setPlaybackRate: (rate: number) => void;
  setOnAyahEnded: (cb: (() => void) | null) => void;
  playNextSurah: () => Promise<void>;
  playPreviousSurah: () => Promise<void>;
  hasPrev: boolean;
  hasNext: boolean;
}

export type AudioPlayerStateContextType = AudioPlayerStableState & AudioPlayerActions;
export type AudioPlayerTimeContextType = AudioPlayerVolatileState;
export type AudioPlayerAyahContextType = { currentAyahInSurah: number | null };
export type AudioPlayerContextType = AudioPlayerStateContextType & AudioPlayerTimeContextType;

export const AudioPlayerStateContext = createContext<AudioPlayerStateContextType | null>(null);
export const AudioPlayerTimeContext = createContext<AudioPlayerTimeContextType>({
  currentTime: 0,
  duration: 0,
  currentAyahInSurah: null,
});
// Separate ayah-only context so components that only need
// currentAyahInSurah (e.g. SurahReaderPage, ListeningTab) are NOT
// re-rendered on every 250ms timeupdate tick. This context updates
// only when the ayah number changes.
export const AudioPlayerAyahContext = createContext<AudioPlayerAyahContextType>({
  currentAyahInSurah: null,
});

export function useAudioPlayerState(): AudioPlayerStateContextType {
  const ctx = useContext(AudioPlayerStateContext);
  if (!ctx) throw new Error("useAudioPlayerState must be used within AudioPlayerProvider");
  return ctx;
}

export function useAudioPlayerTime(): AudioPlayerTimeContextType {
  return useContext(AudioPlayerTimeContext);
}

export function useAudioPlayerAyah(): AudioPlayerAyahContextType {
  return useContext(AudioPlayerAyahContext);
}

export function useAudioPlayer(): AudioPlayerContextType {
  const state = useAudioPlayerState();
  const time = useAudioPlayerTime();
  return { ...state, ...time };
}
