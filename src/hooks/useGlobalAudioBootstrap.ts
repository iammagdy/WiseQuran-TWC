import { useEffect } from "react";
import { mobileAudioManager } from "@/lib/mobile-audio";
import { audioDebugLog } from "@/lib/audio-debug-log";

export function useGlobalAudioBootstrap() {
  useEffect(() => {
    let primed = false;
    let audioContextWarmedUp = false;

    audioDebugLog("useGlobalAudioBootstrap:mount");

    const cleanup = () => {
      window.removeEventListener("pointerdown", handleInteraction, true);
      window.removeEventListener("touchstart", handleInteraction, true);
      window.removeEventListener("keydown", handleInteraction, true);
    };

    const warmAudioContext = () => {
      if (audioContextWarmedUp) return;

      const AudioContextCtor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        audioDebugLog("useGlobalAudioBootstrap:warmAudioContext:unsupported");
        return;
      }

      try {
        const ctx = new AudioContextCtor();
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        void ctx.resume().catch(() => {});
        source.start(0);
        audioContextWarmedUp = true;
        audioDebugLog("useGlobalAudioBootstrap:warmAudioContext:success", {
          state: ctx.state,
        });
      } catch (err) {
        audioDebugLog(
          "useGlobalAudioBootstrap:warmAudioContext:error",
          undefined,
          err,
        );
        // Best effort only for iOS Safari audio warm-up.
      }
    };

    const handleInteraction = (event: Event) => {
      if (primed) return;
      primed = true;
      audioDebugLog("useGlobalAudioBootstrap:firstInteraction", {
        type: event.type,
      });
      warmAudioContext();
      cleanup();
      mobileAudioManager.primeAll().then(
        () => {
          audioDebugLog("useGlobalAudioBootstrap:primeAll:success");
        },
        (err) => {
          audioDebugLog(
            "useGlobalAudioBootstrap:primeAll:error",
            undefined,
            err,
          );
          // Best effort bootstrap for mobile browsers.
        },
      );
    };

    window.addEventListener("pointerdown", handleInteraction, { capture: true, passive: true });
    window.addEventListener("touchstart", handleInteraction, { capture: true, passive: true });
    window.addEventListener("keydown", handleInteraction, { capture: true });

    return cleanup;
  }, []);
}