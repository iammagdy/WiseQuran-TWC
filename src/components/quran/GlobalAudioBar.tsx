import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Pause, Play, X } from "lucide-react";
import { useAudioPlayerState, useAudioPlayerTime } from "@/hooks/useAudioPlayer";
import { getReciterById } from "@/lib/reciters";
import NowPlayingScreen from "./NowPlayingScreen";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

function WaveformBars({ playing }: { playing: boolean }) {
  const bars = [0.4, 0.8, 0.6, 1, 0.5, 0.9, 0.3];
  return (
    <div className="flex items-center gap-[3px] h-3 px-1">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-[2.5px] rounded-full bg-primary"
          animate={playing ? {
            scaleY: [height, 1, height * 0.4, 1, height],
            opacity: [0.6, 1, 0.6],
          } : { scaleY: 0.2, opacity: 0.3 }}
          transition={playing ? {
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.1,
            ease: "easeInOut",
          } : { duration: 0.3 }}
          style={{ height: 12, originY: 0.5 }}
        />
      ))}
    </div>
  );
}

export default function GlobalAudioBar() {
  const {
    surahNumber, surahName, playing, loading, playingReciterId,
    togglePlayPause, stop, seek,
  } = useAudioPlayerState();
  const { currentTime, duration } = useAudioPlayerTime();

  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const { language } = useLanguage();

  if (!surahNumber) return null;

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const reciter = getReciterById(playingReciterId);
  const reciterName = language === "en" && reciter.nameEn ? reciter.nameEn : reciter.name;
  const isRTL = language === "ar";

  return (
    <>
      <AnimatePresence>
        {!showNowPlaying && (
          <motion.div
            initial={{ y: 120, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 120, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-x-0 z-[50] px-4 pb-4 pointer-events-none"
            style={{ bottom: 'calc(var(--nav-height) + env(safe-area-inset-bottom, 0px) + 0.25rem)' }}
          >
            <div
              className="glass-card rounded-[2.5rem] pointer-events-auto overflow-hidden max-w-lg mx-auto border-2 border-white/30 shadow-[0_25px_60px_rgba(0,0,0,0.3)] relative group transition-all duration-500 hover:shadow-[0_30px_70px_rgba(0,0,0,0.35)]"
            >
              {/* Layout Frame / Inner Border */}
              <div className="absolute inset-0 rounded-[2.5rem] border border-black/5 pointer-events-none z-30" />
              {/* Iridescent Glow Background */}
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-accent/5 opacity-50 pointer-events-none" />
              
              {/* Interactive progress bar - Liquid style */}
              <div className="relative h-1 w-full bg-black/5 dark:bg-white/5 group/progress cursor-pointer overflow-hidden z-20"
                onClick={(e) => {
                  if (duration > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pctClick = (e.clientX - rect.left) / rect.width;
                    seek(pctClick * duration);
                  }
                }}
              >
                <motion.div
                  className="absolute inset-y-0 start-0"
                  style={{
                    width: `${pct}%`,
                    background: 'linear-gradient(90deg, hsl(var(--primary) / 0.5), hsl(var(--primary)))',
                    boxShadow: '0 0 15px 2px hsl(var(--primary) / 0.3)',
                  }}
                  transition={{ type: "spring", stiffness: 120, damping: 25 }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 1}
                  value={currentTime}
                  onChange={(e) => seek(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0 z-30"
                />
              </div>

              <div
                className="px-5 py-4 cursor-pointer relative z-10 active:scale-[0.99] transition-all duration-300"
                onClick={() => setShowNowPlaying(true)}
                dir={isRTL ? "rtl" : "ltr"}
              >
                <div className="flex items-center gap-4">
                  {/* Control Group */}
                  <div className="shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={(e) => { e.stopPropagation(); togglePlayPause(); }}
                      disabled={loading}
                      className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] text-primary-foreground disabled:opacity-50 shadow-lg relative overflow-hidden group/btn border border-white/20"
                      style={{ 
                        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))',
                        boxShadow: '0 8px 16px -4px hsl(var(--primary) / 0.4), inset 0 1px 1px hsl(0 0% 100% / 0.2)'
                      }}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2.5} />
                      ) : playing ? (
                        <Pause className="h-5 w-5" fill="currentColor" />
                      ) : (
                        <Play className={cn("h-5 w-5", isRTL ? "translate-x-[-1px]" : "translate-x-[1px]")} fill="currentColor" />
                      )}
                    </motion.button>
                  </div>

                  {/* Info Group */}
                  <div className={cn("flex-1 min-w-0 flex flex-col justify-center", isRTL ? "text-end" : "text-start")}>
                    <div className={cn("flex items-center gap-2 mb-0.5", isRTL ? "flex-row" : "flex-row")}>
                      <h3 className="font-serif text-base font-bold text-foreground leading-none tracking-tight truncate">
                        {surahName}
                      </h3>
                      <div className="shrink-0 flex items-center">
                        <WaveformBars playing={playing} />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] leading-none transition-colors group-hover:text-primary/70">
                      {reciterName}
                    </p>
                  </div>

                  {/* Action Group */}
                  <div className="flex items-center gap-2 shrink-0">
                    <motion.button
                      whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => { e.stopPropagation(); stop(); }}
                      className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground/40 hover:text-foreground/80 hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                    >
                      <X className="h-4 w-4" strokeWidth={2.5} />
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <NowPlayingScreen open={showNowPlaying} onOpenChange={setShowNowPlaying} />
    </>
  );
}
