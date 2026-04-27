export const SILENT_MP3 = "data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq6urq//OEAAOAAAAAIAAAAAQAAAADxIAAAeAAAAAAyIQUAAwEEAAAB1wQAAAAG5uP//xQo4BwwMAAECAR/f7//////9/4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAACAAH//OEAAiBQAIAAAQAAAABAAIAB4gAAB4AAAAB0QgUAAQIEAAEB1wQAAABW5+///xRgwBAAIAAACAR/f///////4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAAAIAA//OEAAyBwAIAAAQAAAABAAIAB4gAAB4AAAAB0QgUAAQIEAAEB1wQAAABW5+///xRgwBAAIAAACAR/f///////4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAAAIAA//OEAFAAQAIAAAQAAAABAAIAB4gAAB4AAAAB0QgUAAQIEAAEB1wQAAABW5+///xRgwBAAIAAACAR/f///////4h7/8///Q2P//+T7f///+i//T//4iK5b4AAAAAAAAIAA==";

export type ManagedAudioChannel = "quran" | "alarm" | "preview" | "ambient" | "sleep";

interface PlayOptions {
  forceLoad?: boolean;
  resetTime?: boolean;
  retryDelayMs?: number;
  volume?: number;
}

function normalizeSource(src: string): string {
  if (typeof window === "undefined") return src;
  try {
    return new URL(src, window.location.origin).toString();
  } catch {
    return src;
  }
}

function clampVolume(volume: number | undefined) {
  if (typeof volume !== "number") return undefined;
  return Math.max(0, Math.min(1, volume));
}

class MobileAudioManager {
  private channels = new Map<ManagedAudioChannel, HTMLAudioElement>();
  private primedChannels = new Set<ManagedAudioChannel>();

  getAudio(channel: ManagedAudioChannel): HTMLAudioElement {
    const existing = this.channels.get(channel);
    if (existing) return existing;

    const audio = new Audio();
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.playsInline = true;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");
    this.channels.set(channel, audio);
    return audio;
  }

  async prime(channel: ManagedAudioChannel): Promise<HTMLAudioElement> {
    const audio = this.getAudio(channel);
    if (this.primedChannels.has(channel)) return audio;

    const previousSrc = audio.currentSrc || audio.src;
    const previousTime = audio.currentTime || 0;
    const previousMuted = audio.muted;
    const previousVolume = audio.volume;
    const wasPaused = audio.paused;

    try {
      audio.muted = true;
      audio.volume = 0;
      audio.src = SILENT_MP3;
      audio.load();
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      this.primedChannels.add(channel);
    } catch {
      // Best effort only — some browsers still mark the document as interacted.
    } finally {
      audio.muted = previousMuted;
      audio.volume = previousVolume;

      if (previousSrc && previousSrc !== SILENT_MP3) {
        audio.src = previousSrc;
        audio.load();
        if (!wasPaused) {
          try {
            audio.currentTime = previousTime;
          } catch {
            // Ignore restore failures.
          }
        }
      } else {
        audio.removeAttribute("src");
        audio.load();
      }
    }

    return audio;
  }

  async primeAll(channels: ManagedAudioChannel[] = ["quran", "alarm", "preview", "ambient", "sleep"]) {
    for (const channel of channels) {
      await this.prime(channel);
    }
  }

  async play(channel: ManagedAudioChannel, src?: string, options: PlayOptions = {}) {
    const audio = this.getAudio(channel);
    const { forceLoad = true, resetTime = false, retryDelayMs = 220, volume } = options;

    const normalizedVolume = clampVolume(volume);
    if (normalizedVolume !== undefined) {
      audio.volume = normalizedVolume;
    }

    if (src) {
      const normalizedSrc = normalizeSource(src);
      const currentSrc = audio.currentSrc || audio.src;
      if (currentSrc !== normalizedSrc) {
        audio.src = normalizedSrc;
        if (forceLoad) audio.load();
      }
    }

    if (resetTime) {
      try {
        audio.currentTime = 0;
      } catch {
        // Ignore currentTime reset failures.
      }
    }

    try {
      await audio.play();
      return audio;
    } catch (error) {
      if (src) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        audio.load();
        await audio.play();
        return audio;
      }
      throw error;
    }
  }

  async playWithFallback(channel: ManagedAudioChannel, sources: string[], options: PlayOptions = {}) {
    const uniqueSources = Array.from(new Set(sources.filter(Boolean)));
    let lastError: unknown = null;

    for (const source of uniqueSources) {
      try {
        return await this.play(channel, source, options);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError ?? new Error("No playable audio source available.");
  }

  stop(channel: ManagedAudioChannel, resetSource = false) {
    const audio = this.channels.get(channel);
    if (!audio) return;

    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // Ignore reset failures.
    }

    if (resetSource) {
      audio.removeAttribute("src");
      audio.load();
    }
  }

  stopAll(resetSource = false) {
    this.channels.forEach((_, channel) => this.stop(channel, resetSource));
  }
}

export const mobileAudioManager = new MobileAudioManager();