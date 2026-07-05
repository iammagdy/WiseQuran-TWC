import { useSyncExternalStore } from "react";

export type SleepPlaybackStatus = "idle" | "playing" | "paused";

export interface SleepSessionState {
  status: SleepPlaybackStatus;
  remainingSeconds: number;
  totalSeconds: number;
  reciterId: string | null;
  surahNumber: number | null;
}

const initialState: SleepSessionState = {
  status: "idle",
  remainingSeconds: 0,
  totalSeconds: 0,
  reciterId: null,
  surahNumber: null,
};

let state: SleepSessionState = initialState;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

export function getSleepSessionSnapshot(): SleepSessionState {
  return state;
}

export function setSleepSessionState(updates: Partial<SleepSessionState>): void {
  const next = { ...state, ...updates };
  if (
    next.status === state.status &&
    next.remainingSeconds === state.remainingSeconds &&
    next.totalSeconds === state.totalSeconds &&
    next.reciterId === state.reciterId &&
    next.surahNumber === state.surahNumber
  ) {
    return;
  }
  state = next;
  notify();
}

export function resetSleepSessionState(): void {
  if (state === initialState || state.status === "idle") {
    if (state !== initialState) {
      state = initialState;
      notify();
    }
    return;
  }
  state = initialState;
  notify();
}

export function subscribeSleepSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSleepSession(): SleepSessionState {
  return useSyncExternalStore(
    subscribeSleepSession,
    getSleepSessionSnapshot,
    getSleepSessionSnapshot,
  );
}
