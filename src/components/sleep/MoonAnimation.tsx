import { motion } from "framer-motion";

interface MoonAnimationProps {
  isPlaying: boolean;
  /** Pixel size of the moon SVG. Defaults to 120. */
  size?: number;
}

export function MoonAnimation({ isPlaying, size = 120 }: MoonAnimationProps) {
  return (
    <motion.div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      animate={isPlaying ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={isPlaying ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      <div className="absolute inset-0 rounded-full bg-amber-300/10 blur-2xl scale-150" />
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]"
      >
        <defs>
          <radialGradient id="moonGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </radialGradient>
          <radialGradient id="craterGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(0,0,0,0.08)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.02)" />
          </radialGradient>
          <clipPath id="moonClip">
            <circle cx="60" cy="60" r="46" />
          </clipPath>
        </defs>

        <circle cx="60" cy="60" r="46" fill="url(#moonGrad)" />

        <circle cx="60" cy="60" r="46" fill="transparent" clipPath="url(#moonClip)">
          <animate attributeName="opacity" values="0;0" dur="1s" />
        </circle>

        <circle cx="42" cy="50" r="6" fill="url(#craterGrad)" />
        <circle cx="72" cy="72" r="4" fill="url(#craterGrad)" />
        <circle cx="80" cy="42" r="3" fill="url(#craterGrad)" />
        <circle cx="55" cy="78" r="2.5" fill="url(#craterGrad)" />

        <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(251,191,36,0.3)" strokeWidth="1" />
      </svg>

      {isPlaying && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border border-amber-300/20"
            animate={{ scale: [1, 1.4, 1.4], opacity: [0.6, 0, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border border-amber-300/15"
            animate={{ scale: [1, 1.7, 1.7], opacity: [0.4, 0, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeOut", delay: 1 }}
          />
        </>
      )}
    </motion.div>
  );
}
