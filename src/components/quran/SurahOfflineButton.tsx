import { useEffect, useRef, useState } from "react";
import { Check, Download, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DEFAULT_RECITER } from "@/lib/reciters";
import { DEFAULT_TAFSIR } from "@/data/tafsir-editions";
import {
  downloadSurahForOffline,
  isSurahFullyOffline,
  formatBytes,
} from "@/lib/offline-surah";

/**
 * One-tap "Download for offline" button for a single surah.
 *
 * Idle state shows a download glyph. Tapping starts a unified download
 * (audio + mushaf text + tafsir for the user's selected reciter and
 * the bundled offline tafsir). A second tap during the download
 * cancels and rolls back any partial state. After completion the
 * button shows a check.
 *
 * Used inside `<motion.div role="button">` surah cards in `QuranPage`,
 * so it stops pointer/click propagation to avoid also triggering the
 * card's "open reader" navigation.
 */
export default function SurahOfflineButton({
  surahNumber,
  className,
}: {
  surahNumber: number;
  className?: string;
}) {
  const { language } = useLanguage();
  const [reciterId] = useLocalStorage<string>("wise-reciter", DEFAULT_RECITER);
  const [tafsirId] = useLocalStorage<string>("wise-tafsir", DEFAULT_TAFSIR);

  const [state, setState] = useState<"idle" | "downloading" | "done">("idle");
  const [pct, setPct] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Lightweight presence check on mount and whenever the user changes
  // their reciter/tafsir (those affect what counts as "fully offline").
  // Must reset to "idle" when the new selection is *not* fully cached,
  // otherwise the button would stay stuck on "done" after switching to
  // a reciter the user hasn't downloaded yet.
  useEffect(() => {
    let cancelled = false;
    void isSurahFullyOffline({ surahNumber, reciterId, tafsirId }).then((ok) => {
      if (cancelled) return;
      // Don't clobber an in-flight download with a stale presence check.
      setState((prev) => (prev === "downloading" ? prev : ok ? "done" : "idle"));
      if (!ok) setPct(0);
    });
    return () => {
      cancelled = true;
    };
  }, [surahNumber, reciterId, tafsirId]);

  // Cancel any in-flight download if the surah card unmounts.
  useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    [],
  );

  const stop = (e: React.MouseEvent | React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleClick = async (e: React.MouseEvent) => {
    stop(e);
    if (state === "downloading") {
      abortRef.current?.abort();
      return;
    }
    if (state === "done") {
      // No-op when already cached. The Settings → Storage page is the
      // place to clear data; we don't want a stray tap to delete a
      // 30 MB recitation by accident.
      toast.info(
        language === "ar"
          ? "هذه السورة محفوظة للاستخدام بدون اتصال"
          : "This surah is saved for offline use",
      );
      return;
    }

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState("downloading");
    setPct(0);
    try {
      const result = await downloadSurahForOffline({
        surahNumber,
        reciterId,
        tafsirId,
        signal: ctrl.signal,
        onProgress: setPct,
      });
      // Verify everything actually landed in IDB before showing
      // success — the orchestrator already throws on hard failures,
      // but a post-hoc check guards against partial state slipping
      // through (e.g. quota eviction between save and read).
      const verified = await isSurahFullyOffline({ surahNumber, reciterId, tafsirId });
      if (!verified) {
        throw new Error(
          language === "ar"
            ? "لم يكتمل حفظ السورة بالكامل"
            : "Surah did not fully save offline",
        );
      }
      setState("done");
      setPct(100);
      toast.success(
        language === "ar"
          ? `تم حفظ السورة (${formatBytes(result.totalBytes)})`
          : `Saved offline (${formatBytes(result.totalBytes)})`,
      );
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info(language === "ar" ? "تم إلغاء التنزيل" : "Download cancelled");
      } else {
        toast.error(
          err instanceof Error
            ? err.message
            : language === "ar"
              ? "فشل التنزيل"
              : "Download failed",
        );
      }
      setState("idle");
      setPct(0);
    } finally {
      abortRef.current = null;
    }
  };

  const label =
    state === "downloading"
      ? language === "ar"
        ? "إلغاء التنزيل"
        : "Cancel download"
      : state === "done"
        ? language === "ar"
          ? "محفوظة"
          : "Saved offline"
        : language === "ar"
          ? "تحميل للاستخدام بدون اتصال"
          : "Download for offline";

  return (
    <button
      type="button"
      onClick={handleClick}
      onPointerDown={stop}
      aria-label={label}
      title={label}
      className={cn(
        "relative z-20 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-foreground/60 transition-all hover:border-primary/30 hover:text-primary active:scale-95",
        state === "done" && "border-primary/30 bg-primary/10 text-primary",
        state === "downloading" && "border-primary/40 bg-primary/10 text-primary",
        className,
      )}
    >
      {state === "downloading" ? (
        <>
          {/* Cancel-X glyph layered over the spinner */}
          <Loader2 className="absolute h-4 w-4 animate-spin" />
          <X className="h-3 w-3" />
          {pct > 0 && (
            <span className="absolute -bottom-3.5 text-[0.55rem] font-semibold tabular-nums text-primary">
              {pct}%
            </span>
          )}
        </>
      ) : state === "done" ? (
        <Check className="h-4 w-4" />
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  );
}
