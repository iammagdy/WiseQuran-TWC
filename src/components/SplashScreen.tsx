import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const savedTheme = localStorage.getItem("wise-quran-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = savedTheme ? savedTheme.replace(/"/g, "") === "dark" : prefersDark;
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 2800);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden"
        >
          {/* Layered background */}
          <div className="absolute inset-0 gradient-spiritual" />
          <div className="absolute inset-0 pattern-islamic opacity-50" />

          {/* Radial warm glow in center */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 1 }}
            style={{
              background: "radial-gradient(ellipse 60% 50% at 50% 50%, hsl(var(--primary) / 0.12) 0%, transparent 80%)"
            }}
          />

          {/* Outer decorative rings */}
          <motion.div
            className="absolute rounded-full border border-primary/8"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            style={{ width: 320, height: 320 }}
          />
          <motion.div
            className="absolute rounded-full border border-gold/8"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.15, ease: "easeOut" }}
            style={{ width: 390, height: 390 }}
          />
          <motion.div
            className="absolute rounded-full border border-primary/5"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.6, delay: 0.3, ease: "easeOut" }}
            style={{ width: 460, height: 460 }}
          />

          {/* Floating gold particles */}
          {[...Array(10)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-gold/40"
              style={{
                width: i % 3 === 0 ? 3 : 2,
                height: i % 3 === 0 ? 3 : 2,
                left: `${15 + (i * 7.3) % 70}%`,
                top: `${10 + (i * 9.1) % 80}%`,
              }}
              animate={{
                y: [0, -24, 0],
                opacity: [0.15, 0.55, 0.15],
                scale: [1, 1.4, 1],
              }}
              transition={{
                duration: 3 + (i % 3) * 0.7,
                delay: (i * 0.22) % 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}

          {/* Main content */}
          <div className="relative flex flex-col items-center z-10">
            {/* Logo */}
            <motion.div
              className="relative mb-8"
              initial={{ scale: 0.4, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 18, delay: 0.15 }}
            >
              {/* Gold outer glow ring */}
              <motion.div
                className="absolute rounded-3xl border border-gold/20"
                style={{ inset: -8 }}
                animate={{ opacity: [0.4, 0.2, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />

              {/* Pulsing bg glow */}
              <motion.div
                className="absolute rounded-3xl bg-primary/15"
                style={{ inset: -4 }}
                animate={{ scale: [1, 1.08, 1], opacity: [0.6, 0.2, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-primary/90 to-primary p-[3px] shadow-glow relative z-10">
                <div className="w-full h-full rounded-[22px] bg-background flex items-center justify-center">
                  <img
                    src="/icons/icon-192.png"
                    alt="Wise Quran"
                    width={76}
                    height={76}
                    className="w-[76px] h-[76px] object-contain"
                  />
                </div>
              </div>
            </motion.div>

            {/* Arabesque ornament line */}
            <motion.div
              className="flex items-center gap-3 mb-5 w-48"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold/60" />
              <div className="w-1 h-1 rounded-full bg-gold/40" />
              <div className="w-1.5 h-1.5 rounded-full bg-gold/60" />
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/40" />
            </motion.div>

            {/* App name */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
            >
              <h1 className="text-3xl font-bold text-gradient leading-tight tracking-wide">
                Wise Quran
              </h1>
              <p className="text-2xl font-arabic text-primary/75 mt-1">
                القرآن الكريم
              </p>
            </motion.div>

            {/* Bottom ornament line */}
            <motion.div
              className="flex items-center gap-3 mt-5 w-48"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-primary/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              <div className="w-1 h-1 rounded-full bg-primary/30" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-primary/30" />
            </motion.div>

            {/* Loading dots */}
            <motion.div
              className="mt-10 flex gap-1.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/50"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </motion.div>
          </div>

          {/* Basmala at bottom */}
          <motion.div
            className="absolute bottom-10 text-sm font-arabic text-muted-foreground/60 tracking-wide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            بسم الله الرحمن الرحيم
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
