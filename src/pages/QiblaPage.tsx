import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Navigation, MapPin, CircleAlert as AlertCircle, RefreshCw, Lock, Clock as Unlock, Info, Smartphone, Compass, Camera, CircleCheck as CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn, toArabicNumerals } from "@/lib/utils";
import { useLocation, calculateDistance, getMagneticDeclination } from "@/hooks/useLocation";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const [isLocked, setIsLocked] = useState(false);
  const [lockedHeading, setLockedHeading] = useState<number | null>(null);
  const [showCalibration, setShowCalibration] = useState(false);
  const [isAligned, setIsAligned] = useState(false);
  const [mode, setMode] = useState<"2D" | "3D">("2D");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastVibration = useRef(0);
  const smoothedHeading = useRef<number | null>(null);

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

    const handleOrientation = (e: DeviceOrientationEvent) => {
      // @ts-ignore – webkitCompassHeading is Safari/iOS specific and already True North
      const webkitHeading: number | undefined = e.webkitCompassHeading;

      // @ts-ignore
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
        setHeading(smoothedHeading.current);

        if (accuracy != null && accuracy >= 0) {
          if (accuracy < 15) setCompassAccuracy("high");
          else if (accuracy < 30) setCompassAccuracy("medium");
          else setCompassAccuracy("low");
        }
      }
    };

    // iOS 13+ requires permission
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      (DeviceOrientationEvent as any)
        .requestPermission()
        .then((response: string) => {
          if (response === "granted") {
            window.addEventListener("deviceorientation", handleOrientation, true);
          } else {
            setCompassErrorKey("allow_compass");
          }
        })
        .catch(() => setCompassErrorKey("sensor_error"));
    } else {
      window.addEventListener("deviceorientation", handleOrientation, true);
    }

    return () => window.removeEventListener("deviceorientation", handleOrientation, true);
  }, [isLocked]);

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

  const needleRotation = qiblaBearing !== null && activeHeading !== null
    ? qiblaBearing - activeHeading
    : 0;

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
          setCameraError(null);
        }
      } catch (err) {
        console.error("Camera error:", err);
        setCameraError(
          language === "ar"
            ? "يرجى السماح بالوصول إلى الكاميرا"
            : "Please allow camera access"
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

  const compassError = compassErrorKey ? t(compassErrorKey) : null;
  const error = locationError || compassError;

  return (
    <div className="px-4 pt-6 pb-24 flex flex-col items-center min-h-screen" dir={isRTL ? "rtl" : "ltr"}>
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

      {error ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl bg-destructive/10 p-8 text-center w-full"
        >
          <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <p className="text-destructive text-sm mb-4">{error}</p>
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
              {cameraError ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl bg-destructive/10 p-8 text-center w-full"
                >
                  <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
                  <p className="text-destructive text-sm">{cameraError}</p>
                </motion.div>
              ) : (
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

                  {cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: qiblaBearing - (correctedHeading || 0) }}
                        transition={{ type: "spring", stiffness: 50, damping: 15 }}
                        className="relative"
                      >
                        <motion.div
                          animate={{
                            scale: isAligned ? [1, 1.2, 1] : 1,
                          }}
                          transition={{
                            duration: 0.5,
                            repeat: isAligned ? Infinity : 0,
                          }}
                          className={cn(
                            "text-8xl drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]",
                            isAligned && "drop-shadow-[0_0_30px_rgba(34,197,94,0.8)]"
                          )}
                        >
                          🕋
                        </motion.div>

                        <motion.div className="absolute -bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap">
                          <div className={cn(
                            "px-4 py-2 rounded-full font-bold text-sm shadow-lg backdrop-blur-sm",
                            isAligned
                              ? "bg-emerald-500/90 text-white"
                              : "bg-black/60 text-white"
                          )}>
                            {isAligned
                              ? (language === "ar" ? "✓ اتجاه القبلة" : "✓ Qibla Direction")
                              : (language === "ar" ? "وجّه الكاميرا" : "Point Camera")}
                          </div>
                        </motion.div>
                      </motion.div>
                    </div>
                  )}

                  {isAligned && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-8 left-1/2 -translate-x-1/2"
                    >
                      <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-2 rounded-full shadow-lg">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-sm font-bold">
                          {language === "ar" ? "متجه نحو القبلة" : "Aligned with Qibla"}
                        </span>
                      </div>
                    </motion.div>
                  )}

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
                    <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
                      <p className="text-white text-xs font-medium">
                        {language === "ar" ? `الاتجاه: ${Math.round(qiblaBearing)}°` : `Bearing: ${Math.round(qiblaBearing)}°`}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}

          {/* 2D Compass Mode */}
          {mode === "2D" && (
            <>
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
              <motion.div
                animate={{ rotate: activeHeading !== null ? -activeHeading : 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 25 }}
                className="relative w-64 h-64"
              >
                {/* N/S/E/W labels */}
                <span className="absolute top-2 left-1/2 -translate-x-1/2 text-sm font-bold text-red-500">N</span>
                <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-sm font-bold text-muted-foreground">S</span>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">E</span>
                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">W</span>

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
              </motion.div>
            </div>

            {/* Qibla needle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{ rotate: needleRotation }}
                transition={{ type: "spring", stiffness: 120, damping: 25 }}
                className="relative w-full h-full"
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
              </motion.div>
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
