import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, ArrowLeft, ArrowRight, Camera, CheckCircle, Compass, Info, Lock, MapPin, Navigation, RefreshCw, Smartphone, Unlock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, toArabicNumerals } from "@/lib/utils";
import { useLocation, calculateDistance, getMagneticDeclination } from "@/hooks/useLocation";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

// Kaaba coordinates
const KAABA_LAT = 21.4225;
const KAABA_LNG = 39.8262;

function toRadians(deg: number) {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number) {
  return (rad * 180) / Math.PI;
}

function calculateQibla(lat: number, lng: number): number {
  const phiK = toRadians(KAABA_LAT);
  const lambdaK = toRadians(KAABA_LNG);
  const phi = toRadians(lat);
  const lambda = toRadians(lng);
  const bearing = toDegrees(
    Math.atan2(
      Math.sin(lambdaK - lambda),
      Math.cos(phi) * Math.tan(phiK) - Math.sin(phi) * Math.cos(lambdaK - lambda)
    )
  );
  return (bearing + 360) % 360;
}

type AccuracyLevel = "low" | "medium" | "high";

export default function QiblaPage() {
  const navigate = useNavigate();
  const { location, loading: locationLoading, error: locationError, refresh: refreshLocation } = useLocation(true);
  const { t, language, isRTL } = useLanguage();

  const [heading, setHeading] = useState<number | null>(null);
  const [isIOSCompass, setIsIOSCompass] = useState(false);
  const [compassAccuracy, setCompassAccuracy] = useState<AccuracyLevel>("medium");
  const [compassErrorKey, setCompassErrorKey] = useState<string | null>(null);
  // iOS 13+ requires DeviceOrientationEvent.requestPermission() from a user gesture.
  const iosNeedsPermission = typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function";
  const [compassStarted, setCompassStarted] = useState<boolean>(!iosNeedsPermission);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedHeading, setLockedHeading] = useState<number | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [isAligned, setIsAligned] = useState(false);
  const [mode, setMode] = useState<"2D" | "3D">("2D");
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVibration = useRef(0);
  const smoothedHeading = useRef<number | null>(null);
  const rafId = useRef<number>(0);
  const pendingHeading = useRef<number | null>(null);
  const continuousNeedleRotation = useRef<number>(0);
  const lastNeedleRotation = useRef<number | null>(null);
  const continuous3DRotation = useRef<number>(0);
  const last3DRotation = useRef<number | null>(null);

  const qiblaBearing = location ? calculateQibla(location.latitude, location.longitude) : null;
  const distanceToKaaba = location ? calculateDistance(location.latitude, location.longitude, KAABA_LAT, KAABA_LNG) : null;
  const magneticDeclination = location ? getMagneticDeclination(location.latitude, location.longitude) : 0;

  // iOS webkitCompassHeading already returns True North (declination applied internally)
  // Android alpha needs manual screen-orientation compensation + declination
  const correctedHeading = heading !== null
    ? isIOSCompass
      ? heading
      : (heading + magneticDeclination + 360) % 360
    : null;
  const activeHeading = isLocked ? lockedHeading : correctedHeading;

  // Device orientation
  useEffect(() => {
    if (isLocked) return;
    if (!compassStarted) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // @ts-expect-error – webkitCompassHeading is Safari/iOS specific and already True North
      const webkitHeading: number | undefined = e.webkitCompassHeading;

      // @ts-expect-error – webkitCompassAccuracy is Safari/iOS-only
      const accuracy = e.webkitCompassAccuracy;

      let rawHeading: number | null = null;

      if (webkitHeading != null && webkitHeading >= 0) {
        // iOS: already compensated for True North, no further declination needed
        setIsIOSCompass(true);
        rawHeading = webkitHeading;
      } else if (e.alpha !== null) {
        // Android/Chrome: alpha is CCW from South, need to convert + screen orientation
        const screenAngle = (window.screen?.orientation?.angle ?? 0);
        rawHeading = (360 - e.alpha + screenAngle) % 360;
        setIsIOSCompass(false);
      }

      if (rawHeading !== null) {
        // Exponential smoothing to reduce jitter (factor 0.15 = smooth, 1.0 = raw)
        if (smoothedHeading.current === null) {
          smoothedHeading.current = rawHeading;
        } else {
          // Handle wraparound at 0/360
          let diff = rawHeading - smoothedHeading.current;
          if (diff > 180) diff -= 360;
          if (diff < -180) diff += 360;
          smoothedHeading.current = (smoothedHeading.current + diff * 0.2 + 360) % 360;
        }
        pendingHeading.current = smoothedHeading.current;

        if (!rafId.current) {
          rafId.current = requestAnimationFrame(() => {
            if (pendingHeading.current !== null) {
              setHeading(pendingHeading.current);
            }
            rafId.current = 0;
          });
        }

        if (accuracy != null && accuracy >= 0) {
          if (accuracy < 15) setCompassAccuracy("high");
          else if (accuracy < 30) setCompassAccuracy("medium");
          else setCompassAccuracy("low");
        }
      }
    };

    // Prefer absolute event on Android (true magnetic heading) and fall back to relative
    const supportsAbsolute = "ondeviceorientationabsolute" in window;

    if (supportsAbsolute) {
      // `deviceorientationabsolute` is an Android-only, non-standard event,
      // so it isn't in lib.dom's WindowEventMap. We feed it the same
      // DeviceOrientationEvent handler the standard event uses. Using
      // @ts-expect-error here (rather than `as keyof WindowEventMap` /
      // `as EventListener`) keeps us out of `check:no-undef`'s way —
      // those names are TS-only types ESLint can't resolve as runtime
      // globals.
      // @ts-expect-error - non-standard Android event, not in WindowEventMap
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
    }
    window.addEventListener("deviceorientation", handleOrientation, true);

    return () => {
      if (supportsAbsolute) {
        // @ts-expect-error - non-standard Android event, not in WindowEventMap
        window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      }
      window.removeEventListener("deviceorientation", handleOrientation, true);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [isLocked, compassStarted]);

  const handleStartCompass = useCallback(async () => {
    if (!iosNeedsPermission) {
      setCompassStarted(true);
      return;
    }
    try {
      const response: string = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
      if (response === "granted") {
        setCompassErrorKey(null);
        setCompassStarted(true);
      } else {
        setCompassErrorKey("allow_compass");
      }
    } catch {
      setCompassErrorKey("sensor_error");
    }
  }, [iosNeedsPermission]);

  // Check alignment and provide haptic feedback
  useEffect(() => {
    if (qiblaBearing === null || activeHeading === null) return;

    const needleRotation = qiblaBearing - activeHeading;
    const normalizedRotation = ((needleRotation % 360) + 360) % 360;
    const aligned = normalizedRotation < 5 || normalizedRotation > 355;

    setIsAligned(aligned);

    // Haptic feedback when aligned
    if (aligned && Date.now() - lastVibration.current > 1000) {
      if ("vibrate" in navigator) {
        navigator.vibrate([50, 50, 50]);
      }
      lastVibration.current = Date.now();
    }
  }, [qiblaBearing, activeHeading]);

  const toggleLock = useCallback(() => {
    if (isLocked) {
      setIsLocked(false);
      setLockedHeading(null);
    } else if (correctedHeading !== null) {
      setIsLocked(true);
      setLockedHeading(correctedHeading);
    }
  }, [isLocked, correctedHeading]);

  // Continuous, unwrapped needle rotation so CSS transitions never spin the long way around
  // when the heading crosses 0°/360°. We track the previous wrapped value and add the
  // shortest signed delta to a running accumulator.
  let needleRotation = 0;
  if (qiblaBearing !== null && activeHeading !== null) {
    const target = qiblaBearing - activeHeading;
    if (lastNeedleRotation.current === null) {
      continuousNeedleRotation.current = target;
    } else {
      let delta = target - lastNeedleRotation.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      continuousNeedleRotation.current += delta;
    }
    lastNeedleRotation.current = target;
    needleRotation = continuousNeedleRotation.current;
  }

  // Same unwrapping for the 3D arrow
  let arrow3DRotation = 0;
  if (qiblaBearing !== null) {
    const target = qiblaBearing - (correctedHeading || 0);
    if (last3DRotation.current === null) {
      continuous3DRotation.current = target;
    } else {
      let delta = target - last3DRotation.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      continuous3DRotation.current += delta;
    }
    last3DRotation.current = target;
    arrow3DRotation = continuous3DRotation.current;
  }

  useEffect(() => {
    if (mode !== "3D") return;

    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          stream = mediaStream;
          setCameraReady(true);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setMode("2D");
        setCameraReady(false);
        toast.message(
          language === "ar"
            ? "تعذّر الوصول إلى الكاميرا — تم التبديل إلى البوصلة 2D"
            : "Camera unavailable — switched to 2D compass"
        );
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setCameraReady(false);
    };
  }, [mode, language]);


  return (
    <div className="px-4 pt-6 pb-24 flex flex-col items-center fixed inset-0 overflow-y-auto touch-manipulation overscroll-none" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3 self-start w-full">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate(-1)}
          className="rounded-xl p-2.5 hover:bg-muted transition-colors"
        >
          {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
        </motion.button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold heading-decorated">{t("qibla_title")}</h1>
          <p className="text-sm text-muted-foreground">{t("qibla_description")}</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={refreshLocation}
          className="rounded-xl p-2.5 hover:bg-muted transition-colors"
          disabled={locationLoading}
        >
          <RefreshCw className={cn("h-5 w-5", locationLoading && "animate-spin")} />
        </motion.button>
      </div>

      {!location && locationLoading && !locationError ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-card border border-border/50 p-8 text-center w-full flex flex-col items-center gap-3 shadow-soft"
        >
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">{t("qibla_locating_caption")}</p>
        </motion.div>
      ) : locationError ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-destructive/10 p-8 text-center w-full"
        >
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-destructive text-sm mb-4">{locationError}</p>
          <button
            onClick={refreshLocation}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            {t("retry")}
          </button>
        </motion.div>
      ) : (
        <>
          {/* Mode Selector */}
          <div className="flex gap-2 rounded-2xl bg-muted/40 p-1.5 w-full max-w-sm mb-6">
            <button
              onClick={() => setMode("2D")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all",
                mode === "2D"
                  ? "bg-card shadow-soft text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Compass className="h-4 w-4" />
              {language === "ar" ? "قبلة 2D" : "2D Compass"}
            </button>
            <button
              onClick={() => setMode("3D")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all",
                mode === "3D"
                  ? "bg-card shadow-soft text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Camera className="h-4 w-4" />
              {language === "ar" ? "قبلة 3D" : "3D AR"}
            </button>
          </div>

          {/* 3D AR Mode */}
          {mode === "3D" && qiblaBearing !== null && (
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full max-w-md aspect-[3/4] rounded-3xl overflow-hidden shadow-elevated bg-black"
              >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />

                  {/* Dark gradient overlay for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none" />

                  {!cameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                      <div className="w-10 h-10 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <p className="text-white/70 text-sm">{language === "ar" ? "جاري تشغيل الكاميرا..." : "Starting camera..."}</p>
                    </div>
                  )}

                  {cameraReady && (
                    <>
                      {/* Depth rings */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {[140, 100, 60].map((size, i) => (
                          <div
                            key={i}
                            className="absolute rounded-full border border-white/10"
                            style={{ width: size, height: size }}
                          />
                        ))}
                      </div>

                      {/* Compass rose + direction indicator */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: arrow3DRotation }}
                          transition={{ type: "spring", stiffness: 60, damping: 18 }}
                          className="relative flex flex-col items-center"
                          style={{ width: 120, height: 200 }}
                        >
                          {/* Arrow shaft */}
                          <div className="flex flex-col items-center" style={{ height: 120 }}>
                            {/* Arrowhead */}
                            <div
                              className={cn(
                                "w-0 h-0 transition-all duration-300",
                                isAligned
                                  ? "drop-shadow-[0_0_12px_rgba(16,185,129,1)]"
                                  : "drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                              )}
                              style={{
                                borderLeft: "12px solid transparent",
                                borderRight: "12px solid transparent",
                                borderBottom: `22px solid ${isAligned ? "#10b981" : "white"}`,
                              }}
                            />
                            {/* Shaft */}
                            <div
                              className="w-1.5 flex-1 rounded-b-full"
                              style={{ background: isAligned ? "linear-gradient(to bottom, #10b981, #059669)" : "linear-gradient(to bottom, white, rgba(255,255,255,0.3))" }}
                            />
                          </div>

                          {/* Kaaba icon at base */}
                          <motion.div
                            animate={isAligned ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                            transition={{ duration: 0.8, repeat: isAligned ? Infinity : 0 }}
                            className={cn(
                              "text-4xl drop-shadow-[0_0_16px_rgba(0,0,0,0.9)] mt-2",
                              isAligned && "drop-shadow-[0_0_20px_rgba(16,185,129,0.8)]"
                            )}
                          >
                            🕋
                          </motion.div>
                        </motion.div>
                      </div>

                      {/* Aligned pulse ring */}
                      <AnimatePresence>
                        {isAligned && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          >
                            <motion.div
                              animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute w-32 h-32 rounded-full border-2 border-emerald-400"
                            />
                            <motion.div
                              animate={{ scale: [1, 2, 2], opacity: [0.4, 0, 0] }}
                              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                              className="absolute w-32 h-32 rounded-full border border-emerald-400"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Top status badge */}
                      <AnimatePresence>
                        {isAligned && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-5 left-1/2 -translate-x-1/2"
                          >
                            <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-bold">
                                {language === "ar" ? "متجه نحو القبلة" : "Aligned with Qibla"}
                              </span>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Instruction text */}
                      {!isAligned && (
                        <div className="absolute top-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <div className="bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full">
                            {language === "ar" ? "وجّه الهاتف نحو الأفق" : "Point phone toward horizon"}
                          </div>
                        </div>
                      )}

                      {/* Bottom info bar */}
                      <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between">
                        <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                          <p className="text-white text-xs font-medium tabular-nums">
                            {language === "ar" ? `القبلة ${Math.round(qiblaBearing)}°` : `Qibla ${Math.round(qiblaBearing)}°`}
                          </p>
                        </div>
                        {correctedHeading !== null && (
                          <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                            <p className="text-white text-xs font-medium tabular-nums">
                              {language === "ar" ? `البوصلة ${Math.round(correctedHeading)}°` : `Compass ${Math.round(correctedHeading)}°`}
                            </p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
              </motion.div>
            </AnimatePresence>
          )}

          {/* 2D Compass Mode */}
          {mode === "2D" && (
            <>
              {!compassStarted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-sm mb-6 rounded-2xl border border-border/60 bg-card p-6 text-center shadow-soft"
                >
                  <Compass className="h-10 w-10 text-primary mx-auto mb-3" />
                  <h3 className="text-base font-bold mb-1">
                    {language === "ar" ? "تشغيل البوصلة" : "Start Compass"}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    {language === "ar"
                      ? "يتطلب iOS منح الإذن لاستخدام مستشعر الاتجاه. اضغط للمتابعة."
                      : "iOS requires permission to use the orientation sensor. Tap to continue."}
                  </p>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={handleStartCompass}
                    className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground shadow-soft"
                  >
                    {language === "ar" ? "تشغيل البوصلة" : "Start Compass"}
                  </motion.button>
                  {compassErrorKey && (
                    <p className="mt-3 text-xs text-destructive">
                      {t(compassErrorKey)}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Accuracy Indicator */}
          <div className="flex items-center justify-center gap-4 mb-4 w-full">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("compass_accuracy")}</span>
              <div className="flex gap-1">
                {["low", "medium", "high"].map((level, i) => (
                  <div
                    key={level}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      compassAccuracy === "high" || (compassAccuracy === "medium" && i < 2) || (compassAccuracy === "low" && i === 0)
                        ? "bg-primary"
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
            </div>

            {compassAccuracy === "low" && (
              <button
                onClick={() => setShowCalibration(true)}
                className="text-xs text-primary font-medium hover:underline"
              >
                {t("calibrate")}
              </button>
            )}
          </div>

          {/* Compass */}
          <div dir="ltr" className={cn(
            "relative w-72 h-72 mb-6 transition-all duration-300",
            isAligned && "scale-105"
          )}>
            {/* Glow effect when aligned */}
            <AnimatePresence>
              {isAligned && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 rounded-full bg-primary/20 blur-xl"
                />
              )}
            </AnimatePresence>

            {/* Outer ring */}
            <div className={cn(
              "absolute inset-0 rounded-full border-2 shadow-elevated transition-colors duration-300",
              isAligned ? "border-primary/50" : "border-border/50"
            )} />

            {/* Cardinal directions */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative w-64 h-64"
                style={{
                  transform: `rotate(${activeHeading !== null ? -activeHeading : 0}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
              >
                {/* N/S/E/W labels */}
                <span className="absolute top-2 left-1/2 -translate-x-1/2 text-sm font-bold text-red-500">N</span>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold text-muted-foreground">S</span>
                <span className="absolute end-2 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">E</span>
                <span className="absolute start-2 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">W</span>

                {/* Tick marks */}
                {Array.from({ length: 36 }).map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-1/2 top-0 origin-[center_128px]"
                    style={{ transform: `translateX(-50%) rotate(${i * 10}deg)` }}
                  >
                    <div className={cn(
                      "w-px mx-auto",
                      i % 9 === 0 ? "h-3 bg-foreground/60" : "h-1.5 bg-border"
                    )} />
                  </div>
                ))}
              </div>
            </div>

            {/* Qibla needle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="relative w-full h-full"
                style={{
                  transform: `rotate(${needleRotation}deg)`,
                  transition: 'transform 0.15s ease-out',
                }}
              >
                {/* Needle pointing up */}
                <div className="absolute left-1/2 top-8 -translate-x-1/2 flex flex-col items-center">
                  <div className={cn(
                    "w-1 h-24 rounded-full transition-colors duration-300",
                    isAligned
                      ? "bg-gradient-to-b from-primary via-primary to-primary/50 shadow-glow"
                      : "bg-gradient-to-b from-primary to-primary/30"
                  )} />
                </div>
                {/* Kaaba icon at top */}
                <div className="absolute left-1/2 top-3 -translate-x-1/2">
                  <motion.div
                    animate={isAligned ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: isAligned ? Infinity : 0, duration: 1 }}
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                      isAligned ? "bg-primary shadow-glow" : "bg-primary/80"
                    )}
                  >
                    <span className="text-primary-foreground text-sm">🕋</span>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Center dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={cn(
                "w-4 h-4 rounded-full border-2 border-primary-foreground transition-all duration-300",
                isAligned ? "bg-primary shadow-glow scale-110" : "bg-primary"
              )} />
            </div>
          </div>

          {/* Lock button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleLock}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2.5 mb-6 transition-all",
              isLocked
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            <span className="text-sm font-medium">{isLocked ? t("compass_locked") : t("lock_compass")}</span>
          </motion.button>

          {/* Info Cards */}
          <div className="w-full space-y-3">
            {/* Qibla bearing */}
            {qiblaBearing !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-2xl bg-card p-5 shadow-elevated border transition-all duration-300",
                  isAligned ? "border-primary/30 bg-primary/5" : "border-border/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">{t("qibla_direction")}</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{language === "en" ? Math.round(qiblaBearing) : toArabicNumerals(Math.round(qiblaBearing))}°</p>
                </div>
                {isAligned && (
                  <p className="text-xs text-primary font-medium mt-2 text-center">
                    {t("facing_qibla")}
                  </p>
                )}
              </motion.div>
            )}

            {/* Distance to Kaaba */}
            {distanceToKaaba !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl bg-card p-5 shadow-elevated border border-border/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-accent" />
                    <span className="text-sm font-medium text-muted-foreground">{t("distance_to_kaaba")}</span>
                  </div>
                  <p className="text-xl font-bold text-accent">
                    {language === "en" ? Math.round(distanceToKaaba).toLocaleString() : toArabicNumerals(Math.round(distanceToKaaba).toLocaleString())} {t("km")}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Location info */}
            {location && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl bg-card p-5 shadow-elevated border border-border/50"
              >
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{t("your_location")}</span>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {location.city && (
                    <p className="text-sm font-medium text-foreground">{location.city}</p>
                  )}
                  <p>
                    {language === "en" ? location.latitude.toFixed(4) : toArabicNumerals(location.latitude.toFixed(4))}°, {language === "en" ? location.longitude.toFixed(4) : toArabicNumerals(location.longitude.toFixed(4))}°
                  </p>
                  <p className="flex items-center gap-1">
                    <span>{t("location_accuracy")}</span>
                    <span className="font-medium">±{language === "en" ? Math.round(location.accuracy) : toArabicNumerals(Math.round(location.accuracy))} {t("meters")}</span>
                  </p>
                </div>
              </motion.div>
            )}
          </div>

              {/* No compass hint */}
              {heading === null && !compassErrorKey && (
                <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                  <Smartphone className="h-4 w-4 animate-pulse" />
                  <span className="text-sm">{t("move_device")}</span>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Calibration Modal */}
      <AnimatePresence>
        {showCalibration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowCalibration(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-6 shadow-elevated max-w-sm w-full text-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Info className="h-10 w-10 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-2">{t("calibration_title")}</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {t("calibration_desc")}
              </p>
              <div className="text-6xl mb-4">∞</div>
              <button
                onClick={() => setShowCalibration(false)}
                className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground"
              >
                {t("ok")}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-4" />
    </div>
  );
}
