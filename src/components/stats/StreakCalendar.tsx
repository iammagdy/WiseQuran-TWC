import { motion } from "framer-motion";
import { toArabicNumerals } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface StreakCalendarProps {
  data: { date: string; ayahCount: number }[];
}

export function StreakCalendar({ data }: StreakCalendarProps) {
  const { t, language, isRTL } = useLanguage();
  const maxVal = Math.max(...data.map((d) => d.ayahCount), 1);
  const weeks: { date: string; ayahCount: number }[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-2xl bg-card p-4 shadow-soft border border-border/50"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <h3 className="text-sm font-bold mb-3">{t("this_month")}</h3>
      <div className="space-y-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-1.5 justify-center">
            {week.map((day, di) => {
              const intensity = day.ayahCount > 0 ? 0.2 + (day.ayahCount / maxVal) * 0.8 : 0;
              const d = new Date(day.date + "T00:00:00");
              const dateNum = d.getDate();
              const label = language === "ar" ? toArabicNumerals(dateNum) : String(dateNum);
              const countLabel = language === "ar" ? `${toArabicNumerals(day.ayahCount)} آية` : `${day.ayahCount} ${t("ayah")}`;
              return (
                <div
                  key={di}
                  title={`${label}: ${countLabel}`}
                  className="h-9 w-9 rounded-lg flex items-center justify-center text-[0.625rem] font-medium transition-colors"
                  style={{
                    backgroundColor:
                      intensity > 0
                        ? `hsl(var(--primary) / ${intensity})`
                        : "hsl(var(--muted) / 0.5)",
                    color:
                      intensity > 0.5
                        ? "hsl(var(--primary-foreground))"
                        : "hsl(var(--muted-foreground))",
                  }}
                >
                  {label}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-center gap-2 mt-3 text-[0.625rem] text-muted-foreground">
        <span>{language === "ar" ? "أقل" : "Less"}</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div
            key={i}
            className="h-3 w-3 rounded"
            style={{
              backgroundColor:
                v === 0 ? "hsl(var(--muted) / 0.5)" : `hsl(var(--primary) / ${v})`,
            }}
          />
        ))}
        <span>{language === "ar" ? "أكثر" : "More"}</span>
      </div>
    </motion.div>
  );
}
