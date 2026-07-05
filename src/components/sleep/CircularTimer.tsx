import { useEffect, useRef, useState } from "react";

interface CircularTimerProps {
  totalSeconds: number;
  remainingSeconds: number;
  size?: number;
  /**
   * When true, the progress arc smoothly interpolates between the
   * 1-second `remainingSeconds` ticks using requestAnimationFrame so the
   * ring no longer "jumps" once a second. When false (paused / idle),
   * the arc snaps to the integer `remainingSeconds` value.
   */
  isPlaying?: boolean;
  label?: string;
}

export function CircularTimer({
  totalSeconds,
  remainingSeconds,
  size = 280,
  isPlaying = false,
  label = "remaining",
}: CircularTimerProps) {
  // Stroke + radius scale gently with the ring so the arc looks
  // proportional on both small and large devices.
  const stroke = Math.max(6, Math.round(size * 0.028));
  const radius = (size - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;

  // Capture the wall-clock moment of each `remainingSeconds` tick so the
  // rAF interpolation below knows how many sub-seconds to subtract from
  // it. Using refs avoids re-running the animation effect on every tick.
  const tickStartRef = useRef<number>(performance.now());
  const tickRemainingRef = useRef<number>(remainingSeconds);
  useEffect(() => {
    tickStartRef.current = performance.now();
    tickRemainingRef.current = remainingSeconds;
  }, [remainingSeconds]);

  const initialProgress = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
  const [progress, setProgress] = useState(initialProgress);

  useEffect(() => {
    if (totalSeconds <= 0) {
      setProgress(0);
      return;
    }
    if (!isPlaying) {
      // Snap exactly to the integer remaining when paused/idle so the
      // ring matches the displayed MM:SS.
      setProgress(remainingSeconds / totalSeconds);
      return;
    }
    let raf = 0;
    const tick = () => {
      const elapsed = (performance.now() - tickStartRef.current) / 1000;
      const virtualRemaining = Math.max(0, tickRemainingRef.current - elapsed);
      setProgress(virtualRemaining / totalSeconds);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isPlaying, totalSeconds, remainingSeconds]);

  const strokeDashoffset = circumference * (1 - progress);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  // Text scales with the ring so MM:SS doesn't look lost on tall
  // iPhone screens where the ring is large.
  const timeFontPx = Math.round(size * 0.18);
  const labelFontPx = Math.max(10, Math.round(size * 0.05));

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#86efac" />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#timerGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span
          className="font-light text-amber-100 tabular-nums tracking-wide leading-none"
          style={{ fontSize: `${timeFontPx}px` }}
        >
          {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
        </span>
        <span
          className="text-amber-200/50 font-medium tracking-[0.25em] uppercase leading-none"
          style={{ fontSize: `${labelFontPx}px` }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
