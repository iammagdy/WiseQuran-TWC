import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Square } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { SpeechRecognitionStatus } from "@/hooks/useSpeechRecognition";

interface Props {
  status: SpeechRecognitionStatus;
  onStart: () => void;
  onStop: () => void;
  transcript: string;
  interimTranscript: string;
}

export default function MicButton({ status, onStart, onStop, transcript, interimTranscript }: Props) {
  const { t, isRTL } = useLanguage();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isListening = status === "listening";
  const isProcessing = status === "processing";

  const hasText = transcript || interimTranscript;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, interimTranscript]);

  return (
    <div className="flex flex-col items-center gap-4 w-full" dir={isRTL ? "rtl" : "ltr"}>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={isListening ? onStop : onStart}
        disabled={isProcessing}
        className={cn(
          "relative w-24 h-24 rounded-full flex items-center justify-center transition-colors shadow-elevated",
          isListening
            ? "bg-destructive text-destructive-foreground"
            : "bg-primary text-primary-foreground",
          isProcessing && "opacity-60 cursor-not-allowed"
        )}
      >
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full bg-destructive/40"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <AnimatePresence mode="wait">
          {isListening ? (
            <motion.div key="stop" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Square className="h-8 w-8" />
            </motion.div>
          ) : isProcessing ? (
            <motion.div key="processing" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <MicOff className="h-8 w-8" />
            </motion.div>
          ) : (
            <motion.div key="mic" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Mic className="h-8 w-8" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <p className="text-sm font-semibold text-center">
        {isListening ? t("listening") : isProcessing ? t("processing") : t("tap_to_speak")}
      </p>

      <AnimatePresence>
        {isListening && (
          <motion.div
            key="transcript-box"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="rounded-xl bg-muted/60 border border-border/40 px-4 py-3 w-full"
          >
            <div
              ref={scrollRef}
              className="max-h-24 overflow-y-auto"
              dir="rtl"
            >
              {hasText ? (
                <p className="font-arabic text-sm leading-relaxed text-center break-words">
                  <span className="text-foreground">{transcript}</span>
                  {transcript && interimTranscript && " "}
                  <span className="text-muted-foreground">{interimTranscript}</span>
                </p>
              ) : (
                <motion.p
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className="text-xs text-muted-foreground text-center"
                >
                  {isRTL ? "جارٍ الاستماع..." : "Listening..."}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
