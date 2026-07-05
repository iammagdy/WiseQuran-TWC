import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { calculatePrayerTimes } from "@/lib/prayer-times";
import { useLocation } from "@/hooks/useLocation";
import { toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

export default function IftarCountdown() {
  const { location } = useLocation();
  const { t, language } = useLanguage();
  const [remaining, setRemaining] = useState<number | null>(null);
  const [passed, setPassed] = useState(false);
  const notifiedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const options = location ?
        { latitude: location.latitude, longitude: location.longitude } :
        {};
      const times = calculatePrayerTimes(now, options);
      const [h, m] = times.maghrib.split(":").map(Number);

      const maghribSeconds = h * 3600 + m * 60;
      const nowSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const diff = maghribSeconds - nowSeconds;

      if (diff <= 0) {
        setPassed(true);
        setRemaining(0);

        if (!notifiedRef.current) {
          notifiedRef.current = true;
          if ("Notification" in window && Notification.permission === "granted") {
            const isAr = language === "ar";
            new Notification(t("iftar_time"), {
              body: t("iftar_dua_text"),
              icon: "/icons/icon-192.png",
              dir: isAr ? "rtl" : "ltr",
              lang: isAr ? "ar" : "en",
            });
          }
        }
      } else {
        setPassed(false);
        setRemaining(diff);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [location, language]);

  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        notifiedRef.current = false;
      }
    };
    const interval = setInterval(checkMidnight, 60_000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (language === "ar") {
      return `${toArabicNumerals(pad(hrs))} : ${toArabicNumerals(pad(mins))} : ${toArabicNumerals(pad(secs))}`;
    }
    return `${pad(hrs)} : ${pad(mins)} : ${pad(secs)}`;
  };

  return (
    <Card className="border-amber-300/40 dark:border-amber-600/30 overflow-hidden">
      <CardContent className="p-4 text-center space-y-2">
        {passed ? (
          <>
            <p className="text-2xl">🎉</p>
            <p className="text-lg font-bold text-foreground">{t("iftar_time")}</p>
            <p className="text-xs text-muted-foreground">{t("iftar_dua_text")}</p>
          </>
        ) : remaining !== null ? (
          <>
            <p className="text-xs text-muted-foreground">{t("time_until_iftar")}</p>
            <p className="text-2xl font-bold tracking-wider text-foreground font-sans" dir="ltr">
              {formatTime(remaining)}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t("calculating_time")}</p>
        )}
      </CardContent>
    </Card>
  );
}
